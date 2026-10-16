#!/usr/bin/env node
// Every change to a skill's content needs a new version in its skill.json, or installed
// copies never refresh. Compares catalog.json with the one on the base branch:
//
//   node scripts/check-versions.mjs [--base <git ref>]   (default: origin/main)
//
// A skill whose source_sha256 changed while its version didn't fails the check. The router's
// generated routes table isn't part of source_sha256, so adding a skill doesn't force a
// router bump.

import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson } from './lib/skills.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Pure: skills whose content changed without a version change.
export function unbumped(baseCatalog, currentCatalog) {
  const base = new Map((baseCatalog?.skills ?? []).map((s) => [s.name, s]));
  return currentCatalog.skills.flatMap((s) => {
    const before = base.get(s.name);
    if (!before?.source_sha256) return [];
    return before.source_sha256 !== s.source_sha256 && before.version === s.version ? [s.name] : [];
  });
}

function main() {
  const args = process.argv.slice(2);
  const ref = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'origin/main';
  let baseCatalog;
  try {
    baseCatalog = JSON.parse(execFileSync('git', ['show', `${ref}:catalog.json`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    console.log(`No catalog.json on ${ref}: nothing to compare.`);
    return;
  }
  const names = unbumped(baseCatalog, readJson(path.join(ROOT, 'catalog.json')));
  if (names.length) {
    console.error(`Content changed without a version bump: ${names.join(', ')}. Bump "version" in each skill.json and add a CHANGELOG line.`);
    process.exit(1);
  }
  console.log(`Every changed skill has a new version (compared with ${ref}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
