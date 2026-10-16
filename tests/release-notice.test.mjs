import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotice, classify, parseSums, previousTag, NOTICE_KEYS, MAX_ENTRIES } from '../scripts/release-notice.mjs';

const REPO = 'example/skills';
const TAG = 'v0.2.0';
const skill = (name, version, extra = {}) => ({ name, version, status: 'beta', summary: `Does ${name}.`, requires: [], ...extra });
const catalog = (...skills) => ({ version: '0.2.0', plugin: 'brevo', skills });
const sumsText = (...files) => files.map(([file, hash]) => `${hash}  ./${file}`).join('\n') + '\n';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

const previous = catalog(skill('alpha', '1.0.0'), skill('beta', '1.0.0'), skill('shelly', '1.0.0', { status: 'public', requires: ['shell'] }));
const current = catalog(
  skill('alpha', '1.1.0'),
  skill('beta', '1.0.0'),
  skill('shelly', '1.1.0', { status: 'public', requires: ['shell'] }),
  skill('fresh', '1.0.0'),
  skill('sketch', '1.0.0', { status: 'draft' }),
);
const build = (overrides = {}) =>
  buildNotice({ previous, catalog: current, tag: TAG, repo: REPO, actor: 'octocat', sums: sumsText(['alpha-1.1.0.zip', HASH_A], ['fresh-1.0.0.zip', HASH_B], ['brevo-instructions-0.2.0.zip', HASH_B], ['brevo-mcp-text-0.2.0.zip', HASH_A]), owners: ['U000000001', 'U000000002'], ...overrides });

test('classifies each skill as changed, new or unchanged', () => {
  const { changed, added, unchanged } = classify(previous, current);
  assert.deepEqual(changed.map((s) => [s.name, s.previousVersion, s.version]), [['alpha', '1.0.0', '1.1.0'], ['shelly', '1.0.0', '1.1.0']]);
  assert.deepEqual(added.map((s) => s.name), ['fresh', 'sketch']);
  assert.deepEqual(unchanged.map((s) => s.name), ['beta']);
});

test('the change summary names old and new versions, new skills, and the unchanged ones once', () => {
  const { changeSummary } = build();
  assert.match(changeSummary, /^alpha 1\.0\.0 → 1\.1\.0: Does alpha\.$/m);
  assert.match(changeSummary, /^fresh new 1\.0\.0: Does fresh\.$/m);
  assert.match(changeSummary, /^Unchanged: beta\.$/m);
  assert.equal(changeSummary.match(/\bbeta\b/g).length, 1);
});

test('shell and draft skills never appear under upload by hand', () => {
  const { customMessage } = build();
  assert.doesNotMatch(customMessage, /shelly/);
  assert.doesNotMatch(customMessage, /sketch/);
  assert.match(customMessage, /^alpha 1\.1\.0: /m);
  assert.match(customMessage, /^fresh 1\.0\.0: /m);
});

test('upload URLs carry the tag and the skill version, with the sha256 from SHA256SUMS', () => {
  const { customMessage } = build();
  assert.match(customMessage, new RegExp(`https://github.com/${REPO}/releases/download/${TAG}/alpha-1\\.1\\.0\\.zip sha256 ${HASH_A}`));
  assert.match(customMessage, new RegExp(`https://github.com/${REPO}/releases/download/${TAG}/fresh-1\\.0\\.0\\.zip sha256 ${HASH_B}`));
  assert.match(customMessage, new RegExp(`releases/download/${TAG}/brevo-all-platform-skill-bundle-0\\.2\\.0\\.zip`));
  assert.match(customMessage, new RegExp(`releases/download/${TAG}/brevo-instructions-0\\.2\\.0\\.zip`));
  assert.match(customMessage, new RegExp(`releases/download/${TAG}/catalog\\.json`));
});

test('lists the all-skills ZIP, for adding skills to an existing chat plugin', () => {
  const { customMessage } = build();
  assert.match(customMessage, new RegExp(`releases/download/${TAG}/brevo-skills-0\\.2\\.0\\.zip`));
});

test('the instructions ZIP line is left out when SHA256SUMS shows it was not packaged', () => {
  const { customMessage } = build({ sums: sumsText(['alpha-1.1.0.zip', HASH_A]) });
  assert.doesNotMatch(customMessage, /Instructions ZIP/);
  assert.match(customMessage, /brevo-all-platform-skill-bundle-0\.2\.0\.zip/);
  // Without any sums (a dry run), the line is kept.
  assert.match(build({ sums: undefined }).customMessage, /Instructions ZIP/);
});

