import test from 'node:test';
import assert from 'node:assert/strict';
import { scanText, rulesFromEnv, GENERIC_RULES } from '../scripts/check-public.mjs';
import { findGaps } from '../scripts/check-contract.mjs';

test('the generic rules flag keys and links into chat and wiki workspaces', () => {
  const text = [
    `key = xkeysib-${'0123456789abcdef'.repeat(4)}-AbCdEf`,
    '-----BEGIN RSA PRIVATE KEY-----',
    'thread: https://example-team.slack.com/archives/C0123',
    'spec: https://app.notion.com/p/0123abcd',
  ].join('\n');
  assert.deepEqual(
    scanText(text).map((h) => [h.line, h.rule]),
    [
      [1, 'brevo-api-key'],
      [2, 'private-key'],
      [3, 'slack-link'],
      [4, 'notion-link'],
    ],
  );
});

test('the generic rules leave ordinary text alone', () => {
  assert.deepEqual(scanText('Never print keys (`xkeysib-…`).\nThe page loads slowly.\nhttps://mcp.brevo.com/v1/anthropic/mcp\nhttps://developers.brevo.com'), []);
});

test('internal names come from PUBLIC_SAFETY_PATTERNS, one regex per line, case-insensitive', () => {
  const rules = rulesFromEnv({ PUBLIC_SAFETY_PATTERNS: '# internal hosts\ninternal-host\\.example\n\n\\bsecret-service\\b\n' });
  assert.equal(rules.length, 2);
  const hits = scanText('calls Internal-Host.example\nuses secret-service here\nfine', [...GENERIC_RULES, ...rules]);
  assert.deepEqual(hits.map((h) => [h.line, h.rule]), [[1, 'internal-pattern-1'], [2, 'internal-pattern-2']]);
  assert.deepEqual(rulesFromEnv({}), []);
});

test('findGaps reports missing tools per skill and platform, and skips unknown platforms', () => {
  const skills = [{ meta: { name: 'a', platforms: ['claude', 'gemini', 'openai'], requires_tools: ['x', 'y'] } }];
  assert.deepEqual(findGaps(skills, { claude: ['x', 'y'], gemini: ['x'] }), [{ skill: 'a', platform: 'gemini', missing: ['y'] }]);
});
