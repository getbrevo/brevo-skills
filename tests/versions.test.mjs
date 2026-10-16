import test from 'node:test';
import assert from 'node:assert/strict';
import { unbumped } from '../scripts/check-versions.mjs';

const catalog = (...skills) => ({ skills });
const s = (name, version, source_sha256) => ({ name, version, source_sha256 });

test('a skill whose content changed needs a new version', () => {
  const base = catalog(s('a', '1.0.0', 'x'), s('b', '1.0.0', 'y'), s('c', '1.0.0', 'z'));
  const now = catalog(s('a', '1.0.0', 'x2'), s('b', '1.1.0', 'y2'), s('c', '1.0.0', 'z'), s('new', '1.0.0', 'n'));
  assert.deepEqual(unbumped(base, now), ['a']);
});

test('nothing to compare without a base catalog', () => {
  assert.deepEqual(unbumped(undefined, catalog(s('a', '1.0.0', 'x'))), []);
});
