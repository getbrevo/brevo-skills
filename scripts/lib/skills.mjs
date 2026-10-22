// Shared helpers: config, skill loading, frontmatter and include resolution.
// Zero dependencies, so CI and contributors only need Node 20+.

import fs from 'node:fs';
import path from 'node:path';

export const STATUSES = ['draft', 'internal', 'beta', 'public'];
export const PLATFORMS = ['claude', 'openai', 'gemini'];

// A skill can have a role. The router is the entry point for any Brevo request: it checks
// the connection and account, then sends each step to the right skill. Its SKILL.md holds
// ROUTES_MARKER where the build writes the table of the other skills that ship with it.
export const ROLES = ['router'];
export const ROUTES_MARKER = '<!-- brevo:routes -->';

// What a skill can need from the agent's environment (skill.json `requires`). Each adapter
// lists the ones its target supports, and only gets the skills it can run.
export const REQUIREMENTS = {
  shell: 'Needs a terminal: it runs shell commands, so it works in coding agents (Claude Code, Codex, Cursor, Gemini CLI, Antigravity), not in chat-only apps.',
};

// The Agent Skills `compatibility` text for a skill's requirements, or undefined.
export function compatibilityFor(requires = []) {
  const text = requires.map((r) => REQUIREMENTS[r]).filter(Boolean).join(' ');
  return text || undefined;
}

// Which skill statuses each audience ships. A public repo never ships draft or internal skills.
export const PUBLISHED = {
  public: ['beta', 'public'],
  internal: ['internal', 'beta', 'public'],
};

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Skills are text only: an agent reads them, nothing in them is ever executed. Images are
// allowed as assets. Anything else (scripts, binaries) is refused.
const ALLOWED_FILE_RE = /\.(md|txt|json|ya?ml|csv|png|jpe?g|gif|svg|webp)$/i;
// Agent hosts reserve their own names; a skill named after one can be refused or confusing.
const RESERVED_NAME_WORDS = ['anthropic', 'claude', 'openai', 'gemini'];
// Agents load the whole SKILL.md; longer material belongs in references/, loaded on demand.
export const MAX_SKILL_LINES = 500;
const SEMVER_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
// Includes may only name Markdown files directly in shared/. A synced skill comes from another
// repo, so an include must never reach anything else on the build machine.
const INCLUDE_RE = /^<!-- include: (\S+) -->$/gm;
const INCLUDE_PATH_RE = /^shared\/[A-Za-z0-9_-]+\.md$/;

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadConfig(root) {
  return readJson(path.join(root, 'brevo-skills.json'));
}

// Parses the YAML frontmatter subset SKILL.md uses: top-level `key: value` lines.
export function parseFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { data: {}, body: text };
  const data = {};
  for (const line of match[1].split('\n')) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    data[kv[1]] = value;
  }
  return { data, body: text.slice(match[0].length) };
}

function yamlScalar(value) {
  const s = String(value);
  return /^[\w .,/()'’→-]*$/.test(s) && !/^\s|\s$/.test(s) && !s.includes(': ') ? s : JSON.stringify(s);
}

// Renders frontmatter with one level of nesting (enough for `metadata:`).
export function renderFrontmatter(data) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object') {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value)) lines.push(`  ${k}: ${yamlScalar(v)}`);
    } else {
      lines.push(`${key}: ${yamlScalar(value)}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

// Replaces `<!-- include: shared/x.md -->` lines with that file's content (paths from the repo root).
export function resolveIncludes(text, root, seen = []) {
  return text.replace(INCLUDE_RE, (_, rel) => {
    if (!INCLUDE_PATH_RE.test(rel)) throw new Error(`include must be a shared/<name>.md file: ${rel}`);
    if (seen.includes(rel)) throw new Error(`include cycle: ${[...seen, rel].join(' -> ')}`);
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) throw new Error(`include not found: ${rel}`);
    const base = fs.realpathSync(path.join(root, 'shared'));
    if (path.dirname(fs.realpathSync(file)) !== base) throw new Error(`include resolves outside shared/: ${rel}`);
    return resolveIncludes(fs.readFileSync(file, 'utf8').trimEnd(), root, [...seen, rel]);
  });
}

// Lists a skill's files. Symlinks are refused: they could point a published skill at any file.
export function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`symlinks aren't allowed in skills: ${path.relative(base, full)}`);
    if (entry.isDirectory()) return listFiles(full, base);
    return [path.relative(base, full)];
  });
}

