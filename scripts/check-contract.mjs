#!/usr/bin/env node
// Contract check: every published skill lists the MCP tools it needs (skill.json
// `requires_tools`). For each platform the skill targets, this asks that platform's
// endpoint for its tool list and fails if a required tool is missing. It is what stops a
// skill shipping to Gemini before its tools are tagged for Gemini on the server.
//
//   BREVO_MCP_TOKEN_CLAUDE=… BREVO_MCP_TOKEN_OPENAI=… BREVO_MCP_TOKEN_GEMINI=… \
//     node scripts/check-contract.mjs [--strict]
//
// A platform without a token is skipped with a warning; --strict turns skips into failures.
// --tools <platform>=<file.json> reads a saved tool list (an array of names) instead.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfig, loadSkills, publishedSkills } from './lib/skills.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROTOCOL_VERSION = '2025-06-18';

// Pure: which required tools are missing, per skill and platform.
export function findGaps(skills, toolsByPlatform) {
  const gaps = [];
  for (const skill of skills) {
    for (const platform of skill.meta.platforms) {
      const available = toolsByPlatform[platform];
      if (!available) continue;
      const missing = skill.meta.requires_tools.filter((t) => !available.includes(t));
      if (missing.length) gaps.push({ skill: skill.meta.name, platform, missing });
    }
  }
  return gaps;
}

async function rpc(url, token, sessionId, message) {
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    authorization: `Bearer ${token}`,
  };
  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
    headers['mcp-protocol-version'] = PROTOCOL_VERSION;
  }
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(message) });
  if (!res.ok && res.status !== 202) throw new Error(`${message.method}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const sid = res.headers.get('mcp-session-id') ?? sessionId;
  if (message.id === undefined) return { sid };
  const type = res.headers.get('content-type') ?? '';
  let reply;
  if (type.includes('text/event-stream')) {
    const events = (await res.text()).split('\n').filter((l) => l.startsWith('data:')).map((l) => JSON.parse(l.slice(5)));
    reply = events.find((e) => e.id === message.id);
  } else {
    reply = await res.json();
  }
  if (!reply) throw new Error(`${message.method}: no response`);
  if (reply.error) throw new Error(`${message.method}: ${reply.error.message}`);
  return { sid, result: reply.result };
}

export async function listTools(url, token) {
  let id = 1;
  let { sid } = await rpc(url, token, null, {
    jsonrpc: '2.0',
    id: id++,
    method: 'initialize',
    params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'brevo-skills-contract-check', version: '1' } },
  });
  ({ sid } = await rpc(url, token, sid, { jsonrpc: '2.0', method: 'notifications/initialized' }));
  const names = [];
  let cursor;
  do {
    const { result } = await rpc(url, token, sid, { jsonrpc: '2.0', id: id++, method: 'tools/list', params: cursor ? { cursor } : {} });
    names.push(...result.tools.map((t) => t.name));
    cursor = result.nextCursor;
  } while (cursor);
  return names;
}

async function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const files = Object.fromEntries(
    args.flatMap((a, i) => (a === '--tools' ? [args[i + 1].split('=')] : [])),
  );
  const config = loadConfig(ROOT);
  const skills = publishedSkills(loadSkills(ROOT), config.audience);
  const platforms = [...new Set(skills.flatMap((s) => s.meta.platforms))];

  const toolsByPlatform = {};
  const skipped = [];
  for (const platform of platforms) {
    if (files[platform]) {
      toolsByPlatform[platform] = JSON.parse(fs.readFileSync(files[platform], 'utf8'));
      continue;
    }
    const token = process.env[`BREVO_MCP_TOKEN_${platform.toUpperCase()}`];
    if (!token) {
      skipped.push(platform);
      continue;
    }
    toolsByPlatform[platform] = await listTools(config.mcp.endpoints[platform], token);
    console.log(`${platform}: ${toolsByPlatform[platform].length} tools at ${config.mcp.endpoints[platform]}`);
  }

  const gaps = findGaps(skills, toolsByPlatform);
  for (const p of skipped) console.warn(`skipped ${p}: set BREVO_MCP_TOKEN_${p.toUpperCase()} or pass --tools ${p}=<file>`);
  for (const g of gaps) console.error(`${g.skill} on ${g.platform}: missing ${g.missing.join(', ')}`);
  if (gaps.length || (strict && skipped.length)) process.exit(1);
  console.log(`Contract check passed for ${Object.keys(toolsByPlatform).join(', ') || 'no platforms'}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
