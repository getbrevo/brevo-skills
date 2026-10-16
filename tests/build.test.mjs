import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildOutputs, checkOutputs, routesTable } from '../scripts/build.mjs';
import { loadSkills, validateSkill } from '../scripts/lib/skills.mjs';
import { yaml } from '../adapters/util.mjs';
import { validateManifests } from '../scripts/check-schemas.mjs';

const CONFIG = {
  version: '2.3.4',
  audience: 'public',
  repository: 'https://github.com/example/brevo-skills',
  license: 'MIT',
  plugin: { name: 'brevo', displayName: 'Brevo', description: 'Brevo skills', author: { name: 'Brevo' }, keywords: ['brevo'] },
  mcp: {
    serverName: 'brevo',
    servers: { claude: 'anthropic', openai: 'openai', gemini: 'google' },
    endpoints: {
      claude: 'https://mcp.example.com/claude',
      openai: 'https://mcp.example.com/openai',
      gemini: 'https://mcp.example.com/gemini',
    },
  },
};

function skill(root, name, { status = 'public', platforms = ['claude', 'openai', 'gemini'], requires, role, tools = ['tool_a'], notes } = {}) {
  const dir = path.join(root, 'src/skills', name);
  fs.mkdirSync(path.join(dir, 'references'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'skill.json'),
    JSON.stringify({ name, version: '1.0.0', status, owner: 'team', summary: `${name} summary`, platforms, requires, role, requires_tools: tools, tool_notes: notes }),
  );
  const routes = role === 'router' ? '\n## Routes\n\n<!-- brevo:routes -->\n' : '';
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: Does ${name}.\n---\n# ${name}\n${routes}\n<!-- include: shared/connection.md -->\n`);
  fs.writeFileSync(path.join(dir, 'references/guide.md'), '# Guide\n');
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'brevo-build-'));
  fs.writeFileSync(path.join(root, 'brevo-skills.json'), JSON.stringify(CONFIG));
  fs.mkdirSync(path.join(root, 'shared'));
  fs.writeFileSync(path.join(root, 'shared/connection.md'), '## Connection rules\n');
  fs.writeFileSync(path.join(root, 'shared/mcp-instructions.md'), 'Brevo rules.\n');
  skill(root, 'alpha');
  skill(root, 'claude-only', { platforms: ['claude'] });
  skill(root, 'wip', { status: 'draft' });
  return root;
}

const parse = (content) => JSON.parse(content);