// Loads every skill under src/skills/. Each one is a folder with skill.json and SKILL.md.
export function loadSkills(root) {
  const dir = path.join(root, 'src', 'skills');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const skillDir = path.join(dir, entry.name);
      const meta = readJson(path.join(skillDir, 'skill.json'));
      const source = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
      const { data, body } = parseFrontmatter(source);
      return {
        folder: entry.name,
        dir: skillDir,
        meta,
        frontmatter: data,
        body,
        files: listFiles(skillDir).filter((f) => f !== 'skill.json' && f !== 'SKILL.md').sort(),
      };
    })
    .sort((a, b) => a.folder.localeCompare(b.folder));
}

export function publishedSkills(skills, audience) {
  const allowed = PUBLISHED[audience];
  if (!allowed) throw new Error(`unknown audience: ${audience}`);
  return skills.filter((s) => allowed.includes(s.meta.status));
}

// Why a skill name is refused, or [] when it is fine. Shared by validate and new-skill.
export function nameProblems(name) {
  const problems = [];
  if (!NAME_RE.test(name) || name.length > 64) problems.push('name must be lower-case words joined by hyphens, max 64 characters');
  for (const word of RESERVED_NAME_WORDS) {
    if (name.split('-').includes(word)) problems.push(`name can't contain the reserved word "${word}"`);
  }
  return problems;
}

export function validateSkill(skill, root) {
  const errors = [];
  const { meta, frontmatter, folder } = skill;
  const where = `src/skills/${folder}`;
  if (meta.name !== folder) errors.push(`${where}: skill.json name "${meta.name}" must match the folder`);
  if (frontmatter.name !== folder) errors.push(`${where}: SKILL.md name "${frontmatter.name}" must match the folder`);
  for (const problem of nameProblems(folder)) errors.push(`${where}: ${problem}`);
  const description = frontmatter.description ?? '';
  if (!description) errors.push(`${where}: SKILL.md needs a description`);
  if (description.length > 1024) errors.push(`${where}: description is ${description.length} characters (max 1024)`);
  if (description && !/\buse (it )?when\b/i.test(description)) {
    errors.push(`${where}: description should say when to use the skill ("Use when …"): agents pick skills from it`);
  }
  const skillLines = fs.existsSync(path.join(skill.dir, 'SKILL.md'))
    ? fs.readFileSync(path.join(skill.dir, 'SKILL.md'), 'utf8').split('\n').length
    : 0;
  if (skillLines > MAX_SKILL_LINES) {
    errors.push(`${where}: SKILL.md is ${skillLines} lines (max ${MAX_SKILL_LINES}); move detail into references/`);
  }
  if (!SEMVER_RE.test(meta.version ?? '')) errors.push(`${where}: version "${meta.version}" is not semver`);
  if (!STATUSES.includes(meta.status)) errors.push(`${where}: status must be one of ${STATUSES.join(', ')}`);
  if (!meta.owner) errors.push(`${where}: owner is required`);
  if (!meta.summary) errors.push(`${where}: summary is required`);
  if (!Array.isArray(meta.platforms) || meta.platforms.length === 0) {
    errors.push(`${where}: platforms must list at least one of ${PLATFORMS.join(', ')}`);
  } else {
    for (const p of meta.platforms) if (!PLATFORMS.includes(p)) errors.push(`${where}: unknown platform "${p}"`);
  }
  if (!Array.isArray(meta.requires_tools)) errors.push(`${where}: requires_tools must be an array (it can be empty)`);
  if (meta.source !== undefined) errors.push(...validateSource(meta.source, where));
  if (meta.min_cli_version !== undefined && !SEMVER_RE.test(meta.min_cli_version)) errors.push(`${where}: min_cli_version "${meta.min_cli_version}" is not semver`);
  if (meta.default !== undefined && typeof meta.default !== 'boolean') errors.push(`${where}: default must be true or false`);
  if (meta.tool_notes !== undefined) {
    for (const [tool, note] of Object.entries(meta.tool_notes)) {
      if (!(meta.requires_tools ?? []).includes(tool)) errors.push(`${where}: tool_notes names "${tool}", which isn't in requires_tools`);
      if (typeof note !== 'string' || !note.trim() || note.length > 300) errors.push(`${where}: tool_notes.${tool} must be 1-300 characters`);
    }
  }
  for (const rel of skill.files ?? []) {
    if (!ALLOWED_FILE_RE.test(rel)) errors.push(`${where}/${rel}: skills are text only (Markdown, data, images); scripts and binaries aren't allowed`);
    else if (fs.existsSync(path.join(skill.dir, rel)) && fs.statSync(path.join(skill.dir, rel)).mode & 0o111) errors.push(`${where}/${rel}: remove the executable bit`);
  }
  if (meta.role !== undefined && !ROLES.includes(meta.role)) errors.push(`${where}: role must be one of ${ROLES.join(', ')}`);
  const hasMarker = (skill.body ?? "").includes(ROUTES_MARKER);
  if (meta.role === 'router' && !hasMarker) errors.push(`${where}: a router's SKILL.md needs ${ROUTES_MARKER} where the routes table goes`);
  if (meta.role !== 'router' && hasMarker) errors.push(`${where}: only the router's SKILL.md may contain ${ROUTES_MARKER}`);
  if (meta.requires !== undefined) {
    if (!Array.isArray(meta.requires)) errors.push(`${where}: requires must be an array`);
    else for (const r of meta.requires) if (!(r in REQUIREMENTS)) errors.push(`${where}: unknown requirement "${r}" (known: ${Object.keys(REQUIREMENTS).join(', ')})`);
    if ((compatibilityFor(meta.requires.filter?.((r) => r in REQUIREMENTS)) ?? '').length > 500) errors.push(`${where}: the compatibility text for these requirements is over 500 characters`);
  }

  for (const rel of ['SKILL.md', ...skill.files.filter((f) => f.endsWith('.md'))]) {
    let text;
    try {
      text = resolveIncludes(fs.readFileSync(path.join(skill.dir, rel), 'utf8'), root);
    } catch (err) {
      errors.push(`${where}/${rel}: ${err.message}`);
      continue;
    }
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const resolved = path.join(path.dirname(path.join(skill.dir, rel)), target.split('#')[0]);
      if (!fs.existsSync(resolved)) errors.push(`${where}/${rel}: broken link ${target}`);
    }
  }
  return errors;
}

