import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { copySkill } from '../scripts/sync-skill.mjs';
import { validateSource, validateConfig } from '../scripts/lib/skills.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'brevo-sync-'));

function sourceSkill(name, extra = {}) {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: d\n---\nbody\n`);
  for (const [rel, content] of Object.entries(extra)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}

test('copySkill copies SKILL.md and references/, replacing what was there, and keeps skill.json', () => {
  const source = sourceSkill('tool', { 'references/a.md': 'A', 'AGENTS.md': 'not synced' });
  const target = tmp();
  fs.writeFileSync(path.join(target, 'skill.json'), '{}');
  fs.mkdirSync(path.join(target, 'references'));
  fs.writeFileSync(path.join(target, 'references/stale.md'), 'old');

  assert.deepEqual(copySkill(source, target, 'tool'), ['SKILL.md', 'references']);
  assert.deepEqual(fs.readdirSync(target).sort(), ['SKILL.md', 'references', 'skill.json']);
  assert.deepEqual(fs.readdirSync(path.join(target, 'references')), ['a.md']);
  assert.equal(fs.readFileSync(path.join(target, 'skill.json'), 'utf8'), '{}');
});

test('copySkill refuses a source whose SKILL.md has another name, or none', () => {
  assert.throws(() => copySkill(sourceSkill('other'), tmp(), 'tool'), /named "other", expected "tool"/);
  assert.throws(() => copySkill(tmp(), tmp(), 'tool'), /no SKILL.md/);
});

test('copySkill refuses a source with symlinks', () => {
  const source = sourceSkill('tool', { 'references/a.md': 'A' });
  fs.symlinkSync('/etc/hosts', path.join(source, 'references/hosts.md'));
  assert.throws(() => copySkill(source, tmp(), 'tool'), /symlinks aren't allowed/);
});

test('validateSource accepts owner/name, a relative path and a ref, and rejects the rest', () => {
  assert.deepEqual(validateSource({ repo: 'getbrevo/brevo-cli', path: 'agent-context', ref: 'main' }, 'x'), []);
  assert.deepEqual(validateSource({ repo: 'a/b', path: '.', ref: 'v1.2.3' }, 'x'), []);
  const errors = validateSource({ repo: 'https://github.com/a/b', path: '../secrets', ref: 'main; rm -rf /' }, 'x');
  assert.equal(errors.length, 3);
  assert.deepEqual(validateSource('a/b', 'x'), ['x: source must be an object { repo, path, ref }']);
});

test('validateSource rejects a ref that could be read as a git option', () => {
  for (const ref of ['--upload-pack=touch /tmp/x', '-f', '-', '.hidden', '/abs']) {
    assert.equal(validateSource({ repo: 'a/b', path: '.', ref }, 'x').length, 1, ref);
  }
  assert.deepEqual(validateSource({ repo: 'a/b', path: '.', ref: 'release/v1.2.3' }, 'x'), []);
});

test('validateConfig checks license and logo when they are set', () => {
  const base = {
    version: '1.0.0',
    audience: 'public',
    plugin: { name: 'brevo' },
    mcp: { endpoints: { claude: 'https://a', openai: 'https://b', gemini: 'https://c' } },
  };
  assert.deepEqual(validateConfig({ ...base, license: 'MIT', logo: 'https://example.com/logo.svg' }, tmp()), []);
  const errors = validateConfig({ ...base, license: 'MIT License', logo: 'assets/none.svg' }, tmp());
  assert.equal(errors.length, 2);
});