test('builds every target from one source, pointing each at its own endpoint', () => {
  const { repo, dist } = buildOutputs(fixture());

  const claude = parse(repo['.claude-plugin/plugin.json']);
  assert.equal(claude.version, '2.3.4');
  assert.equal(claude.mcpServers.brevo.url, 'https://mcp.example.com/claude');
  assert.equal(claude.license, 'MIT');
  const marketplace = parse(repo['.claude-plugin/marketplace.json']);
  assert.equal(marketplace.plugins[0].source, './');
  assert.equal(marketplace.metadata.description, 'Brevo skills');
  assert.equal(marketplace.description, undefined);

  const agentPlugin = parse(repo['plugin.json']);
  assert.equal(agentPlugin.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  assert.equal(agentPlugin.version, '2.3.4');
  assert.equal(parse(repo['mcp.json']).mcpServers.brevo.url, 'https://mcp.example.com/openai');

  const cursor = parse(repo['.cursor-plugin/plugin.json']);
  assert.equal(cursor.displayName, 'Brevo');
  assert.equal(cursor.version, '2.3.4');
  assert.equal(cursor.license, 'MIT');
  assert.deepEqual(parse(repo['.cursor-plugin/marketplace.json']).plugins, [{ name: 'brevo', source: './' }]);
  assert.deepEqual(cursor.mcpServers, { brevo: { url: 'https://mcp.example.com/openai' } });
  const grok = parse(repo['.grok-plugin/plugin.json']);
  assert.equal(grok.version, '2.3.4');
  assert.deepEqual(grok.mcpServers, { brevo: { type: 'http', url: 'https://mcp.example.com/openai' } });
  assert.deepEqual(parse(repo['.grok-plugin/marketplace.json']).plugins.map((p) => [p.name, p.source]), [['brevo', './']]);

  const gemini = parse(repo['gemini-extension.json']);
  assert.equal(gemini.mcpServers.brevo.httpUrl, 'https://mcp.example.com/gemini');
  assert.equal(gemini.contextFileName, 'GEMINI.md');
  assert.match(repo['GEMINI.md'], /\*\*alpha\*\*/);
  assert.doesNotMatch(repo['GEMINI.md'], /claude-only/);

  assert.deepEqual(Object.keys(parse(dist['antigravity/brevo/plugin.json'])), ['name', 'description']);
  assert.equal(parse(dist['antigravity/brevo/mcp_config.json']).mcpServers.brevo.serverUrl, 'https://mcp.example.com/gemini');
  assert.match(dist['instructions/alpha.md'], /# Guide/);
});

test('stamps metadata into SKILL.md and resolves shared includes', () => {
  const { repo } = buildOutputs(fixture());
  const md = repo['skills/alpha/SKILL.md'];
  assert.match(md, /^---\nname: alpha\ndescription: Does alpha.\nmetadata:\n {2}version: 1.0.0\n {2}status: public\n {2}author: brevo\n---\n# alpha/);
  assert.match(md, /## Connection rules/);
  assert.doesNotMatch(md, /include:/);
  assert.equal(repo['skills/alpha/references/guide.md'], '# Guide\n');
});

test('ships only published skills, and Codex metadata only for OpenAI skills', () => {
  const { repo } = buildOutputs(fixture());
  const catalog = parse(repo['catalog.json']);
  assert.deepEqual(catalog.skills.map((s) => s.name), ['alpha', 'claude-only']);
  assert.ok(!Object.keys(repo).some((p) => p.includes('wip')));
  assert.match(repo['skills/alpha/agents/openai.yaml'], /url: https:\/\/mcp.example.com\/openai/);
  assert.ok(!('skills/claude-only/agents/openai.yaml' in repo));
});

test('SKILL.md frontmatter carries the version from skill.json, with brevo as the author', () => {
  const root = fixture();
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'src/skills/alpha/skill.json'), 'utf8'));
  fs.writeFileSync(path.join(root, 'src/skills/alpha/skill.json'), JSON.stringify({ ...meta, version: '3.2.1' }));

  const { repo } = buildOutputs(root);
  assert.match(repo['skills/alpha/SKILL.md'], /\nmetadata:\n {2}version: 3.2.1\n {2}status: public\n {2}author: brevo\n---\n/);
  assert.equal(parse(repo['catalog.json']).skills.find((s) => s.name === 'alpha').version, '3.2.1');
});

test('the catalog carries the MCP server for installers, copied from the config', () => {
  const catalog = parse(buildOutputs(fixture()).repo['catalog.json']);
  assert.deepEqual(Object.keys(catalog), ['version', 'plugin', 'mcp', 'skills']);
  assert.deepEqual(catalog.mcp, { serverName: 'brevo', endpoints: CONFIG.mcp.endpoints });
});

test('a draft skill is validated but ships nowhere', () => {
  const root = fixture();
  skill(root, 'router', { role: 'router' });
  fs.writeFileSync(path.join(root, 'src/skills/wip/SKILL.md'), '---\nname: wip\ndescription: Does wip. Use when asked.\n---\n# wip\n');
  const wip = loadSkills(root).find((s) => s.folder === 'wip');
  assert.equal(wip.meta.status, 'draft');
  assert.deepEqual(validateSkill(wip, root), []);

  const { repo, dist } = buildOutputs(root);
  assert.ok(!Object.keys(repo).some((p) => p.startsWith('skills/wip/')));
  assert.ok(!parse(repo['catalog.json']).skills.some((s) => s.name === 'wip'));
  assert.doesNotMatch(repo['skills/router/SKILL.md'], /wip/);
  assert.doesNotMatch(repo['GEMINI.md'], /wip/);
  assert.ok(!Object.keys(dist).some((p) => p.includes('wip')));
  for (const p of Object.keys(dist).filter((p) => p.startsWith('mcp/'))) assert.doesNotMatch(String(dist[p]), /wip/, p);
});

test('checkOutputs flags missing, stale and unknown generated files', () => {
  const root = fixture();
  const { repo } = buildOutputs(root);
  assert.ok(checkOutputs(root, repo).every((p) => p.startsWith('missing:')));

  for (const [rel, content] of Object.entries(repo)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  assert.deepEqual(checkOutputs(root, repo), []);

  fs.writeFileSync(path.join(root, 'plugin.json'), '{}');
  fs.writeFileSync(path.join(root, 'skills/stray.md'), 'x');
  assert.deepEqual(checkOutputs(root, repo).sort(), ['not generated (remove it, or add it under src/): skills/stray.md', 'out of date: plugin.json']);
});

test('yaml writes nested maps and lists of maps', () => {
  assert.equal(yaml({ a: { b: 'x y', c: [{ d: 1, e: 'f' }] } }), 'a:\n  b: "x y"\n  c:\n    - d: 1\n      e: f');
});

test('every manifest carries the one release version', () => {
  const { repo } = buildOutputs(fixture());
  for (const rel of ['.claude-plugin/plugin.json', 'plugin.json', '.cursor-plugin/plugin.json', '.grok-plugin/plugin.json', 'gemini-extension.json']) {
    assert.equal(parse(repo[rel]).version, '2.3.4', rel);
  }
});

test('logo is added to the manifests that support it, never to the Agent Plugins one', () => {
  const root = fixture();
  fs.writeFileSync(path.join(root, 'brevo-skills.json'), JSON.stringify({ ...CONFIG, logo: 'assets/logo.svg' }));
  const { repo } = buildOutputs(root);
  assert.equal(parse(repo['.claude-plugin/plugin.json']).logo, 'assets/logo.svg');
  assert.equal(parse(repo['.cursor-plugin/plugin.json']).logo, 'assets/logo.svg');
  assert.equal(parse(repo['plugin.json']).logo, undefined);
});

test('generated manifests pass the published schemas', () => {
  const { repo } = buildOutputs(fixture());
  assert.deepEqual(validateManifests(repo), []);
});

test('the schema check catches a manifest without $schema or with unknown fields', () => {
  const { repo } = buildOutputs(fixture());
  const plugin = parse(repo['plugin.json']);
  delete plugin.$schema;
  plugin.logo = 'x.svg';
  const problems = validateManifests({ ...repo, 'plugin.json': JSON.stringify(plugin) });
  assert.ok(problems.some((p) => p.includes("must have required property '$schema'")), problems.join('\n'));
  assert.ok(problems.some((p) => p.includes('(logo)')), problems.join('\n'));
});

test('a skill that requires a shell gets a compatibility note and stays out of chat-only targets', () => {
  const root = fixture();
  skill(root, 'cli-tool', { requires: ['shell'] });
  const { repo, dist } = buildOutputs(root);

  assert.match(repo['skills/cli-tool/SKILL.md'], /\ncompatibility: "Needs a terminal: [^\n]*not in chat-only apps."\nmetadata:/);
  assert.doesNotMatch(repo['skills/alpha/SKILL.md'], /compatibility:/);
  assert.deepEqual(parse(repo['catalog.json']).skills.find((s) => s.name === 'cli-tool').requires, ['shell']);
  assert.deepEqual(parse(repo['catalog.json']).skills.find((s) => s.name === 'alpha').requires, []);

  // Coding agents get it; the condensed instructions for APIs and system prompts don't.
  assert.ok('skills/cli-tool/agents/openai.yaml' in repo);
  assert.match(repo['GEMINI.md'], /\*\*cli-tool\*\*/);
  assert.ok('antigravity/brevo/skills/cli-tool/SKILL.md' in dist);
  assert.ok(!('instructions/cli-tool.md' in dist));
  assert.ok('instructions/alpha.md' in dist);
});

test('the router lists every other published skill it ships with, generated from the catalog', () => {
  const root = fixture();
  skill(root, 'router', { role: 'router' });
  skill(root, 'cli-tool', { requires: ['shell'] });
  const { repo, dist } = buildOutputs(root);

  const md = repo['skills/router/SKILL.md'];
  assert.doesNotMatch(md, /brevo:routes/);
  assert.match(md, /\| Job \| Skill \| Needs \|/);
  for (const name of ['alpha', 'claude-only', 'cli-tool']) assert.match(md, new RegExp(`\`${name}\``), name);
  assert.doesNotMatch(md, /`router`/); // never routes to itself
  assert.doesNotMatch(md, /`wip`/); // drafts don't ship
  assert.match(md, /`cli-tool` \| the Brevo connection, a terminal \|/);
  assert.equal(parse(repo['catalog.json']).skills.find((s) => s.name === 'router').role, 'router');

  // A target's router lists only what that target ships: no shell skill in the API instructions,
  // no Claude-only skill in the Gemini CLI context.
  assert.doesNotMatch(dist['instructions/router.md'], /cli-tool/);
  assert.match(dist['instructions/router.md'], /`alpha`/);
  assert.match(repo['GEMINI.md'], /start with the `router` skill/);
  assert.doesNotMatch(dist['antigravity/brevo/skills/router/SKILL.md'], /claude-only/);
});

test('routesTable marks beta skills and says so when nothing else ships', () => {
  const s = (name, meta = {}) => ({ name, meta: { summary: `${name} job`, requires_tools: [], ...meta } });
  assert.equal(
    routesTable([s('r', { role: 'router' }), s('b', { status: 'beta' })]),
    '| Job | Skill | Needs |\n|---|---|---|\n| b job | `b` (beta) | - |',
  );
  assert.equal(routesTable([s('r', { role: 'router' })]), 'No other Brevo skills ship with this one yet.');
});

test('the catalog lists files, a stable sha256, and default and min_cli_version when set', () => {
  const root = fixture();
  skill(root, 'router', { role: 'router' });
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'src/skills/router/skill.json'), 'utf8'));
  fs.writeFileSync(path.join(root, 'src/skills/router/skill.json'), JSON.stringify({ ...meta, default: true, min_cli_version: '2.5.0' }));

  const first = parse(buildOutputs(root).repo['catalog.json']);
  const second = parse(buildOutputs(root).repo['catalog.json']);
  const router = first.skills.find((s) => s.name === 'router');
  const alpha = first.skills.find((s) => s.name === 'alpha');
  assert.deepEqual(alpha.files, ['SKILL.md', 'references/guide.md']);
  assert.match(alpha.sha256, /^[0-9a-f]{64}$/);
  assert.equal(alpha.sha256, alpha.source_sha256);
  assert.deepEqual(first, second); // deterministic
  assert.equal(router.default, true);
  assert.equal(router.min_cli_version, '2.5.0');
  assert.equal(alpha.default, undefined);
  // The router's shipped files include the generated table; its source hash doesn't.
  assert.notEqual(router.sha256, router.source_sha256);

  // Adding a skill changes the router's table but not its source hash.
  skill(root, 'beta-skill');
  const after = parse(buildOutputs(root).repo['catalog.json']).skills.find((s) => s.name === 'router');
  assert.notEqual(after.sha256, router.sha256);
  assert.equal(after.source_sha256, router.source_sha256);
});

