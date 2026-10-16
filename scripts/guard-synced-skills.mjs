#!/usr/bin/env node
// A skill with `source` in its skill.json is authored in another repo, and the next sync
// overwrites everything here except skill.json. This guard finds pull requests that edit
// such a skill in this repo and says where to edit instead:
//
//   node scripts/guard-synced-skills.mjs [--base <git ref>]   (default: origin/main)
//
// Exit 1 when a synced skill was edited outside skill.json, else 0. The sync workflow's own
// PRs are exempt, recognised by PR_AUTHOR and PR_TITLE (set by the workflow). When
// GUARD_COMMENT_FILE is set, the PR comment body is written there.
//
// Which skills are synced is read from the base ref's skill.json, never from the working
// tree: a PR that removes `source` from skill.json must not slip past. (A skill that first
// appears in the PR isn't guarded, since that is how a synced skill is added.) The repo is
// the git checkout of the current directory, so CI can run a base-ref copy of this script
// against the PR's checkout.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = gitRoot(process.cwd()) ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function gitRoot(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

// How the sync-skill workflow signs its pull requests.
export const SYNC_AUTHOR = 'github-actions[bot]';
export const SYNC_TITLE_PREFIX = 'chore(skills): sync';
export const COMMENT_MARKER = '<!-- guard-synced-skills -->';

export function isSyncPr({ author, title } = {}) {
  return author === SYNC_AUTHOR && typeof title === 'string' && title.startsWith(SYNC_TITLE_PREFIX);
}

// Pure: the synced skills that a list of changed files edits outside skill.json.
// `skills` is a list of { name, source } (source only on synced skills, as in skill.json);
// `pr` is { author, title }. Returns [{ name, source, files }], in the order first seen.
export function guardedSkills(changedFiles, skills, pr = {}) {
  if (isSyncPr(pr)) return [];
  const synced = new Map(skills.filter((s) => s?.source).map((s) => [s.name, s.source]));
  const hits = new Map();
  for (const file of changedFiles) {
    const match = /^src\/skills\/([^/]+)\/(.+)$/.exec(file);
    if (!match || match[2] === 'skill.json' || !synced.has(match[1])) continue;
    if (!hits.has(match[1])) hits.set(match[1], { name: match[1], source: synced.get(match[1]), files: [] });
    hits.get(match[1]).files.push(match[2]);
  }
  return [...hits.values()];
}

export function renderComment(guarded) {
  const lines = [COMMENT_MARKER, '### This PR edits a synced skill', ''];
  for (const { name, source, files } of guarded) {
    lines.push(
      `- \`src/skills/${name}/\` is synced from [\`${source.repo}\`](https://github.com/${source.repo}) (\`${source.path}\` at \`${source.ref}\`).`,
      `  Edit it there; the next sync overwrites this copy. Only \`skill.json\` is maintained here. Changed: ${files.map((f) => `\`${f}\``).join(', ')}.`,
    );
  }
  lines.push('', 'Once the change is merged in the source repo, run the **Sync skill from source repo** workflow to bring it here.', '');
  return lines.join('\n');
}

// The skill folders a list of changed files touches.
export function skillNames(changedFiles) {
  return [...new Set(changedFiles.map((f) => /^src\/skills\/([^/]+)\//.exec(f)?.[1]).filter(Boolean))];
}

// Pure given `readAtBase(rel)`, which returns a file's text on the base ref or null: the
// { name, source } list for the named skills, as the base ref knows them. The working tree
// is never consulted, so a PR can't drop `source` to get past the guard.
export function skillsAtBase(names, readAtBase) {
  return names.map((name) => {
    try {
      const text = readAtBase(`src/skills/${name}/skill.json`);
      const source = text === null ? undefined : JSON.parse(text).source;
      return source === undefined ? { name } : { name, source };
    } catch {
      return { name };
    }
  });
}

function changedFiles(base) {
  return execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
}

function readAtRef(ref) {
  return (rel) => {
    try {
      return execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return null;
    }
  };
}

function main() {
  const args = process.argv.slice(2);
  const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'origin/main';
  const pr = { author: process.env.PR_AUTHOR, title: process.env.PR_TITLE };
  if (isSyncPr(pr)) {
    console.log('Pull request from the sync workflow: synced skills may change.');
    return;
  }
  const files = changedFiles(base);
  const guarded = guardedSkills(files, skillsAtBase(skillNames(files), readAtRef(base)), pr);
  if (guarded.length === 0) {
    console.log(`No synced skill edited outside skill.json (compared with ${base}).`);
    return;
  }
  const body = renderComment(guarded);
  if (process.env.GUARD_COMMENT_FILE) fs.writeFileSync(process.env.GUARD_COMMENT_FILE, body);
  console.error(body.split('\n').filter((l) => l && l !== COMMENT_MARKER).join('\n'));
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
