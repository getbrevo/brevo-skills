# Changelog

All notable changes to this project are listed here. Versions follow
[semantic versioning](https://semver.org/); each skill also has its own version in its
`skill.json`.

## 0.1.0 (unreleased)

### Added

- Email skills, all `public` 1.0.0: `email` (entry point for
  email work: account check, routing, safety rules), `email-template-write`,
  `email-template-check`, `email-template-to-dnd`, `email-campaign-create` and
  `email-test-preview`, with eval cases. Each skill's Requirements section names its tools.
- `email-brand-kit` (public 1.0.0): reads the account's brand kit (logo, colours, fonts,
  social links) and turns it into email styles; sets it up from the user's website or changes
  one part, only after the user approves a before/after. `email`, `email-template-write` and
  `email-template-to-dnd` route to it and apply brand styles to the editor's Style tab.
- Email skills, after an end-to-end test on a test account: a test send's 204 is reported as
  queued and its outcome read from the send events (or the user checks the logs); test sends
  carry no params, so the check renders with `params: {}` and every value-needing filter is
  guarded with `{% if %}`; the check covers the subject line and skips the skeleton's CSS; a
  saved drag-and-drop template is read back and its sender email fixed; sender domains are
  checked for authentication; HTML templates carry preview text in the hidden preheader;
  saved templates are changed and activated in place after a yes; the footer uses the
  user's brand name.
- Email skills: a defined template flow, and conversation-level caching. After saving a
  template and rendering it with sample data, the agent shares the template's page in Brevo
  as a preview link and waits for the user's yes before any test send (the shared template
  link is an import link that opens a sign-in page, so it isn't used as a preview). A shared
  rules block (`shared/email-cache.md`) keeps the account, senders, sender domains and
  contact attributes for about 10 minutes, the brand kit and the templates the conversation
  touched for the whole conversation, per account and sub-account, with the refresh rules
  (unknown attribute, account switch, changes made in Brevo, 404, "refresh"). Evals added.
- Email skills, after a second end-to-end test: loops and conditions are described
  correctly (they work anywhere in HTML and inside one text block in drag-and-drop; only
  whole-section tags don't become the editor's display conditions or Dynamic content), with
  a "how to say it" line; writing HTML never needs a connection (offline mode), saving and
  previewing do; on a sub-account every call passes `subaccount_id`; after an update the
  template is rendered once with `params: {}`, the preview link shared again and a new yes
  asked before a test; a drag-and-drop copy of HTML that already passed needs one render; no
  second read-back after a sender fix; sender domains are part of the template flow's first
  step. Brand kit: no second read when the kit is cached, suggested values checked against
  the field rules (a web font gets a standard fallback), dropped fonts shown before a fonts
  save, button labels need 4.5:1 contrast, kit social links whose host doesn't match the
  network are flagged, `https://` preferred for the website, the kit's name used as the brand
  name, and the lookup described as changing no brand values. Evals added.
- Email skills use the Brevo MCP tools now live: `email-template-to-dnd` converts with
  `email_editor_convert_html` (JSON design, normalizer on by default; the user hears what
  `normalizer.dropped` and `normalizer.remaining` list before the save) and passes `design`
  unmodified as `newsletterContent`; saves always pass `type` (`template` for campaign and
  transactional templates) and `senderId`; campaign templates can be saved as designs. Brand
  kit: `branding_update_brand_website` (was `branding_update_website`),
  `branding_get_social_icons` before a custom-icon link, and sub-account kits through
  `subaccount_id`. Template previews need an existing contact's email when the template uses
  `contact.*` tags, and show the unsubscribe link empty. The per-tool "not on the server yet"
  notes and their fallbacks are gone; one connection rule covers a tool missing from a
  connection. `requires_tools` lists every tool each skill calls.
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
