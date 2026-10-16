import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { nextSteps, parseArgs, scaffoldSkill } from '../scripts/new-skill.mjs';
import { loadSkills, readJson, validateSkill } from '../scripts/lib/skills.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(REPO, 'scripts/new-skill.mjs');

// A repo root with only what a scaffolded skill needs: the shared fragments it includes.
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'brevo-new-skill-'));
  fs.mkdirSync(path.join(root, 'shared'));
  fs.writeFileSync(path.join(root, 'shared/connection.md'), '## Connection rules\n');
  fs.writeFileSync(path.join(root, 'shared/output-rules.md'), '## Output rules\n');
  return root;
}

const OPTIONS = { name: 'list-cleanup', owner: 'team-x', summary: 'Remove stale contacts from a list.' };

test('scaffoldSkill writes a draft skill and its evals that pass validateSkill', () => {
  const root = fixture();
  const { name, files } = scaffoldSkill(root, OPTIONS);
  assert.equal(name, 'list-cleanup');
  assert.deepEqual(files, ['src/skills/list-cleanup/skill.json', 'src/skills/list-cleanup/SKILL.md', 'evals/list-cleanup/cases.json']);

  const skills = loadSkills(root);
  assert.equal(skills.length, 1);
  assert.deepEqual(validateSkill(skills[0], root), []);

  const meta = readJson(path.join(root, 'src/skills/list-cleanup/skill.json'));
  assert.equal(meta.name, 'list-cleanup');
  assert.equal(meta.title, 'List cleanup');
  assert.equal(meta.status, 'draft');
  assert.equal(meta.version, '1.0.0');
  assert.equal(meta.owner, 'team-x');
  assert.equal(meta.summary, OPTIONS.summary);
  assert.deepEqual(meta.platforms, ['claude', 'openai', 'gemini']);
  assert.deepEqual(meta.requires_tools, []);
  assert.equal(meta.requires, undefined);

  const { frontmatter, body } = skills[0];
  assert.equal(frontmatter.name, 'list-cleanup');
  assert.match(frontmatter.description, /^Remove stale contacts from a list\. Use when /);
  for (const section of ['## 1. Collect the inputs', '## 2. Confirm what will happen', '## 3. Do the work', '## 4. Refusals and errors', '## 5. Finish']) {
    assert.ok(body.includes(section), section);
  }
  assert.ok(body.includes('<!-- include: shared/connection.md -->'));
  assert.ok(body.includes('<!-- include: shared/output-rules.md -->'));
  assert.ok(!body.includes('needs a coding agent'), 'no terminal note without --shell');

  const cases = readJson(path.join(root, 'evals/list-cleanup/cases.json'));
  assert.equal(cases.skill, 'list-cleanup');
  assert.equal(cases.cases.length, 1);
  assert.equal(cases.cases[0].fixture, null);
  assert.ok(cases.cases[0].expect.length > 0);
});

test('scaffoldSkill writes only inside src/skills/<name>/ and evals/<name>/', () => {
  const root = fixture();
  scaffoldSkill(root, OPTIONS);
  assert.deepEqual(fs.readdirSync(root).sort(), ['evals', 'shared', 'src']);
  assert.deepEqual(fs.readdirSync(path.join(root, 'src/skills')), ['list-cleanup']);
  assert.deepEqual(fs.readdirSync(path.join(root, 'evals')), ['list-cleanup']);
  assert.deepEqual(fs.readdirSync(path.join(root, 'shared')).sort(), ['connection.md', 'output-rules.md']);
});

test('scaffoldSkill refuses a name that already exists, in src/skills or in evals', () => {
  const root = fixture();
  scaffoldSkill(root, OPTIONS);
  const before = fs.readFileSync(path.join(root, 'src/skills/list-cleanup/SKILL.md'), 'utf8');
  assert.throws(() => scaffoldSkill(root, { ...OPTIONS, summary: 'Other.' }), /src\/skills\/list-cleanup already exists/);
  assert.equal(fs.readFileSync(path.join(root, 'src/skills/list-cleanup/SKILL.md'), 'utf8'), before, 'the existing skill is untouched');

  fs.mkdirSync(path.join(root, 'evals/orphan'));
  assert.throws(() => scaffoldSkill(root, { ...OPTIONS, name: 'orphan' }), /evals\/orphan already exists/);
  assert.ok(!fs.existsSync(path.join(root, 'src/skills/orphan')));
});