test('mcp: per platform server, instructions point to the guide per skill, plus prompts and tool notes', () => {
  const root = fixture();
  const config = JSON.parse(fs.readFileSync(path.join(root, 'brevo-skills.json'), 'utf8'));
  config.mcp.servers = { claude: 'anthropic', openai: 'openai', gemini: 'google' };
  fs.writeFileSync(path.join(root, 'brevo-skills.json'), JSON.stringify(config));
  fs.writeFileSync(path.join(root, 'shared/mcp-instructions.md'), 'Brevo rules.\n');
  skill(root, 'router', { role: 'router' });
  skill(root, 'cli-tool', { requires: ['shell'] });
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'src/skills/alpha/skill.json'), 'utf8'));
  fs.writeFileSync(path.join(root, 'src/skills/alpha/skill.json'), JSON.stringify({ ...meta, tool_notes: { tool_a: 'Never empty.' } }));

  const { dist } = buildOutputs(root);
  const manifest = parse(dist['mcp/anthropic/manifest.json']);
  assert.deepEqual(manifest.resources.map((r) => r.uri), ['brevo://skills/alpha', 'brevo://skills/claude-only']);
  assert.deepEqual(manifest.prompts.map((p) => p.name), ['alpha', 'claude_only']);
  assert.deepEqual(manifest.tool_notes, { tool_a: 'Never empty.' });
  assert.equal(manifest.instructions, 'instructions.md');
  assert.match(
    dist['mcp/anthropic/instructions.md'],
    /^Brevo rules\.\n\n- alpha summary: first call `get_brevo_guide` with name `alpha` \(or read resource `brevo:\/\/skills\/alpha`\) and follow it\./,
  );
  assert.match(dist['mcp/anthropic/skills/alpha.md'], /# Guide/); // references inlined
  // No router, no shell-only skill, and a platform only gets the skills that target it.
  assert.ok(!Object.keys(dist).some((p) => p.startsWith('mcp/') && /router|cli-tool/.test(p)));
  assert.doesNotMatch(dist['mcp/google/instructions.md'], /claude-only/);
});

