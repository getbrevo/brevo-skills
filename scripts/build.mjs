#!/usr/bin/env node
// Builds every platform's package from src/skills, shared/ and brevo-skills.json.
//
//   node scripts/build.mjs           write generated files (repo root + skills/) and dist/
//   node scripts/build.mjs --check   fail if the committed generated files are out of date
//
// Generated files are committed because marketplaces (Claude Code, Codex, Gemini CLI) read
// the repo directly. Never edit them by hand: edit src/, shared/ or brevo-skills.json.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import adapters from '../adapters/index.mjs';
import { json, GENERATED_NOTE } from '../adapters/util.mjs';
import {
  compatibilityFor,
  loadConfig,
  loadSkills,
  publishedSkills,
  renderFrontmatter,
  resolveIncludes,
  ROUTES_MARKER,
} from './lib/skills.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Renders one skill: SKILL.md with stamped metadata, includes resolved in every Markdown file.
export function renderSkill(skill, root) {
  const body = resolveIncludes(skill.body, root);
  const compatibility = compatibilityFor(skill.meta.requires);
  const frontmatter = renderFrontmatter({
    name: skill.meta.name,
    description: skill.frontmatter.description,
    ...(compatibility ? { compatibility } : {}),
    metadata: { version: skill.meta.version, status: skill.meta.status, author: 'brevo' },
  });
  const output = { 'SKILL.md': `${frontmatter}${body.startsWith('\n') ? body.slice(1) : body}` };
  for (const rel of skill.files) {
    const file = path.join(skill.dir, rel);
    output[rel] = rel.endsWith('.md') ? resolveIncludes(fs.readFileSync(file, 'utf8'), root) : fs.readFileSync(file);
  }
  return { name: skill.meta.name, meta: skill.meta, body, output };
}

// The router's table of the skills it can send a step to: every other skill in `skills`,
// which is what ships alongside it on the target being built.
export function routesTable(skills) {
  const routes = skills.filter((s) => s.meta.role !== 'router');
  if (routes.length === 0) return 'No other Brevo skills ship with this one yet.';
  const needs = (s) => {
    const parts = [];
    if ((s.meta.requires_tools ?? []).length) parts.push('the Brevo connection');
    if ((s.meta.requires ?? []).includes('shell')) parts.push('a terminal');
    return parts.join(', ') || '-';
  };
  const rows = routes.map((s) => `| ${s.meta.summary} | \`${s.name}\`${s.meta.status === 'beta' ? ' (beta)' : ''} | ${needs(s)} |`);
  return ['| Job | Skill | Needs |', '|---|---|---|', ...rows].join('\n');
}

// Writes the routes table into a router, for the skills that ship with it. Other skills pass through.
export function withRoutes(skill, skills) {
  if (skill.meta.role !== 'router') return skill;
  const table = routesTable(skills);
  const fill = (text) => String(text).replace(ROUTES_MARKER, table);
  return { ...skill, body: fill(skill.body), output: { ...skill.output, 'SKILL.md': fill(skill.output['SKILL.md']) } };
}

// A stable hash of a set of files: path and content, in path order.
export function hashFiles(files) {
  const hash = crypto.createHash('sha256');
  for (const rel of Object.keys(files).sort()) {
    hash.update(`${rel}\0`);
    hash.update(Buffer.from(files[rel]));
    hash.update('\0');
  }
  return hash.digest('hex');
}