// A synced skill names the public repo it comes from. Its SKILL.md and references/ are
// overwritten by `yarn sync-skill`; only skill.json is maintained here.
export const SOURCE_REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SOURCE_PATH_RE = /^(\.|[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)*)$/;
// Starts with a letter or digit so a ref can never be read as a git option.
const SOURCE_REF_RE = /^[A-Za-z0-9][A-Za-z0-9_./-]*$/;

export function validateSource(source, where) {
  const errors = [];
  if (!source || typeof source !== 'object') return [`${where}: source must be an object { repo, path, ref }`];
  if (!SOURCE_REPO_RE.test(source.repo ?? '')) errors.push(`${where}: source.repo must be "owner/name"`);
  if (!SOURCE_PATH_RE.test(source.path ?? '') || source.path.split('/').includes('..')) errors.push(`${where}: source.path must be a relative path inside the repo`);
  if (!SOURCE_REF_RE.test(source.ref ?? '')) errors.push(`${where}: source.ref must be a branch, tag or commit`);
  return errors;
}

// Rules across skills: one router at most, since it claims every Brevo request.
export function validateSkillSet(skills) {
  const routers = skills.filter((s) => s.meta.role === 'router').map((s) => s.folder);
  return routers.length > 1 ? [`only one skill can be the router; found ${routers.join(', ')}`] : [];
}

export function validateConfig(config, root) {
  const errors = [];
  if (config.license !== undefined && !/^[A-Za-z0-9.+-]+$/.test(config.license)) errors.push('brevo-skills.json: license must be an SPDX identifier');
  if (config.logo !== undefined && root && !/^https:\/\//.test(config.logo) && !fs.existsSync(path.join(root, config.logo))) {
    errors.push(`brevo-skills.json: logo "${config.logo}" doesn't exist (use a repo path or an https URL)`);
  }
  if (!SEMVER_RE.test(config.version ?? '')) errors.push(`brevo-skills.json: version "${config.version}" is not semver`);
  if (!PUBLISHED[config.audience]) errors.push(`brevo-skills.json: audience must be one of ${Object.keys(PUBLISHED).join(', ')}`);
  if (!config.plugin?.name || !NAME_RE.test(config.plugin.name)) errors.push('brevo-skills.json: plugin.name is required (lower-case, hyphens)');
  for (const p of PLATFORMS) {
    if (!/^https:\/\//.test(config.mcp?.endpoints?.[p] ?? '')) errors.push(`brevo-skills.json: mcp.endpoints.${p} must be an https URL`);
  }
  return errors;
}