test('mcp: guides for the get_brevo_guide tool, and a guide note on every tool only one skill uses', () => {
  const root = fixture();
  const config = JSON.parse(fs.readFileSync(path.join(root, 'brevo-skills.json'), 'utf8'));
  config.mcp.shared_tools = ['account_tool'];
  fs.writeFileSync(path.join(root, 'brevo-skills.json'), JSON.stringify(config));
  // alpha and claude-only share tool_a on anthropic; on google only alpha uses it.
  skill(root, 'alpha', { tools: ['tool_a', 'alpha_only', 'account_tool'], notes: { alpha_only: 'Never empty.' } });
  skill(root, 'router', { role: 'router', tools: ['account_tool'] });

  const { dist } = buildOutputs(root);
  const anthropic = parse(dist['mcp/anthropic/manifest.json']);
  assert.deepEqual(anthropic.guides, [
    { name: 'alpha', description: 'alpha summary', file: 'skills/alpha.md' },
    { name: 'claude-only', description: 'claude-only summary', file: 'skills/claude-only.md' },
  ]);
  const guide = (name) => `Before first use in a conversation, call get_brevo_guide with name '${name}'.`;
  assert.deepEqual(anthropic.tool_notes, {
    alpha_only: `Never empty. ${guide('alpha')}`, // existing note first, guide note appended
    // tool_a is used by two served skills, account_tool is shared by config: no note
  });
  const google = parse(dist['mcp/google/manifest.json']);
  assert.deepEqual(google.guides.map((g) => g.name), ['alpha']);
  assert.deepEqual(google.tool_notes, { alpha_only: `Never empty. ${guide('alpha')}`, tool_a: guide('alpha') });
  assert.match(dist['mcp/google/instructions.md'], /first call `get_brevo_guide` with name `alpha`/);
});
