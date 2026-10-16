import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts/scan-skills.sh');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'brevo-scan-'));

function git(cwd, ...args) {
  const out = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8' });
  assert.equal(out.status, 0, out.stderr);
  return out.stdout;
}

// A repo with two skills and one shared fragment, committed once.
function repo() {
  const root = tmp();
  for (const name of ['alpha', 'beta']) {
    fs.mkdirSync(path.join(root, 'src/skills', name), { recursive: true });
    fs.writeFileSync(path.join(root, 'src/skills', name, 'SKILL.md'), `---\nname: ${name}\ndescription: Use when testing\n---\nbody\n`);
    fs.writeFileSync(path.join(root, 'src/skills', name, 'skill.json'), JSON.stringify({ name, version: '1.0.0' }));
  }
  fs.mkdirSync(path.join(root, 'shared'));
  fs.writeFileSync(path.join(root, 'shared/connection.md'), 'shared\n');
  git(root, 'init', '-q');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'init');
  return root;
}

// A scanner stand-in: writes a report with the score from STUB_SCORE and exits STUB_EXIT.
function stub() {
  const file = path.join(tmp(), 'skillspector');
  fs.writeFileSync(
    file,
    [
      '#!/usr/bin/env bash',
      'out=""',
      'while [ $# -gt 0 ]; do case "$1" in --output) out="$2"; shift 2 ;; *) shift ;; esac; done',
      'if [ "${STUB_EXIT:-0}" = 0 ]; then',
      '  printf \'{"risk_assessment":{"score":%s,"severity":"LOW","recommendation":"CAUTION"},"issues":[{"severity":"HIGH","category":"Test","pattern":"Rule","location":{"file":"SKILL.md","start_line":3},"finding":"body","remediation":"none"}],"execution_successful":true}\' "${STUB_SCORE:-0}" > "$out"',
      'fi',
      'exit "${STUB_EXIT:-0}"',
    ].join('\n'),
  );
  fs.chmodSync(file, 0o755);
  return file;
}

function scan(root, args, env = {}) {
  const reports = path.join(tmp(), 'reports');
  const out = spawnSync('bash', [SCRIPT, '--root', root, '--report-dir', reports, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, SKILLSPECTOR_CMD: stub(), ...env },
  });
  const summaryFile = path.join(reports, 'summary.md');
  return { ...out, reports, summary: fs.existsSync(summaryFile) ? fs.readFileSync(summaryFile, 'utf8') : '' };
}

test('--help exits 0 and documents the options', () => {
  const out = spawnSync('bash', [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(out.status, 0, out.stderr);
  for (const flag of ['--changed', '--threshold', '--summary-file', 'SKILLSPECTOR_CMD']) assert.match(out.stdout, new RegExp(flag));
});

test('bad usage exits 64', () => {
  assert.equal(spawnSync('bash', [SCRIPT, '--nope'], { encoding: 'utf8' }).status, 64);
  assert.equal(spawnSync('bash', [SCRIPT, '--threshold', '5x'], { encoding: 'utf8' }).status, 64);
  assert.equal(spawnSync('bash', [SCRIPT, '--threshold', '101'], { encoding: 'utf8' }).status, 64);
});

test('--changed scans only the skills with changed files, and writes their reports', () => {
  const root = repo();
  fs.appendFileSync(path.join(root, 'src/skills/beta/SKILL.md'), 'more\n');
  const out = scan(root, ['--changed', 'HEAD'], { STUB_SCORE: '12' });
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /\[PASS \] {2}12\/100 .*src\/skills\/beta/);
  assert.doesNotMatch(out.stdout, /src\/skills\/alpha/);
  assert.ok(fs.existsSync(path.join(out.reports, 'src_skills_beta.json')));
  assert.ok(!fs.existsSync(path.join(out.reports, 'src_skills_alpha.json')));
  assert.match(out.summary, /Scanned \*\*1\*\* skill/);
  assert.match(out.summary, /1 passed · 0 failed · 0 errored/);
});

test('a change under shared/ scans every skill; a skill.json-only change still scans its skill', () => {
  const root = repo();
  fs.appendFileSync(path.join(root, 'shared/connection.md'), 'more\n');
  let out = scan(root, ['--changed', 'HEAD']);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.summary, /Scanned \*\*2\*\* skill/);

  const other = repo();
  fs.writeFileSync(path.join(other, 'src/skills/alpha/skill.json'), JSON.stringify({ name: 'alpha', version: '1.0.1' }));
  out = scan(other, ['--changed', 'HEAD']);
  assert.match(out.stdout, /src\/skills\/alpha/);
  assert.doesNotMatch(out.stdout, /src\/skills\/beta/);
});

test('nothing changed: exit 0 and an empty summary; a deleted skill is skipped', () => {
  const root = repo();
  let out = scan(root, ['--changed', 'HEAD']);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /No skill to scan/);
  assert.match(out.summary, /No skill to scan/);

  fs.rmSync(path.join(root, 'src/skills/beta'), { recursive: true });
  out = scan(root, ['--changed', 'HEAD']);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /No skill to scan/);
});

test('--changed with a ref that is not in the clone exits 2', () => {
  const out = scan(repo(), ['--changed', 'no-such-ref']);
  assert.equal(out.status, 2);
  assert.match(out.stderr, /isn't in this clone/);
});

test('a score above the threshold fails with exit 1 and lists the findings; the threshold is adjustable', () => {
  const root = repo();
  fs.appendFileSync(path.join(root, 'src/skills/beta/SKILL.md'), 'more\n');
  let out = scan(root, ['--changed', 'HEAD'], { STUB_SCORE: '80' });
  assert.equal(out.status, 1);
  assert.match(out.stdout, /\[FAIL \] {2}80\/100/);
  assert.match(out.summary, /\| `src\/skills\/beta` \| FAIL \| 80 \| LOW \| CAUTION \| 1 \|/);
  assert.match(out.summary, /\*\*\[HIGH\] Test \/ Rule\*\* — `SKILL\.md:3`/);

  out = scan(root, ['--changed', 'HEAD', '--threshold', '90'], { STUB_SCORE: '80' });
  assert.equal(out.status, 0, out.stderr);
});

test('a scanner failure is an error, never a pass, and goes in the summary', () => {
  const root = repo();
  fs.appendFileSync(path.join(root, 'src/skills/alpha/SKILL.md'), 'more\n');
  const out = scan(root, ['--changed', 'HEAD'], { STUB_EXIT: '2' });
  assert.equal(out.status, 1);
  assert.match(out.stdout, /\[ERROR\]/);
  assert.match(out.summary, /0 passed · 0 failed · 1 errored/);
  assert.match(out.summary, /### Scan errors/);
});

test('with no arguments every skill is scanned; named paths scan those folders; --summary-file copies the summary', () => {
  const root = repo();
  const summaryFile = path.join(tmp(), 'summary.md');
  let out = scan(root, ['--summary-file', summaryFile]);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.summary, /Scanned \*\*2\*\* skill/);
  assert.equal(fs.readFileSync(summaryFile, 'utf8'), out.summary);

  out = scan(root, [path.join(root, 'src/skills/alpha')]);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.summary, /Scanned \*\*1\*\* skill/);

  out = scan(root, [path.join(root, 'shared')]);
  assert.equal(out.status, 64);
  assert.match(out.stderr, /no SKILL\.md/);
});
