# Changelog

All notable changes to this project are listed here. Versions follow
[semantic versioning](https://semver.org/); each skill also has its own version in its
`skill.json`.

## 1.0.0 (unreleased)

### Documentation

- The README leads with the skills, an example prompt for each, and the two most common
  installs; the other agents are folded away. It links to the releases, the changelog and
  the issue tracker, and a test fails when a skill has no README row.
- More plugin keywords, and a maintainer checklist for the repository description and topics
  in `docs/publishing.md`.

### Changed

- Skills no longer trigger a redundant `get_brevo_guide` call when they are already loaded
  (installed, plugin or upload). The note on every single-skill tool, the server
  instructions and the `get_brevo_guide` description now say: use the loaded skill, otherwise
  call the tool. The new shared block `shared/skill-source.md` tells the agent where the skill
  comes from and how to install it once (plugin, `npx skills add`, `brevo skill install`).
- `list_brevo_guides` takes an optional `installed` map (skill name to the version in its
  `SKILL.md` metadata) and returns a status per guide: `current`, `stale` (with an update
  hint: `brevo skill update`, or `get_brevo_guide` plus a plugin refresh or ZIP upload),
  `ahead`, `unknown` or `not_installed`. Each guide in the manifests now carries its skill
  version. The server only reports; it fetches and writes nothing.
- `shared/skill-source.md` also holds six working rules every step follows (steps in order,
  only the skill's tools, confirm before a write, read once, report only what a tool
  returned, the user's language). `yarn validate` now fails a non-synced skill that has tools
  and does not include it, `yarn new-skill` adds the include, and AGENTS.md and CONTRIBUTING
  explain it.
- The plugin description and the `list_brevo_guides` and `get_brevo_guide` descriptions mention
  keeping skills current and point to the repository.
- Publishing no longer copies the whole folder: only the generated skills, the plugin
  manifests, `catalog.json`, `brevo-skills.json` and `CHANGELOG.md` are written to the public
  repository, plus the skills table of its README (between the `skills-table` markers, by
  `scripts/readme-table.mjs`). Nothing else in the public repository is touched or deleted.
- The server instructions tell an agent with no shell and no plugin to read the release's
  `catalog.json`, download `<name>-<version>.zip` and check it against `SHA256SUMS`, and to call
  `get_brevo_guide` if it can't fetch or check it. Only servers that have guides get this line.
- `docs/publishing.md`: the manual evals step before a release, and where fixes go.
- Publishing follows the server release instead of a `skills-v` tag: after the production deploy the
  publish job compares the built skills with the published copy and pushes nothing when no skill
  changed. The release is `v<version>` from `brevo-skills.json`, and `yarn check-versions` now
  fails a pull request that changes the skills without bumping it.
- `email-test-send` 1.0.2 and `email-brand-kit` 1.0.1: include `shared/skill-source.md`.
- `email-brand-kit` 1.0.2: status set to `beta` for now.

## 0.1.0 (unreleased)

### Added

- `email-brand-kit` (public 1.0.0): reads the account's brand kit (logo, colours, fonts,
  social links) and turns it into email styles; sets it up from the user's website or changes
  one part, only after the user approves a before/after. The shared rules block
  `shared/email-cache.md` keeps what a conversation has already read; evals added.
- Grok: `.grok-plugin/marketplace.json`, and the MCP server declared in its manifest (Grok
  reads `.mcp.json` or the manifest, not `mcp.json`). Cursor declares the server inline too.
- `yarn new-skill`: scaffolds a skill (`skill.json` as a draft, a `SKILL.md` skeleton
  with the shared includes, one example eval case), refuses an existing or invalid name,
  and validates the result. `.claude/skills/add-brevo-skill` guides contributors using
  Claude Code through the same steps; it isn't part of the shipped plugin.
- `brevo-cli` (public): synced from `getbrevo/brevo-cli`.
- `brevo-cli` 1.1.0: synced the agent-neutral skill text from getbrevo/brevo-cli#138
  (`brevo skill:cli install --agent codex|gemini|all`); `min_cli_version` 2.5.0.
- `brevo-cli` 1.2.0: synced the skill text from getbrevo/brevo-cli#150 (`brevo skill install`,
  `brevo skill check`, install for Claude Code, Codex and Gemini CLI); `min_cli_version` 2.6.0.