test('parses SHA256SUMS lines with and without the ./ prefix', () => {
  assert.deepEqual(parseSums(`${HASH_A}  ./a.zip\n${HASH_B}  b.zip\n\nnot a line\n`), { 'a.zip': HASH_A, 'b.zip': HASH_B });
});

test('an empty previous catalog marks everything new', () => {
  for (const prev of [undefined, { skills: [] }]) {
    const notice = build({ previous: prev });
    assert.match(notice.changeSummary, /^alpha new 1\.1\.0: /m);
    assert.match(notice.changeSummary, /^beta new 1\.0\.0: /m);
    assert.doesNotMatch(notice.changeSummary, /→/);
    assert.doesNotMatch(notice.changeSummary, /^Unchanged:/m);
    assert.match(notice.customMessage, /^beta 1\.0\.0: /m);
  }
});

test('21 changed skills produce a capped list and a see-the-release line', () => {
  const many = Array.from({ length: 21 }, (_, i) => `skill-${String(i).padStart(2, '0')}`);
  const prev = catalog(...many.map((n) => skill(n, '1.0.0')));
  const now = catalog(...many.map((n) => skill(n, '1.1.0')));
  const notice = build({ previous: prev, catalog: now });
  for (const text of [notice.changeSummary, notice.customMessage]) {
    assert.equal(text.match(/^skill-\d\d /gm).length, MAX_ENTRIES);
    assert.doesNotMatch(text, /skill-20 /);
    assert.match(text, /1 more\. See the release for the rest\./);
  }
});

test('the output has exactly the nine keys, all strings, bare URLs and no mrkdwn', () => {
  const notice = build();
  assert.deepEqual(Object.keys(notice).sort(), [...NOTICE_KEYS].sort());
  for (const value of Object.values(notice)) assert.equal(typeof value, 'string');
  assert.equal(notice.repository, REPO);
  assert.equal(notice.tag, TAG);
  assert.equal(notice.actor, 'octocat');
  assert.equal(notice.releaseTagUrl, `https://github.com/${REPO}/releases/tag/${TAG}`);
  assert.equal(notice.repoOwner1, 'U000000001');
  assert.equal(notice.repoOwner2, 'U000000002');
  assert.equal(notice.actorMention, 'U000000001');
  assert.match(notice.customMessage, /^MCP server: serves this text after its owners pull/m);
  for (const text of [notice.customMessage, notice.changeSummary]) {
    assert.doesNotMatch(text, /<https?:/, 'URLs are bare, not <url|label>');
    assert.doesNotMatch(text, /[*`~]|\[.+\]\(/, 'no mrkdwn or markdown');
    assert.doesNotMatch(text, /<@/, 'no inline mentions');
  }
});

test('missing owners degrade to empty strings', () => {
  const notice = build({ owners: [] });
  assert.equal(notice.repoOwner1, '');
  assert.equal(notice.actorMention, '');
});

test('the MCP text ZIP is listed with its sha256, and left out when it was not packaged', () => {
  assert.match(build().customMessage, new RegExp(`^MCP text ZIP, for the MCP server's update workflow: https://github.com/${REPO}/releases/download/${TAG}/brevo-mcp-text-0\\.2\\.0\\.zip sha256 ${HASH_A}$`, 'm'));
  const without = build({ sums: sumsText(['alpha-1.1.0.zip', HASH_A]) }).customMessage;
  assert.doesNotMatch(without, /^MCP text ZIP, for/m);
  assert.match(without, /^MCP server: serves this text after its owners pull/m);
});

test('previousTag picks the latest v* tag before the current one', () => {
  assert.equal(previousTag(['v0.1.0', 'v0.2.0', 'v0.10.0', 'v1.0.0', 'nightly'], 'v1.0.0'), 'v0.10.0');
  assert.equal(previousTag(['v0.1.0', 'v0.2.0'], 'v0.2.0'), 'v0.1.0');
  assert.equal(previousTag(['v0.2.0-rc.1', 'v0.2.0'], 'v0.2.0'), 'v0.2.0-rc.1');
  assert.equal(previousTag(['v0.1.0'], 'v0.1.0'), undefined);
  assert.equal(previousTag([], 'v0.1.0'), undefined);
});