// Returns { repo, dist }: maps of relative path -> content. Pure apart from reading sources.
export function buildOutputs(root) {
  const config = loadConfig(root);
  const version = config.version;
  const rendered = publishedSkills(loadSkills(root), config.audience).map((s) => renderSkill(s, root));
  // Clients that read skills/ from the repo get every published skill, so the router there lists them all.
  const skills = rendered.map((s) => withRoutes(s, rendered));
  const readShared = (name) => fs.readFileSync(path.join(root, 'shared', name), 'utf8').trim();
  const shared = { connection: readShared('connection.md'), mcpInstructions: readShared('mcp-instructions.md') };

  const repo = {
    'skills/README.md': `# skills/\n\n${GENERATED_NOTE}\n\nThe source of each skill is in \`src/skills/<name>/\`.\n`,
    'catalog.json': json({
      version,
      plugin: config.plugin.name,
      // What an installer needs to register the Brevo MCP server, copied from brevo-skills.json.
      mcp: { serverName: config.mcp.serverName, endpoints: config.mcp.endpoints },
      skills: skills.map((s, i) => ({
        name: s.name,
        version: s.meta.version,
        status: s.meta.status,
        owner: s.meta.owner,
        summary: s.meta.summary,
        ...(s.meta.role ? { role: s.meta.role } : {}),
        // Installed whenever any Brevo skill is installed, and never removed on its own.
        ...(s.meta.default ? { default: true } : {}),
        ...(s.meta.min_cli_version ? { min_cli_version: s.meta.min_cli_version } : {}),
        platforms: s.meta.platforms,
        requires: s.meta.requires ?? [],
        requires_tools: s.meta.requires_tools,
        path: `skills/${s.name}`,
        files: Object.keys(s.output).sort(),
        // Integrity of what an installer downloads: the files under `path`, as shipped.
        sha256: hashFiles(s.output),
        // The skill's own content, before the router's generated table: changing it needs a
        // version bump (scripts/check-versions.mjs).
        source_sha256: hashFiles(rendered[i].output),
      })),
    }),
  };
  for (const skill of skills) {
    for (const [rel, content] of Object.entries(skill.output)) repo[`skills/${skill.name}/${rel}`] = content;
  }

  const dist = {};
  for (const adapter of adapters) {
    // Each target's router lists only the skills that target ships.
    const shipped = rendered.filter(
      (s) =>
        (!adapter.platform || s.meta.platforms.includes(adapter.platform)) &&
        (s.meta.requires ?? []).every((r) => adapter.supports.includes(r)),
    );
    const targetSkills = shipped.map((s) => withRoutes(s, shipped));
    const result = adapter.build({ config, skills: targetSkills, version, shared });
    for (const [kind, target] of [['repo', repo], ['dist', dist]]) {
      for (const [rel, content] of Object.entries(result[kind] ?? {})) {
        if (rel in target) throw new Error(`${adapter.id}: ${kind} path ${rel} is already written by another adapter`);
        target[rel] = content;
      }
    }
  }
  return { repo, dist, skills, version };
}

function listTree(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listTree(full) : [full];
  });
}

const same = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;

export function checkOutputs(root, repo) {
  const problems = [];
  for (const [rel, content] of Object.entries(repo)) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) problems.push(`missing: ${rel}`);
    else if (!same(fs.readFileSync(file), content)) problems.push(`out of date: ${rel}`);
  }
  for (const file of listTree(path.join(root, 'skills'))) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (!(rel in repo)) problems.push(`not generated (remove it, or add it under src/): ${rel}`);
  }
  return problems;
}

function writeAll(base, files) {
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(base, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

function main() {
  const check = process.argv.includes('--check');
  const { repo, dist, skills, version } = buildOutputs(ROOT);

  if (check) {
    const problems = checkOutputs(ROOT, repo);
    if (problems.length) {
      console.error(`Generated files don't match the sources. Run \`yarn build\` and commit the result.\n`);
      for (const p of problems) console.error(`  ${p}`);
      process.exit(1);
    }
    console.log(`Generated files are up to date (${Object.keys(repo).length} files, ${skills.length} skills, v${version}).`);
    return;
  }

  fs.rmSync(path.join(ROOT, 'skills'), { recursive: true, force: true });
  writeAll(ROOT, repo);
  fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true });
  writeAll(path.join(ROOT, 'dist'), dist);
  console.log(`Built v${version}: ${skills.map((s) => `${s.name}@${s.meta.version}`).join(', ') || 'no published skills'}`);
  console.log(`  ${Object.keys(repo).length} repo files, ${Object.keys(dist).length} dist files`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
