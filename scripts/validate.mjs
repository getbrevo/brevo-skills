#!/usr/bin/env node
// Validates brevo-skills.json and every skill under src/skills/: names, frontmatter limits,
// status, platforms, versions, includes and relative links.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, loadSkills, validateConfig, validateSkill, validateSkillSet } from './lib/skills.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const errors = [...validateConfig(loadConfig(ROOT), ROOT)];
const skills = loadSkills(ROOT);
for (const skill of skills) errors.push(...validateSkill(skill, ROOT));
errors.push(...validateSkillSet(skills));

if (errors.length) {
  console.error(`${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`Valid: brevo-skills.json and ${skills.length} skill(s).`);