test('scaffoldSkill refuses an invalid name with the validate rules and writes nothing', () => {
  const root = fixture();
  const bad = [
    ['Bad_Name', /lower-case words joined by hyphens/],
    ['-leading', /lower-case words joined by hyphens/],
    ['a'.repeat(65), /max 64 characters/],
    ['claude-helper', /reserved word "claude"/],
    ['my-openai-skill', /reserved word "openai"/],
  ];
  for (const [name, re] of bad) {
    assert.throws(() => scaffoldSkill(root, { ...OPTIONS, name }), re, name);
  }
  assert.ok(!fs.existsSync(path.join(root, 'src')), 'nothing written');
  assert.ok(!fs.existsSync(path.join(root, 'evals')), 'nothing written');
});

test('scaffoldSkill refuses missing owner or summary and unknown platforms', () => {
  const root = fixture();
  assert.throws(() => scaffoldSkill(root, { ...OPTIONS, owner: ' ' }), /owner is required/);
  assert.throws(() => scaffoldSkill(root, { ...OPTIONS, summary: '' }), /summary is required/);
  assert.throws(() => scaffoldSkill(root, { ...OPTIONS, platforms: [] }), /platforms must list at least one/);
  assert.throws(() => scaffoldSkill(root, { ...OPTIONS, platforms: ['slack'] }), /unknown platform "slack"/);
  assert.throws(() => scaffoldSkill(root, { ...OPTIONS, tools: ['bad-tool'] }), /tool name "bad-tool"/);
  assert.ok(!fs.existsSync(path.join(root, 'src')), 'nothing written');
});

test('--shell and --tools land in skill.json, and the tools in SKILL.md and the eval case', () => {
  const root = fixture();
  const options = parseArgs(['sync-leads', '--owner', 'team-y', '--summary', 'Sync leads.', '--tools', 'crm_list_leads, crm_create_lead', '--shell', '--platforms', 'claude']);
  assert.deepEqual(options, { name: 'sync-leads', owner: 'team-y', summary: 'Sync leads.', platforms: ['claude'], tools: ['crm_list_leads', 'crm_create_lead'], shell: true });
  scaffoldSkill(root, options);

  const meta = readJson(path.join(root, 'src/skills/sync-leads/skill.json'));
  assert.deepEqual(meta.requires, ['shell']);
  assert.deepEqual(meta.requires_tools, ['crm_list_leads', 'crm_create_lead']);
  assert.deepEqual(meta.platforms, ['claude']);
  const skill = loadSkills(root)[0];
  assert.deepEqual(validateSkill(skill, root), []);
  assert.ok(skill.body.includes('| … | `crm_list_leads` |'));
  assert.ok(skill.body.includes('| … | `crm_create_lead` |'));
  assert.ok(skill.body.includes('needs a coding agent'));
  const cases = readJson(path.join(root, 'evals/sync-leads/cases.json'));
  assert.ok(cases.cases[0].expect.some((line) => line.includes('crm_list_leads')));
});

test('parseArgs needs a name, an owner and a summary, and rejects unknown options', () => {
  assert.throws(() => parseArgs([]), /usage/);
  assert.throws(() => parseArgs(['x', '--summary', 's']), /--owner is required/);
  assert.throws(() => parseArgs(['x', '--owner', 't']), /--summary is required/);
  assert.throws(() => parseArgs(['x', '--owner', 't', '--summary']), /--summary needs a value/);
  assert.throws(() => parseArgs(['x', '--owner', 't', '--summary', 's', '--bogus']), /unknown option --bogus/);
  assert.throws(() => parseArgs(['x', 'y', '--owner', 't', '--summary', 's']), /unexpected argument y/);
  const parsed = parseArgs(['x', '--owner', 't', '--summary', 's']);
  assert.deepEqual(parsed, { name: 'x', owner: 't', summary: 's', platforms: ['claude', 'openai', 'gemini'], tools: [], shell: false });
});

test('nextSteps names the files to write, the build and the PR', () => {
  const text = nextSteps('list-cleanup');
  assert.match(text, /src\/skills\/list-cleanup\/SKILL\.md/);
  assert.match(text, /evals\/list-cleanup\/cases\.json/);
  assert.match(text, /yarn build && yarn verify/);
  assert.match(text, /PR/);
});

test('the CLI exits 1 on a name that exists in this repo and writes nothing', () => {
  const existing = fs.readdirSync(path.join(REPO, 'src/skills'))[0];
  const before = fs.readdirSync(path.join(REPO, 'src/skills'));
  let failed;
  try {
    execFileSync('node', [SCRIPT, existing, '--owner', 'team', '--summary', 'Again.'], { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    failed = err;
  }
  assert.equal(failed?.status, 1);
  assert.match(failed.stderr, new RegExp(`src/skills/${existing} already exists`));
  assert.deepEqual(fs.readdirSync(path.join(REPO, 'src/skills')), before);
  const help = execFileSync('node', [SCRIPT, '--help'], { cwd: REPO, encoding: 'utf8' });
  assert.match(help, /usage: new-skill\.mjs <name> --owner/);
});
