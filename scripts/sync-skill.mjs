#!/usr/bin/env node
// Syncs a skill that is authored in another public repo (its `source` in skill.json) into
// src/skills/<name>/. The owning team keeps editing the skill where it lives; this repo
// only packages it. Copies SKILL.md and, when present, references/ and assets/.
//
//   node scripts/sync-skill.mjs <name> [--ref <branch|tag|sha>] [--from <local checkout>]
//
// Without --from, it shallow-clones https://github.com/<source.repo> at the ref.
// It then records the resolved commit in skill.json `source.ref`.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listFiles, parseFrontmatter, readJson, validateSource } from './lib/skills.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SYNCED = ['SKILL.md', 'references', 'assets'];

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function cloneAt(repo, ref) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brevo-skill-sync-'));
  git(dir, 'init', '-q');
  git(dir, 'remote', 'add', 'origin', `https://github.com/${repo}.git`);
  git(dir, 'fetch', '-q', '--depth', '1', 'origin', '--', ref);
  git(dir, 'checkout', '-q', 'FETCH_HEAD');
  return dir;
}

// Copies the synced files of one skill from `sourceDir` into `targetDir`. Returns the copied paths.
export function copySkill(sourceDir, targetDir, name) {
  const skillMd = path.join(sourceDir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) throw new Error(`no SKILL.md in ${sourceDir}`);
  if (fs.lstatSync(skillMd).isSymbolicLink()) throw new Error('symlinks aren\'t allowed in skills: SKILL.md');
  for (const entry of SYNCED.slice(1)) {
    const dir = path.join(sourceDir, entry);
    if (!fs.existsSync(dir)) continue;
    if (fs.lstatSync(dir).isSymbolicLink()) throw new Error(`symlinks aren't allowed in skills: ${entry}`);
    listFiles(dir); // throws on any symlink inside
  }
  const frontmatterName = parseFrontmatter(fs.readFileSync(skillMd, 'utf8')).data.name;
  if (frontmatterName !== name) throw new Error(`source SKILL.md is named "${frontmatterName}", expected "${name}"`);

  const copied = [];
  for (const entry of SYNCED) {
    fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true });
    const from = path.join(sourceDir, entry);
    if (!fs.existsSync(from)) continue;
    fs.cpSync(from, path.join(targetDir, entry), { recursive: true });
    copied.push(entry);
  }
  return copied;
}

function main() {
  const args = process.argv.slice(2);
  const options = {};
  let name;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--ref' || args[i] === '--from') options[args[i]] = args[++i];
    else name ??= args[i];
  }
  const option = (flag) => options[flag];
  if (!name) {
    console.error('usage: sync-skill.mjs <name> [--ref <branch|tag|sha>] [--from <local checkout>]');
    process.exit(1);
  }

  const skillJsonPath = path.join(ROOT, 'src', 'skills', name, 'skill.json');
  if (!fs.existsSync(skillJsonPath)) throw new Error(`src/skills/${name}/skill.json doesn't exist: create it with a "source" first`);
  const meta = readJson(skillJsonPath);
  const ref = option('--ref') ?? meta.source?.ref ?? 'main';
  const problems = validateSource({ ...meta.source, ref }, `src/skills/${name}`);
  if (problems.length) throw new Error(problems.join('\n'));

  const checkout = option('--from') ?? cloneAt(meta.source.repo, ref);
  const sha = git(checkout, 'rev-parse', 'HEAD');
  const copied = copySkill(path.join(checkout, meta.source.path), path.dirname(skillJsonPath), name);

  meta.source = { ...meta.source, ref: sha };
  fs.writeFileSync(skillJsonPath, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`Synced ${name} from ${meta.source.repo}@${sha.slice(0, 12)} (${copied.join(', ')}).`);
  console.log('Next: yarn build && yarn verify, then review the diff.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
