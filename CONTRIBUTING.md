# Contributing

> **This repository is a published copy.** It is generated from the Brevo skills source and
> does not take pull requests: any opened here is closed automatically. Report a problem with
> an issue, and a security problem through the private advisory form (see `SECURITY.md`).
> The rest of this file is for the maintainers who change the source.

Requirements: Node 20 or later, then `yarn install` (one dev dependency: `ajv`, for the
schema check).

```bash
yarn verify   # validate + generated files in sync + schemas + public-safety check + tests
yarn build    # regenerate skills/, the root manifests, catalog.json and dist/
yarn scan     # static security scan of the skill text (needs uv, see below)
```

## Golden rules

1. **Edit sources, never generated files.** Sources: `src/`, `shared/`, `adapters/`,
   `brevo-skills.json`. Generated: `skills/`, `.claude-plugin/`, `.cursor-plugin/`,
   `.grok-plugin/`, `plugin.json`, `mcp.json`, `gemini-extension.json`, `GEMINI.md`,
   `catalog.json`. Run `yarn build` and commit both.
2. **This repo is public.** Every commit, PR title, PR description and review comment is
   world-readable. See [public-repo rules](#public-repo-rules). `yarn check-public`
   enforces what it can.
3. **Skills talk to Brevo only through the MCP server.** No scripts with API keys, no direct
   API calls.

## Public-repo rules

Before each commit and PR, review the staged diff and the PR text for:

- **Secrets:** API keys, OAuth client secrets, tokens, anything from a credentials file.
- **Internal details:** internal hostnames and service names, staging URLs, links to
  internal Slack, Notion or Jira, roadmap or customer information. A ticket may be named by
  its key; never paste its content.
- **Real data:** customer or account IDs, emails, names, IP addresses, real templates.

Use placeholders that keep the format: `xkeysib-test-…`, `example.com`,
`user@example.com`, fake UUIDs. Fixtures in `evals/` must be invented, never a customer's
email.

`yarn check-public` runs generic rules (keys, Slack and Notion links) everywhere. In CI it
also runs Brevo's list of internal names from the `PUBLIC_SAFETY_PATTERNS` variable: that list
is kept out of the code, since publishing it would leak what it protects. Maintainers can
run it locally with `PUBLIC_SAFETY_PATTERNS="$(cat patterns.txt)" yarn check-public`.

## Security scan

`yarn scan` runs [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) over the
skill text: prompt-injection patterns, hidden instructions, data exfiltration, and the like.
It needs [uv](https://docs.astral.sh/uv/); the first run installs the scanner, pinned to one
commit in `scripts/scan-skills.sh`, into `scripts/.skillspector-venv/`. Reports go to
`scripts/.skillspector-reports/`.

```bash
yarn scan                                   # every skill
yarn scan --changed origin/main          # the skills your branch changed
yarn scan src/skills/brevo-cli           # one skill
```

A skill fails above risk score 50 (`--threshold N` changes it). On a pull request, CI runs
the same scan on the changed skills and posts the summary as a comment, **without blocking
the merge**: the static rules flag patterns in documentation too (an HTML comment reads as a
hidden instruction), so read each finding and fix the true positives. The full scan can be
run by hand from the Actions tab before a release, and that run fails on findings.

## Add a skill

1. Scaffold it:

   ```bash
   yarn new-skill <name> --owner <team> --summary "<job it does>" \
     [--platforms claude,openai,gemini] [--tools tool_a,tool_b] [--shell]
   ```

   It creates `src/skills/<name>/` (name in lower case, hyphens) and `evals/<name>/`, then
   validates them:
   - `skill.json`: the [fields](docs/architecture.md#skilljson-the-control-file) from the
     options, with `"status": "draft"` and `"version": "1.0.0"`.
   - `SKILL.md`: frontmatter with `name` (same as the folder) and a `description` to finish
     (what it does and when to use it, max 1024 characters), then the section skeleton the
     skills share, with `<!-- include: shared/connection.md -->` and the output rules.
   - `evals/<name>/cases.json` with one example case to replace (see
     [evals](evals/README.md)).

   Add `references/` for longer material the skill links to, loaded only when needed. In
   Claude Code, the repo-level `/add-brevo-skill` skill walks through these steps.
2. Write `SKILL.md` and the eval cases.
3. List the MCP tools it calls in `requires_tools`, and make sure they're tagged for each
   platform in `platforms` on the MCP server. If it runs commands rather than (or as well as)
   MCP tools, add `"requires": ["shell"]` so it stays out of chat-only targets. Add
   `tool_notes` (tool name → one sentence, at most 300 characters) for any rule that must
   reach every agent: it's appended to that tool's description on the MCP server. A tool
   that only your skill uses also gets a generated "call `get_brevo_guide` first" note; a
   tool many jobs share (polling, account lookup) belongs in `mcp.shared_tools` in
   `brevo-skills.json` instead, so it stays free of skill pointers.
4. Write its `summary` as the job it does ("Turn an HTML email into an editable template"):
   the build puts it in the router's routing table, which is how agents find the skill.
5. `yarn build && yarn verify`, then open a PR.
6. Move to `beta` when it works end to end, and to `public` when evals pass on every
   platform it targets.

**Changing a skill:** bump its `version` in `skill.json` whenever its content changes, and
add a `CHANGELOG.md` line. CI fails a PR that changes a skill without a bump
(`yarn check-versions`), because installed copies only refresh when the version moves.
Skills are text only: no scripts or executables.

Writing rules (`yarn validate` checks the first three):

- `SKILL.md` is at most 500 lines; move detail into `references/`, loaded only when needed.
- The `description` says what the skill does **and when to use it** ("Use when …"): agents
  choose a skill from its description alone. At most 1024 characters.
- Names don't contain a host's reserved word (`anthropic`, `claude`, `openai`, `gemini`).
- Don't restate what a model already knows; spend the words on Brevo-specific facts,
  order of steps, and the safety rules.
- Link to references directly from `SKILL.md`; a reference shouldn't send the agent on to
  another reference.

## Add a skill that lives in another repo

When a team keeps its skill next to its own code (as `getbrevo/brevo-cli` does), sync it
instead of copying it by hand:

1. Create `src/skills/<name>/skill.json` with the usual fields plus
   `"source": { "repo": "getbrevo/<repo>", "path": "<folder with SKILL.md>", "ref": "main" }`.
   The source repo must be public, and its `SKILL.md` `name` must match `<name>`.
2. `yarn sync-skill <name>`: copies `SKILL.md`, `references/` and `assets/`, and pins
   `source.ref` to the commit it took them from.
3. `yarn build && yarn verify`, then open a PR.

Later updates: run the **Sync skill from source repo** workflow (or have the source repo run
`gh workflow run sync-skill.yml -R getbrevo/brevo-skills -f skill=<name> -f ref=<sha>`), and
review the PR it opens. Never edit a synced skill's `SKILL.md` here: CI fails a PR that
changes anything but `skill.json` in a synced skill's folder, and comments where to edit
instead (the sync workflow's own PRs are exempt).

## Refresh the manifest schemas

`yarn update-schemas` downloads the latest Agent Plugins and Claude Code schemas into
`schemas/`. Review the diff, run `yarn build && yarn check-schemas`, and fix the
adapters if a schema changed.

## Add a platform

1. Write `adapters/<platform>.mjs` exporting `{ id, platform, build(ctx) }`:
   - `platform`: `claude`, `openai`, `gemini`, or `null` for every published skill
   - `build({ config, skills, version, shared })` returns `{ repo, dist }`, maps of path to
     content
2. List it in `adapters/index.mjs`.
3. Add a test in `tests/build.test.mjs` for the files it writes.
4. If it needs its own endpoint, add it to `mcp.endpoints` in `brevo-skills.json` and to
   `PLATFORMS` in `scripts/lib/skills.mjs`.

## Release

Change `version` in `brevo-skills.json` (semver), run `yarn build`, commit, and merge to
`main`. The release workflow verifies, packages and creates the GitHub Release `vX.Y.Z` with:

| Artifact | For |
|---|---|
| `<skill>-<version>.zip` | claude.ai, ChatGPT and Gemini uploads, the OpenAI skills API |
| `brevo-skills-<version>.zip` | Every shipped skill and nothing else (`skills/` at the root, without `agents/` and the generated `README.md`), to add to an existing ChatGPT or Claude plugin by hand |
| `brevo-all-platform-skill-bundle-<version>.zip` | Offline installs of every platform's plugin files and the skills (Claude, Agent Plugins, Cursor, Grok, Gemini CLI) |
| `brevo-antigravity-<version>.zip` | Antigravity CLI |
| `brevo-instructions-<version>.zip` | APIs and system prompts |
| `catalog.json`, `SHA256SUMS` | The Brevo CLI and integrity checks |

Bump a skill's own `version` in `skill.json` whenever its behaviour changes.
