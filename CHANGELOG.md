# Changelog

All notable changes to this project are listed here. Versions follow
[semantic versioning](https://semver.org/); each skill also has its own version in its
`skill.json`.

## 0.1.0 (unreleased)

### Added

- Email skills, all `draft` 1.0.0 (validated, not shipped yet): `email` (entry point for
  email work: account check, routing, safety rules), `email-template-write`,
  `email-template-check`, `email-template-to-dnd`, `email-campaign-create` and
  `email-test-preview`, with eval cases. Some steps wait for MCP tools that aren't on every
  connection yet; each skill's Requirements section names them.
- Grok: `.grok-plugin/marketplace.json`, and the MCP server declared in its manifest (Grok
  reads `.mcp.json` or the manifest, not `mcp.json`). Cursor declares the server inline too.
- `yarn new-skill`: scaffolds a skill (`skill.json` as a draft, a `SKILL.md` skeleton
  with the shared includes, one example eval case), refuses an existing or invalid name,
  and validates the result. `.claude/skills/add-brevo-skill` guides contributors using
  Claude Code through the same steps; it isn't part of the shipped plugin.
- `brevo-cli` (public): synced from `getbrevo/brevo-cli`.
- `brevo-cli` 1.1.0: synced the agent-neutral skill text from getbrevo/brevo-cli#138
  (`brevo skill:cli install --agent codex|gemini|all`); `min_cli_version` 2.5.0.
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
