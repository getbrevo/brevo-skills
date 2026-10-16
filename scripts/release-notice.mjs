#!/usr/bin/env node
// Builds the variables of the Slack release notice: which skills changed since the previous
// release and the exact files to upload by hand in claude.ai and ChatGPT. The message layout
// lives in Slack Workflow Builder; this only produces the nine variables its trigger expects,
// as plain text (bare URLs, no mrkdwn). Used by the notify job of release.yml:
//
//   node scripts/release-notice.mjs --tag v0.1.0 [--out notice.json]
//     [--catalog catalog.json] [--sums dist/release/SHA256SUMS]
//     [--previous <git ref>]   (default: the latest v* tag before --tag; none means all new)
//     [--repo owner/name]      (default: GITHUB_REPOSITORY)
//     [--actor login]          (default: GITHUB_ACTOR)
//
// The two upload owners come from SLACK_REPO_OWNER_1 and SLACK_REPO_OWNER_2 (Slack user IDs,
// repository variables). Nothing Slack-specific is written in the repo.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson } from './lib/skills.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The nine variables the Slack workflow expects, in its order.
export const NOTICE_KEYS = ['repoOwner1', 'repoOwner2', 'actorMention', 'customMessage', 'releaseTagUrl', 'repository', 'changeSummary', 'actor', 'tag'];

// Workflow variables have a length cap: every list stops here.
export const MAX_ENTRIES = 20;
const REST_LINE = 'See the release for the rest.';

// Skills that get an upload ZIP (scripts/package.sh): published, and runnable without a shell.
const UPLOADABLE = new Set(['beta', 'public']);

// Pure: parses SHA256SUMS (`<hash>  ./<file>` per line) into { file: hash }.
export function parseSums(text = '') {
  const sums = {};
  for (const line of text.split('\n')) {
    const m = /^([0-9a-f]{64})\s+\*?(?:\.\/)?(\S+)$/i.exec(line.trim());
    if (m) sums[m[2]] = m[1].toLowerCase();
  }
  return sums;
}

// Pure: the latest v* tag strictly before `tag` by semver, or undefined.
export function previousTag(tags, tag) {
  const parse = (t) => {
    const m = /^v(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(t);
    return m && { tag: t, nums: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] };
  };
  const compare = (a, b) => {
    for (let i = 0; i < 3; i++) if (a.nums[i] !== b.nums[i]) return a.nums[i] - b.nums[i];
    if (!a.pre && !b.pre) return 0;
    if (!a.pre || !b.pre) return a.pre ? -1 : 1; // a pre-release precedes the release
    return a.pre < b.pre ? -1 : a.pre > b.pre ? 1 : 0;
  };
  const current = parse(tag);
  const before = tags.map(parse).filter((t) => t && (!current || compare(t, current) < 0));
  before.sort(compare);
  return before.at(-1)?.tag;
}

// Pure: each skill of the catalog as changed (version differs), new (absent before) or unchanged.
export function classify(previous, catalog) {
  const before = new Map((previous?.skills ?? []).map((s) => [s.name, s]));
  const changed = [];
  const added = [];
  const unchanged = [];
  for (const skill of catalog.skills) {
    const old = before.get(skill.name);
    if (!old) added.push(skill);
    else if (old.version !== skill.version) changed.push({ ...skill, previousVersion: old.version });
    else unchanged.push(skill);
  }
  return { changed, added, unchanged };
}

function capped(lines) {
  if (lines.length <= MAX_ENTRIES) return lines;
  return [...lines.slice(0, MAX_ENTRIES), `… and ${lines.length - MAX_ENTRIES} more. ${REST_LINE}`];
}

function cappedNames(skills) {
  const names = skills.map((s) => s.name);
  if (names.length <= MAX_ENTRIES) return names.join(', ');
  return `${names.slice(0, MAX_ENTRIES).join(', ')} and ${names.length - MAX_ENTRIES} more (${REST_LINE.toLowerCase().replace(/\.$/, '')})`;
}

