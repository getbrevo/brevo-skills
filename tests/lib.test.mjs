import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseFrontmatter,
  renderFrontmatter,
  resolveIncludes,
  publishedSkills,
  validateSkill,
  validateConfig,
  listFiles,
  validateSkillSet,
} from '../scripts/lib/skills.mjs';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'brevo-skills-'));
}

test('parseFrontmatter reads top-level keys and strips quotes', () => {
  const { data, body } = parseFrontmatter('---\nname: a-skill\ndescription: "Does: things"\n---\n# Title\n');
  assert.deepEqual(data, { name: 'a-skill', description: 'Does: things' });
  assert.equal(body, '# Title\n');
});

test('parseFrontmatter without frontmatter returns the text as body', () => {
  assert.deepEqual(parseFrontmatter('# Only body'), { data: {}, body: '# Only body' });
});

test('renderFrontmatter round-trips through parseFrontmatter, including colons', () => {
  const rendered = renderFrontmatter({ name: 'x', description: 'Use when: importing', metadata: { version: '1.0.0' } });
  assert.match(rendered, /^---\nname: x\ndescription: "Use when: importing"\nmetadata:\n {2}version: 1.0.0\n---\n$/);
  assert.equal(parseFrontmatter(`${rendered}body`).data.description, 'Use when: importing');
});

test('resolveIncludes inlines nested files and rejects missing files and cycles', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'shared'));
  fs.writeFileSync(path.join(root, 'shared/a.md'), 'A\n<!-- include: shared/b.md -->\n');
  fs.writeFileSync(path.join(root, 'shared/b.md'), 'B\n');
  assert.equal(resolveIncludes('x\n<!-- include: shared/a.md -->\ny', root), 'x\nA\nB\ny');
  assert.throws(() => resolveIncludes('<!-- include: shared/none.md -->', root), /include not found/);
  fs.writeFileSync(path.join(root, 'shared/c.md'), '<!-- include: shared/c.md -->');
  assert.throws(() => resolveIncludes('<!-- include: shared/c.md -->', root), /include cycle/);
});

test('resolveIncludes refuses anything but a file directly in shared/, including symlinks out', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'shared'));
  fs.writeFileSync(path.join(root, 'secret.txt'), 'token');
  for (const rel of ['../secret.txt', 'secret.txt', 'shared/../secret.txt', '/etc/hosts', 'shared/sub/a.md']) {
    assert.throws(() => resolveIncludes(`<!-- include: ${rel} -->`, root), /must be a shared/, rel);
  }
  fs.symlinkSync(path.join(root, 'secret.txt'), path.join(root, 'shared/link.md'));
  assert.throws(() => resolveIncludes('<!-- include: shared/link.md -->', root), /outside shared/);
});

test('listFiles refuses symlinks inside a skill', () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, 'references'));
  fs.symlinkSync('/etc/hosts', path.join(dir, 'references/hosts.md'));
  assert.throws(() => listFiles(dir), /symlinks aren't allowed in skills: references\/hosts.md/);
});

test('publishedSkills ships only beta and public skills to a public audience', () => {
  const skills = ['draft', 'internal', 'beta', 'public'].map((status) => ({ meta: { status } }));
  assert.deepEqual(publishedSkills(skills, 'public').map((s) => s.meta.status), ['beta', 'public']);
  assert.deepEqual(publishedSkills(skills, 'internal').map((s) => s.meta.status), ['internal', 'beta', 'public']);
  assert.throws(() => publishedSkills(skills, 'everyone'), /unknown audience/);
});

test('validateSkill reports every broken rule', () => {
  const root = tmp();
  const dir = path.join(root, 'Bad_Skill');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '[x](missing.md)');
  const errors = validateSkill(
    {
      folder: 'Bad_Skill',
      dir,
      files: [],
      frontmatter: { name: 'other', description: 'd'.repeat(1025) },
      meta: { name: 'other', version: '1', status: 'live', platforms: ['claude', 'mars'], requires: ['gpu'] },
    },
    root,
  );
  const text = errors.join('\n');
  for (const expected of [
    'skill.json name',
    'SKILL.md name',
    'lower-case words',
    '1025 characters',
    'not semver',
    'status must be',
    'owner is required',
    'summary is required',
    'unknown platform "mars"',
    'requires_tools must be an array',
    'unknown requirement "gpu"',
    'broken link missing.md',
    'should say when to use the skill',
  ]) {
    assert.ok(text.includes(expected), `expected "${expected}" in:\n${text}`);
  }
});

