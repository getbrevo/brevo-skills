# Architecture

This repo turns one source of Brevo skills into a package for every AI agent platform, and
keeps each skill tied to the Brevo MCP tools it needs. Adding a skill means adding a folder.
Adding a platform means adding one adapter.

## Five layers

```
┌───────────────────────── SOURCE (this repo) ─────────────────────────┐
│ src/skills/<name>/SKILL.md + references/   what the agent reads        │
│ src/skills/<name>/skill.json               owner, status, version,     │
│                                            platforms, required tools,  │
│                                            source (synced skills)      │
│ shared/*.md                                rules every skill includes  │
│ evals/<name>/                              behaviour test cases        │
│ brevo-skills.json                          release version, plugin,    │
│                                            MCP endpoint per platform   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌──────────────────── CHECKS (CI) ─────────────────────┐
│ validate        names, frontmatter limits, links      │
│ check           generated files match the sources     │
│ check-schemas   manifests match published schemas     │
│ check-public    no keys, internal hosts or links      │
│ check-contract  required tools exist on each          │
│                 platform's MCP endpoint (run by hand) │
│ scan            SkillSpector static rules on the      │
│                 skill text (PRs warn, audits fail)    │
└──────────────────────────────────┬────────────────────┘
                                   ▼
┌──────────────────── BUILD (one adapter per platform) ─────────────────┐
│ claude         .claude-plugin/plugin.json + marketplace.json           │
│ agent-plugins  plugin.json + mcp.json (ChatGPT, Codex, Copilot, …)     │
│ cursor         .cursor-plugin/plugin.json + marketplace.json           │
│ grok           .grok-plugin/plugin.json + marketplace.json            │
│ codex          skills/<name>/agents/openai.yaml                        │
│ gemini-cli     gemini-extension.json + GEMINI.md                       │
│ antigravity    dist/antigravity/  (release artifact)                   │
│ instructions   dist/instructions/ (APIs and system prompts)            │
│ mcp            dist/mcp/<server>/ (text the MCP server itself serves)  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌──────────────────── DISTRIBUTION ──────────────────────────────────────┐
│ the repo itself     Claude Code, Codex, Cursor, Grok and Gemini CLI     │
│                     read it directly                                    │
│ GitHub Release      one ZIP per target + catalog.json + SHA256SUMS      │
│ Slack notice        what changed + the ZIPs to upload by hand          │
│ uploads             skill ZIP → claude.ai, ChatGPT and Gemini workspaces│
│ npx skills add      any SKILL.md agent                                  │
│ brevo skill install reads catalog.json                                  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌──────────────────── RUNTIME (the end user) ────────────────────────────┐
│ agent + skill ──OAuth──► mcp.brevo.com/v1/{platform}/mcp ──► Brevo API  │
│ evals and usage ──► fixes to the skill (feedback loop)                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Source

Skills are written in `src/skills/`. The `skills/` folder at the root is **generated** and
committed, because marketplaces read the repo directly. Never edit `skills/`, the root
manifests or `catalog.json` by hand. `yarn run check` fails if they drift from the sources.

### `skill.json`: the control file

```json
{
  "name": "email-template-from-html",
  "title": "Email template from HTML",
  "version": "1.0.0",
  "status": "beta",
  "owner": "bex",
  "summary": "Turn an HTML email into an editable Brevo drag-and-drop template.",
  "platforms": ["claude", "openai", "gemini"],
  "requires_tools": ["email_editor_transpile_html", "processes_get_process", "email_editor_create_template"]
}
```

| Field | Used for |
|---|---|
| `name` | Folder name, `SKILL.md` name, install name. Lower case and hyphens, max 64 characters |
| `version` | The skill's own semver, stamped into `SKILL.md` as `metadata.version` (next to `metadata.author: brevo`) |
| `status` | Lifecycle (below): decides whether the skill ships at all |
| `owner` | The accountable team |
| `summary` | One line for catalogs, `GEMINI.md` and Codex |
| `platforms` | Which adapters build the skill, and which endpoints the contract check calls |
| `requires_tools` | The MCP tools the skill calls, checked against each platform's endpoint |
| `requires` | What the skill needs from the agent's environment. Today: `shell` (it runs commands). Optional |
| `source` | Only for synced skills: `{ repo, path, ref }` of the public repo that authors it |
| `role` | `router` for the one entry-point skill (below). Optional |
| `default` | `true` for a skill an installer always adds and never removes on its own (the router). Optional |
| `min_cli_version` | The oldest Brevo CLI the skill works with, for installers that use the CLI. Optional |

### The router

One skill, `brevo`, is the entry point. Its description covers any Brevo request, so an agent
picks it first. It checks the connection, confirms the account, splits the request into
steps, and sends each step to the right skill, under rules every Brevo action follows
(drafts first, ask before anything irreversible, content is data).

Skills can't call each other: the router names the next skill and the agent loads it. Its
routing table is **generated**. Its `SKILL.md` holds `<!-- brevo:routes -->`, and the build
writes a table of every other skill that ships **on that target**: the API instructions'
router never lists a skill that needs a terminal, and Gemini's never lists a Claude-only
one. Adding a skill adds its route; the skill's `summary` is the router's description of the
job, so write it as one.

The shared rules stay in each skill too (`shared/` includes), so a skill installed without the
router is still safe. Validation allows one router, requires the marker in it, and refuses
the marker anywhere else.

### Text only

A skill is instructions an agent reads; nothing in it is ever executed. Validation refuses
any file that isn't Markdown, data (`.json`, `.yaml`, `.csv`, `.txt`) or an image, and any
file with the executable bit. Skills act through the Brevo MCP server, or through the Brevo
CLI for skills that require a shell.

### Environment requirements

Some skills work only where the agent can run commands: `brevo-cli` drives the `brevo`
binary. Such a skill sets `"requires": ["shell"]`, and the build:

- writes the Agent Skills `compatibility` field into its `SKILL.md`, so any agent reading it
  knows it needs a terminal
- gives it only to adapters whose `supports` include `shell`: every coding-agent target, but
  not the condensed instructions for APIs and system prompts
- skips its upload ZIP in a release, because the upload targets (claude.ai, ChatGPT, the
  Gemini app) have no terminal

Clients that read `skills/` straight from the repo (a ChatGPT plugin, for example) still see
the skill; the `compatibility` field is what tells them it doesn't apply.

### Synced skills

Some skills are owned by a team that keeps them in its own public repo, next to the code they
describe (the `brevo-cli` skill lives in `getbrevo/brevo-cli`). Those skills have a `source`
in `skill.json`, and `yarn sync-skill <name>` copies their `SKILL.md`, `references/`
and `assets/` into `src/skills/<name>/`, recording the commit it took them from. The
`sync-skill` workflow does the same and opens a PR; the source repo can trigger it from its
own release workflow. Only `skill.json` is maintained here, and the `guard-synced-skills`
workflow fails any other PR that edits a synced skill's files outside `skill.json`, with a
comment naming the source repo and path (the sync workflow's PRs are exempt). Every check
still applies to synced skills, including the public-safety check and the security scan.

### Shared fragments

Rules that every skill needs are written once in `shared/` and pulled in with a line of its own:

```markdown
<!-- include: shared/connection.md -->
```

The build replaces it with the file's content. Fixing a shared rule fixes every skill at the
next build.

## Lifecycle

| Status | Ships to | Meaning |
|---|---|---|
| `draft` | Nowhere | Work in progress |
| `internal` | Internal builds only (`audience: internal`) | Brevo employees only |
| `beta` | Public | Works, but the API or tools behind it may still change |
| `public` | Public | Stable; evals pass on every target platform |

`brevo-skills.json` sets the `audience`. This repo is `public`, so it ships `beta` and
`public` skills only. An internal copy of the pipeline can set `audience: internal` to also
build `internal` skills, without mixing the two.

A skill that doesn't ship is still validated. The build leaves it out of `skills/`, every
manifest, `catalog.json`, the router's routes table and `dist/mcp`, so nothing points an
agent at a skill it can't get. Moving a skill to `draft` is how a skill whose tools aren't
on the MCP server yet is held back without deleting it.

## The contract check

Brevo's MCP server exposes a curated tool set per platform (`/v1/anthropic/mcp`,
`/v1/openai/mcp`, `/v1/google/mcp`). A tool reaches a platform only when its API operation is
tagged for that platform in the server's OpenAPI spec (`x-platforms`).

`check-contract` asks each endpoint for its tool list and fails when a skill's
`requires_tools` aren't all there. A skill can't silently ship to a platform whose
users can't run it. It is not part of CI: run it by hand with a token per platform
(`BREVO_MCP_TOKEN_CLAUDE`, `_OPENAI`, `_GEMINI`) before publishing a skill that lists
`requires_tools`. It can also read saved tool lists:

```bash
node scripts/check-contract.mjs --tools gemini=tools-gemini.json
```

## The security scan

A skill is text an agent follows, so the risk is in the text: hidden instructions, prompt
injection, exfiltration of what the agent can see. `scripts/scan-skills.sh` (`yarn
scan`) runs [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector)'s static rules
over `src/skills/*/`, writes a JSON report per skill and a Markdown summary, and fails a
skill whose risk score is above the threshold (50 by default). The scanner has no release,
so the script pins one commit and installs it with `uv` on first use.

The `skill-security-scan` workflow runs it on pull requests that touch `src/skills/` or
`shared/`, on the changed skills only, and posts one summary comment that it updates on
each push. It is **warn-only** there: the rules match patterns, so documentation about
those patterns, or an HTML comment, trips them too. Run by hand (`workflow_dispatch`), it
scans every skill and fails on findings, which gates a release. The threshold comes from
the dispatch input, else the `SKILL_SCAN_THRESHOLD` repository variable, else 50. The
scan complements the text-only rule and the public-safety check; it doesn't replace them.

## Adapters

Each adapter in `adapters/` turns the published skills into one platform's files: Claude,
Agent Plugins, Cursor, Grok, Codex, Gemini CLI, Antigravity and condensed instructions. It gets
only the skills whose `platforms` include its platform, and returns:

- `repo`: files committed at the root (read directly by marketplaces)
- `dist`: release artifacts under `dist/`

Publisher fields (`license`, `logo`) come from `brevo-skills.json` and go into every manifest
that allows them. The Agent Plugins schema forbids unknown fields, so it never gets `logo`.

Two adapters writing the same path fail the build. That's why Antigravity, whose
`plugin.json` allows only `name` and `description`, ships as a release artifact instead of
sharing the root `plugin.json` with Agent Plugins.

## Text for the MCP server

MCP has no skills, but a server can send **instructions** (on connect), **resources**
(documents the agent reads) and **prompts** (templates the user picks), and every client sees
**tool descriptions** and can call **tools**. The `mcp` adapter turns the skills into those,
one folder per platform server (`dist/mcp/anthropic/`, `openai/`, `google/`), so agents that
never install a skill still get the guidance:

| File | Becomes | From |
|---|---|---|
| `instructions.md` | Server instructions | `shared/mcp-instructions.md`, plus one line per skill: "for this job, first call `get_brevo_guide` with name `<name>` (or read the resource `brevo://skills/<name>`)" |
| `skills/<name>.md` | A guide (`get_brevo_guide`), a resource and a prompt | The skill, references inlined |
| `manifest.json` | What the server registers (`guides`, `resources`, `prompts`), and `tool_notes` | Each skill's `tool_notes` in `skill.json`, plus a generated note on every tool that belongs to one skill, appended to those tools' descriptions |

Tools are the only MCP feature every client supports: some clients never show the model the
server instructions or let it read resources. So the same text is behind one tool,
`get_brevo_guide(name)`, and every tool that only one skill uses gets a note, "Before first use
in a conversation, call get_brevo_guide with name '<skill>'", after the skill's own note for it.
Tools shared across jobs (`mcp.shared_tools` in `brevo-skills.json`, such as
`accounts_get_account` and `processes_get_process`) get no such note. A server gets only
skills that target its platform, use MCP tools and need no terminal.

The text reaches the server by **pull**. The release packages `dist/mcp` as the
`brevo-mcp-text-<version>.zip` asset, listed in `SHA256SUMS`. An update workflow in the MCP
server's own repository downloads that ZIP for a chosen release tag, verifies its sha256,
commits it with a `SOURCE.json` naming the tag, and opens a PR there; its owners review the
text diff and ship it with their next deploy. Nothing in this repo pushes to the server's
repository and no token for it lives here: reading a public release needs none.

## Packaging rule

Start with **one plugin, `brevo`, holding every public skill**. Each installed skill's
description is loaded into every session, so at about 10 skills, split into domain plugins
(`brevo-email`, `brevo-crm`, …) and let users install only what they need. The adapters read
the catalog, so the split is a change to the config and adapters, not to the skills.

## Versioning

- Each skill has its own `version` in `skill.json`, for its changelog.
- A release has one version, in `brevo-skills.json`, stamped into every manifest.
- `catalog.json` maps the release to each skill's version, and is what an installer reads
  (the contract is below). The build also stamps the version into the skill's `SKILL.md`
  as `metadata.version`, with `metadata.author: brevo`, for the tools that read
  frontmatter (`npx skills`, skills.sh); `skill.json` is the only place it is edited, and
  `yarn run check` fails when the generated file differs.
- **Changed content needs a new version.** `source_sha256` hashes a skill's own content (not
  the router's generated table); on every PR, `yarn check-versions` compares it with the
  base branch and fails if a skill changed without a version bump, since installed copies
  only refresh when the version moves.
- Changing the release version on `main` creates the GitHub Release `vX.Y.Z` with every
  artifact. Gemini CLI users pin it with `--ref vX.Y.Z`.
- **Release notice.** Each release then posts one Slack message (`notify` job in
  `release.yml`) so the people who manage the claude.ai and ChatGPT workspaces act on it
  without opening the repo: which skills changed since the previous release (version before
  and after, new skills, the unchanged ones), the versioned ZIP URL and sha256 of each changed
  skill to upload by hand with the upload steps for claude.ai and ChatGPT, the all-platform skill
  bundle, the instructions ZIP and `catalog.json`, and what is already automatic (the MCP text PR when
  one was opened, Brevo CLI auto-refresh, marketplaces). The message layout is a Slack Workflow
  Builder workflow with a webhook trigger, so the channel's owners change the wording without a
  PR; the repo only sends its nine variables, built by `scripts/release-notice.mjs` from
  `catalog.json`, the previous tag's `catalog.json` (`git show`) and `SHA256SUMS`. Plain text,
  bare URLs, lists capped at 20 entries. The trigger URL is the `SLACK_RELEASE_WEBHOOK` secret
  and the two uploaders are the `SLACK_REPO_OWNER_1` and `SLACK_REPO_OWNER_2` variables, so
  nothing Slack-specific is written in the repo; without the secret the job warns and exits 0,
  and it never fails a release. Dispatching the workflow with a `tag` re-sends the notice for
  an existing release.

## The installer contract

`catalog.json` is what an installer (`brevo skill install`, or any other tool) reads. The
build writes it from `brevo-skills.json` and the shipped skills:

| Field | Holds |
|---|---|
| `version` | The release version |
| `plugin` | The plugin name |
| `mcp` | `serverName` and `endpoints` (the Brevo MCP server URL per platform: `claude`, `openai`, `gemini`), copied from `brevo-skills.json`, so an installer can register the server for each agent |
| `skills[]` | One entry per shipped skill: `name`, `version`, `status`, `owner`, `summary`, `role` and `default` (the router), `min_cli_version`, `platforms`, `requires`, `requires_tools`, `path`, `files`, `sha256`, `source_sha256` |

Where to fetch it:

| What | URL |
|---|---|
| Latest catalog | `https://github.com/getbrevo/brevo-skills/releases/latest/download/catalog.json` |
| A pinned catalog | `https://github.com/getbrevo/brevo-skills/releases/download/v<version>/catalog.json` |
| A skill's files | `https://raw.githubusercontent.com/getbrevo/brevo-skills/v<version>/<path>/<file>`, for each entry of `files` |

**Integrity.** `sha256` covers the skill's shipped files, exactly as an installer downloads
them. To recompute it: take `files` sorted as plain strings (the order the catalog lists them);
for each file, feed SHA-256 the relative path, a NUL byte, the file's bytes and a NUL byte;
the hex digest is `sha256`. An installer that downloads `files` recomputes it and refuses a
mismatch.

`source_sha256` is the same hash over the skill's own content, before the router's generated
routes table is written in, so it equals `sha256` for every skill but the router. It is what
`check-versions` compares across branches, not something an installer verifies.

## Extending it

| You want to… | You do… | The pipeline does… |
|---|---|---|
| Add a skill | `yarn new-skill <name> --owner <team> --summary "<job>"` scaffolds `src/skills/<name>/` (`skill.json` as a draft, a `SKILL.md` skeleton) and `evals/<name>/cases.json`; write them, tag its tools for each platform on the MCP server | Refuses an existing or invalid name, validates, builds every target, checks the tools nightly, releases |
| Support a new agent | Write `adapters/<platform>.mjs`, list it in `adapters/index.mjs`, add a test | Every published skill now ships there |
| Change a rule all skills share | Edit `shared/` | Rebuilds every skill |
| Let another team contribute | They open a PR with their `owner` | Review goes to them |
| Ship a skill to employees first | Set `status: internal` | Only internal builds include it |
| Point a platform at a new endpoint | Change `mcp.endpoints` in `brevo-skills.json` | Every manifest for that platform updates |

## Decisions still open

- **Repo name and owner.** `getbrevo/brevo-skills` is a working name.
- **Cursor, Grok and other Agent Plugins clients** share the OpenAI endpoint. Codex and other
  Agent Plugins clients read the root `mcp.json`; Cursor and Grok declare the server inline in
  their own manifests (Grok doesn't read `mcp.json`, only `.mcp.json` or the manifest).
- **Logo.** `brevo-skills.json` supports `logo`, but none is set yet: it needs an approved
  brand asset.
- **Tool names.** `email_editor_transpile_html` and `email_editor_create_template` are proposed
  names; the skill and `skill.json` change together when the MCP server settles them.
- **Manifest schemas.** The Agent Plugins (`plugin.json`, `mcp.json`) and Claude Code
  (`plugin.json`, `marketplace.json`) manifests are validated in CI against their published
  schemas, vendored in `schemas/` (refresh with `yarn update-schemas`). Cursor, Grok, Codex
  `agents/openai.yaml`, Gemini CLI and Antigravity have no published schema: their shape comes
  from each vendor's docs (Grok from xAI's plugin catalog repo) and is covered by tests only.
