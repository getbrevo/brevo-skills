#!/usr/bin/env node
// This repo is public. Fails on anything that must not leave Brevo: keys and links to
// internal workspaces (generic rules below), plus internal hosts and service names.
//
// The internal names are NOT listed here: writing them in a public repo would leak the very
// thing this check protects. They come from the PUBLIC_SAFETY_PATTERNS environment variable
// (a repository variable in CI): one JavaScript regular expression per line, matched
// case-insensitively. Ask a maintainer for the list to run it locally.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const GENERIC_RULES = [
  { id: 'brevo-api-key', re: /xkeysib-[0-9a-f]{32,}/i, why: 'Brevo API key' },
  { id: 'private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, why: 'private key' },
  { id: 'slack-link', re: /[a-z0-9-]+\.slack\.com\/archives\//i, why: 'link into a Slack workspace' },
  { id: 'notion-link', re: /app\.notion\.com\/|notion\.so\//i, why: 'link into a Notion workspace' },
];

// Rules from PUBLIC_SAFETY_PATTERNS, one regular expression per line.
export function rulesFromEnv(env = process.env) {
  return (env.PUBLIC_SAFETY_PATTERNS ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((pattern, i) => ({ id: `internal-pattern-${i + 1}`, re: new RegExp(pattern, 'i'), why: 'internal name (PUBLIC_SAFETY_PATTERNS)' }));
}

// Files that legitimately contain the patterns (the rules themselves, and their tests).
const ALLOW = new Set(['scripts/check-public.mjs', 'tests/check-public.test.mjs']);

export function scanText(text, rules = GENERIC_RULES) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    for (const rule of rules) if (rule.re.test(line)) hits.push({ line: i + 1, rule: rule.id, why: rule.why });
  });
  return hits;
}

function trackedFiles() {
  try {
    const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch {
    throw new Error('check-public needs a git checkout to know which files are tracked');
  }
}

function main() {
  const extra = rulesFromEnv();
  const rules = [...GENERIC_RULES, ...extra];
  if (extra.length === 0) {
    const message = 'PUBLIC_SAFETY_PATTERNS is not set: only the generic rules ran (keys, Slack and Notion links).';
    if (process.env.CI) console.log(`::warning::${message}`);
    else console.warn(message);
  }
  const findings = [];
  for (const rel of trackedFiles()) {
    if (ALLOW.has(rel)) continue;
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    const buf = fs.readFileSync(file);
    if (buf.includes(0)) continue; // binary
    for (const hit of scanText(buf.toString('utf8'), rules)) findings.push(`${rel}:${hit.line}  ${hit.rule} (${hit.why})`);
  }
  if (findings.length) {
    console.error(`Public-safety check failed (${findings.length}):`);
    for (const f of findings) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`Public-safety check passed (${rules.length} rules).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