// Pure: the nine variables of the notice, all strings.
export function buildNotice({ previous, catalog, tag, repo, actor, sums, owners = [] } = {}) {
  if (!catalog?.skills) throw new Error('buildNotice needs the catalog');
  if (!tag) throw new Error('buildNotice needs the release tag');
  if (!repo) throw new Error('buildNotice needs the repository (owner/name)');
  const hashes = typeof sums === 'string' ? parseSums(sums) : sums ?? {};
  const [repoOwner1 = '', repoOwner2 = ''] = owners;
  const download = (file) => `https://github.com/${repo}/releases/download/${tag}/${file}`;
  const withSum = (file) => (hashes[file] ? `${download(file)} sha256 ${hashes[file]}` : download(file));
  // SHA256SUMS lists every packaged file: with sums in hand, a file absent from them was not
  // packaged (the instructions ZIP is skipped when every shipped skill needs a shell).
  const packaged = (file) => sums == null || Boolean(hashes[file]);

  const { changed, added, unchanged } = classify(previous, catalog);
  const summaryLines = [
    ...changed.map((s) => `${s.name} ${s.previousVersion} → ${s.version}: ${s.summary}`),
    ...added.map((s) => `${s.name} new ${s.version}: ${s.summary}`),
  ];
  const changeSummary = [
    summaryLines.length ? `Changed in ${tag}:` : `No skill changed in ${tag}.`,
    ...capped(summaryLines),
    unchanged.length ? `Unchanged: ${cappedNames(unchanged)}.` : 'Every skill is new or changed.',
  ].join('\n');

  const uploads = [...changed, ...added].filter((s) => UPLOADABLE.has(s.status) && !(s.requires ?? []).includes('shell'));
  const uploadLines = uploads.map((s) => `${s.name} ${s.version}: ${withSum(`${s.name}-${s.version}.zip`)}`);
  const plugin = catalog.plugin ?? 'brevo';
  const customMessage = [
    uploads.length ? 'Upload by hand, one ZIP per skill:' : 'Nothing to upload by hand: no uploadable skill changed.',
    ...capped(uploadLines),
    'claude.ai: Settings › Capabilities › Skills › Upload skill (an org admin can do it for everyone).',
    'ChatGPT: Admin › Skills › Upload, then share with the workspace.',
    `All skills ZIP, to add to an existing chat plugin (unzip over its skills folder, raise its version, upload it again): ${withSum(`${plugin}-skills-${catalog.version}.zip`)}`,
    `All-platform skill bundle: ${withSum(`${plugin}-all-platform-skill-bundle-${catalog.version}.zip`)}`,
    ...(packaged(`${plugin}-instructions-${catalog.version}.zip`) ? [`Instructions ZIP: ${withSum(`${plugin}-instructions-${catalog.version}.zip`)}`] : []),
    `Catalog: ${withSum('catalog.json')}`,
    // The MCP server's own repository pulls this ZIP (its update workflow verifies the sum).
    ...(packaged(`${plugin}-mcp-text-${catalog.version}.zip`) ? [`MCP text ZIP, for the MCP server's update workflow: ${withSum(`${plugin}-mcp-text-${catalog.version}.zip`)}`] : []),
    'MCP server: serves this text after its owners pull the MCP text ZIP and deploy.',
    'Already automatic:',
    'Brevo CLI: installed skills refresh on their own.',
    'Marketplaces (Claude Code, Codex, Cursor, Grok, Gemini CLI): the release is picked up.',
  ].join('\n');

  return {
    repoOwner1: String(repoOwner1),
    repoOwner2: String(repoOwner2),
    actorMention: String(repoOwner1),
    customMessage,
    releaseTagUrl: `https://github.com/${repo}/releases/tag/${tag}`,
    repository: String(repo),
    changeSummary,
    actor: String(actor ?? ''),
    tag: String(tag),
  };
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function arg(args, name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}

function main() {
  const args = process.argv.slice(2);
  const tag = arg(args, '--tag', process.env.RELEASE_TAG);
  if (!tag) {
    console.error('Usage: node scripts/release-notice.mjs --tag vX.Y.Z [--out notice.json] [--previous <ref>] [--catalog <file>] [--sums <file>]');
    process.exit(2);
  }
  const catalog = readJson(path.resolve(ROOT, arg(args, '--catalog', 'catalog.json')));
  const sumsFile = path.resolve(ROOT, arg(args, '--sums', 'dist/release/SHA256SUMS'));
  const sums = fs.existsSync(sumsFile) ? fs.readFileSync(sumsFile, 'utf8') : '';
  if (!sums) console.warn(`No SHA256SUMS at ${sumsFile}: the notice carries no checksums.`);

  let ref = arg(args, '--previous');
  if (!ref) {
    let tags = [];
    try { tags = git(['tag', '--list', 'v*']).split('\n').filter(Boolean); } catch { /* no git: all new */ }
    ref = previousTag(tags, tag);
  }
  let previous;
  if (ref) {
    try { previous = JSON.parse(git(['show', `${ref}:catalog.json`])); } catch { console.warn(`No catalog.json at ${ref}: every skill is listed as new.`); }
  } else {
    console.warn(`No release before ${tag}: every skill is listed as new.`);
  }

  const notice = buildNotice({
    previous,
    catalog,
    tag,
    repo: arg(args, '--repo', process.env.GITHUB_REPOSITORY),
    actor: arg(args, '--actor', process.env.GITHUB_ACTOR),
    sums,
    owners: [process.env.SLACK_REPO_OWNER_1 ?? '', process.env.SLACK_REPO_OWNER_2 ?? ''],
  });
  const out = path.resolve(ROOT, arg(args, '--out', 'notice.json'));
  fs.writeFileSync(out, JSON.stringify(notice, null, 2) + '\n');
  console.log(`Wrote ${path.relative(ROOT, out)} for ${tag} (previous: ${ref ?? 'none'}).`);
  console.log(notice.changeSummary);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