- `email-test-send` 1.0.0 (beta): send a test of one email template to addresses the user
  chooses. Its `tool_notes` carry the empty-recipient-list warning for
  `templates_send_test_template`.
- `email-test-send` 1.0.1: no longer targets Gemini. The google server does not expose
  `templates_get_smtp_template` or `templates_send_test_template`, so its guide named tools
  an agent there cannot call. It comes back when those tools are on that server.
- `mcp` adapter: server instructions, skill resources and prompts, and tool notes for each
  platform server of the Brevo MCP server (`dist/mcp/`), packaged by the release as the MCP
  text ZIP that the server's own update workflow pulls. Each
  skill is also a guide for the server's `get_brevo_guide` tool, pointed to from the
  instructions and from the description of every tool that belongs to a single skill, since
  tools are the one MCP feature every client supports.
- `catalog.json` for installers: files, sha256, `default` and `min_cli_version` per skill.
- MCP server instructions tell agents with a shell to install the skills locally with
  `brevo skill install`, and agents without one to call `get_brevo_guide`.
- A PR that changes a skill must bump its version (`yarn check-versions`). Skills are
  text only.
- Packages for Claude Code, Agent Plugins (ChatGPT, Codex), Cursor, Grok, Gemini CLI,
  Antigravity, and condensed instructions for APIs.
- `requires` in `skill.json`: a skill that needs a terminal (`shell`) gets the Agent Skills
  `compatibility` field and is left out of chat-only targets (upload ZIPs, instructions).
- Public-repo standards: security policy, issue and PR templates,
  Dependabot, actions pinned to SHAs, a release environment with required reviewers, and
  build provenance on release artifacts once the repository is public.
- Checks: skill validation, generated files in sync, manifest schemas, public safety, and the
  MCP tool contract.
- Security scan of the skill text with NVIDIA SkillSpector (`yarn scan`, pinned to one
  commit): warn-only on pull requests, a manual full audit that fails on findings.
- A CI guard that refuses edits to a synced skill outside its `skill.json`, pointing at the
  source repo instead.
- Release notice on Slack: every release posts which skills changed and the exact ZIPs (with
  sha256) to upload by hand in claude.ai and ChatGPT, through a Slack Workflow Builder
  trigger held in a secret (`scripts/release-notice.mjs`, `notify` job). Dispatching the
  release workflow with a `tag` re-sends it.

### Security

- `sync-skill`: a source ref must start with a letter or digit and is passed to `git fetch`
  after `--`, so a ref can't be read as a git option (the workflow input check matches).
- The scan script installs SkillSpector's dependencies from a hash-pinned list
  (`scripts/skillspector-requirements.txt`) and the scanner itself with `--no-deps`, so no
  unpinned package is fetched when the scanner is bootstrapped.

### Changed

- The skills that drive the Brevo MCP server (`brevo`, `email-test-send` and `email-template-from-html`) are
  held out of this release until their tools are on the server; they come back in a follow-up
  change. Only `brevo-cli` ships. A `draft` skill is still validated but ships nowhere (not in
  `skills/`, the manifests, the catalog, the router's routes table or `dist/mcp`).
- `catalog.json` carries `mcp` (`serverName` and the endpoint per platform) from
  `brevo-skills.json`, so an installer can register the Brevo MCP server. The hash contract
  (`sha256`, `source_sha256`) is documented for installers in `docs/architecture.md`.
- Generated `SKILL.md` frontmatter carries `metadata.author: brevo` next to
  `metadata.version` (replacing `publisher`): the fields `npx skills` and skills.sh read.
