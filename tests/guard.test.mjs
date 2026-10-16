import test from 'node:test';
import assert from 'node:assert/strict';
import { guardedSkills, isSyncPr, renderComment, skillNames, skillsAtBase, COMMENT_MARKER } from '../scripts/guard-synced-skills.mjs';

const SOURCE = { repo: 'getbrevo/brevo-cli', path: 'agent-context', ref: 'abc123' };
const SKILLS = [
  { name: 'brevo', version: '1.0.0' },
  { name: 'brevo-cli', version: '1.0.0', source: SOURCE },
];

test('guardedSkills returns the synced skills edited outside skill.json, with the files', () => {
  const changed = ['src/skills/brevo-cli/SKILL.md', 'src/skills/brevo-cli/references/commands.md', 'src/skills/brevo/SKILL.md', 'README.md'];
  assert.deepEqual(guardedSkills(changed, SKILLS), [{ name: 'brevo-cli', source: SOURCE, files: ['SKILL.md', 'references/commands.md'] }]);
});

test('guardedSkills returns none for a skill.json-only change, a local skill, or an unrelated file', () => {
  assert.deepEqual(guardedSkills(['src/skills/brevo-cli/skill.json'], SKILLS), []);
  assert.deepEqual(guardedSkills(['src/skills/brevo/SKILL.md', 'src/skills/brevo/references/x.md'], SKILLS), []);
  assert.deepEqual(guardedSkills(['skills/brevo-cli/SKILL.md', 'shared/connection.md'], SKILLS), []);
  assert.deepEqual(guardedSkills([], SKILLS), []);
});

test('guardedSkills returns none for a PR opened by the sync workflow, and only for it', () => {
  const changed = ['src/skills/brevo-cli/SKILL.md'];
  assert.deepEqual(guardedSkills(changed, SKILLS, { author: 'github-actions[bot]', title: 'chore(skills): sync brevo-cli (abc123)' }), []);
  assert.equal(guardedSkills(changed, SKILLS, { author: 'someone', title: 'chore(skills): sync brevo-cli (abc123)' }).length, 1);
  assert.equal(guardedSkills(changed, SKILLS, { author: 'github-actions[bot]', title: 'fix: edit the cli skill' }).length, 1);
  assert.equal(isSyncPr({}), false);
});

test('renderComment starts with the marker and names the source repo, path and changed files', () => {
  const body = renderComment(guardedSkills(['src/skills/brevo-cli/SKILL.md'], SKILLS));
  assert.ok(body.startsWith(COMMENT_MARKER));
  assert.match(body, /`src\/skills\/brevo-cli\/` is synced from \[`getbrevo\/brevo-cli`\]\(https:\/\/github\.com\/getbrevo\/brevo-cli\) \(`agent-context` at `abc123`\)/);
  assert.match(body, /Changed: `SKILL\.md`\./);
  assert.match(body, /Sync skill from source repo/);
});

test('skillsAtBase reads source from the base ref only, so a PR cannot drop it from skill.json', () => {
  // The base ref knows brevo-cli as synced; the PR's working tree is never consulted.
  const atBase = { 'src/skills/brevo-cli/skill.json': JSON.stringify({ name: 'brevo-cli', source: SOURCE }), 'src/skills/brevo/skill.json': JSON.stringify({ name: 'brevo' }) };
  const readAtBase = (rel) => atBase[rel] ?? null;
  const changed = ['src/skills/brevo-cli/skill.json', 'src/skills/brevo-cli/SKILL.md', 'src/skills/new-one/SKILL.md', 'src/skills/brevo/SKILL.md'];
  const names = skillNames(changed);
  assert.deepEqual(names, ['brevo-cli', 'new-one', 'brevo']);
  const skills = skillsAtBase(names, readAtBase);
  assert.deepEqual(skills, [{ name: 'brevo-cli', source: SOURCE }, { name: 'new-one' }, { name: 'brevo' }]);
  // Guarded even though the PR's skill.json (not read) could have removed `source`; a skill
  // new in the PR is not guarded, since that is how a synced skill is first added.
  assert.deepEqual(guardedSkills(changed, skills).map((g) => g.name), ['brevo-cli']);
  // Unreadable JSON at the base ref counts as not synced rather than crashing.
  assert.deepEqual(skillsAtBase(['x'], () => '{not json'), [{ name: 'x' }]);
});