test('validateConfig needs a semver version, a known audience and https endpoints', () => {
  const errors = validateConfig({ version: 'x', audience: 'all', plugin: {}, mcp: { endpoints: { claude: 'http://a' } } });
  assert.equal(errors.length, 6);
});

test('validateSkill refuses reserved words in names and an over-long SKILL.md', () => {
  const root = tmp();
  const dir = path.join(root, 'claude-helper');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'SKILL.md'), 'line\n'.repeat(501));
  const errors = validateSkill(
    {
      folder: 'claude-helper',
      dir,
      files: [],
      frontmatter: { name: 'claude-helper', description: 'Does things. Use when asked.' },
      meta: { name: 'claude-helper', version: '1.0.0', status: 'draft', owner: 'x', summary: 's', platforms: ['claude'], requires_tools: [] },
    },
    root,
  ).join('\n');
  assert.match(errors, /reserved word "claude"/);
  assert.match(errors, /SKILL.md is 502 lines \(max 500\)/);
  assert.doesNotMatch(errors, /when to use/);
});

test('router rules: a known role, the routes marker only in the router, and one router at most', () => {
  const root = tmp();
  const base = (folder, meta, body) => ({
    folder,
    dir: path.join(root, folder),
    files: [],
    body,
    frontmatter: { name: folder, description: 'Does it. Use when asked.' },
    meta: { name: folder, version: '1.0.0', status: 'public', owner: 'x', summary: 's', platforms: ['claude'], requires_tools: [], ...meta },
  });
  for (const folder of ['router', 'other', 'odd']) {
    fs.mkdirSync(path.join(root, folder));
    fs.writeFileSync(path.join(root, folder, 'SKILL.md'), 'x');
  }
  assert.match(validateSkill(base('router', { role: 'router' }, 'no table'), root).join('\n'), /needs <!-- brevo:routes -->/);
  assert.deepEqual(validateSkill(base('router', { role: 'router' }, '<!-- brevo:routes -->'), root), []);
  assert.match(validateSkill(base('other', {}, '<!-- brevo:routes -->'), root).join('\n'), /only the router/);
  assert.match(validateSkill(base('odd', { role: 'hub' }, ''), root).join('\n'), /role must be one of router/);
  assert.deepEqual(validateSkillSet([{ folder: 'a', meta: { role: 'router' } }, { folder: 'b', meta: {} }]), []);
  assert.match(validateSkillSet([{ folder: 'a', meta: { role: 'router' } }, { folder: 'b', meta: { role: 'router' } }])[0], /only one skill can be the router; found a, b/);
});

test('skills are text only: scripts, binaries and executable files are refused', () => {
  const root = tmp();
  const dir = path.join(root, 'tool');
  fs.mkdirSync(path.join(dir, 'references'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), 'x');
  fs.writeFileSync(path.join(dir, 'run.py'), 'print(1)');
  fs.writeFileSync(path.join(dir, 'references/notes.md'), 'n');
  fs.chmodSync(path.join(dir, 'references/notes.md'), 0o755);
  fs.writeFileSync(path.join(dir, 'logo.svg'), '<svg/>');
  const errors = validateSkill(
    {
      folder: 'tool',
      dir,
      files: ['logo.svg', 'references/notes.md', 'run.py'],
      body: '',
      frontmatter: { name: 'tool', description: 'Does it. Use when asked.' },
      meta: { name: 'tool', version: '1.0.0', status: 'public', owner: 'x', summary: 's', platforms: ['claude'], requires_tools: [], default: 'yes', min_cli_version: 'latest' },
    },
    root,
  ).join('\n');
  assert.match(errors, /run\.py: skills are text only/);
  assert.match(errors, /notes\.md: remove the executable bit/);
  assert.doesNotMatch(errors, /logo\.svg/);
  assert.match(errors, /default must be true or false/);
  assert.match(errors, /min_cli_version "latest" is not semver/);
});

test('tool_notes must name a required tool and stay short', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'n'));
  fs.writeFileSync(path.join(root, 'n/SKILL.md'), 'x');
  const errors = validateSkill(
    {
      folder: 'n',
      dir: path.join(root, 'n'),
      files: [],
      body: '',
      frontmatter: { name: 'n', description: 'Does it. Use when asked.' },
      meta: { name: 'n', version: '1.0.0', status: 'public', owner: 'x', summary: 's', platforms: ['claude'], requires_tools: ['a'], tool_notes: { a: 'x'.repeat(301), b: 'ok' } },
    },
    root,
  ).join('\n');
  assert.match(errors, /tool_notes\.a must be 1-300 characters/);
  assert.match(errors, /tool_notes names "b", which isn't in requires_tools/);
});
