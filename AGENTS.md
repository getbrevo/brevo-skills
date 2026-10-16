# Working in this repo

Instructions for AI coding agents (and humans) editing `getbrevo/brevo-skills`. The rules
for writing a skill are in `CONTRIBUTING.md`; this file covers what an agent must not get
wrong.

## Edit sources only

- Write in `src/skills/<name>/`, `shared/`, `adapters/`, `scripts/`, `docs/` and
  `brevo-skills.json`. Everything else at the root (`skills/`, `plugin.json`, `mcp.json`,
  `.claude-plugin/`, `.cursor-plugin/`, `.grok-plugin/`, `gemini-extension.json`,
  `GEMINI.md`, `catalog.json`) is generated.
- After any change: `yarn build && yarn verify`. Commit sources and generated files
  together; `yarn run check` fails when they drift.
- Changing a skill's text means bumping `version` in its `skill.json` and adding a
  `CHANGELOG.md` line (`yarn check-versions` enforces it).
- Skills marked with `source` in `skill.json` are synced from another repo. Never edit
  their `SKILL.md` here; change the source repo and run the sync.

## This repo is public

Never write internal hostnames, private organisation names, tickets, people's names or
internal links anywhere in it, including commit messages and docs. `yarn check-public`
runs the generic rules; CI also runs a private pattern list.

## Size limits that apply to skills

A plugin folder has no size limit on any platform. What is limited is what reaches the
model and what chat apps accept as an upload. Keep every skill inside these:

| What | Limit | Enforced by |
|---|---|---|
| Skill `name` | 64 characters, lowercase, no host words (`anthropic`, `claude`, `openai`, `gemini`) | `yarn validate` |
| Skill `description` | 1,024 characters, starts with what it does and "Use when …" | `yarn validate` |
| Same description on claude.ai uploads | 200 characters | the `instructions` adapter writes the condensed form; keep the first sentence short |
| Description in Claude Code's skill list | truncated at 1,536 characters | platform; put the key use case first |
| `SKILL.md` | at most 500 lines; detail goes in `references/` | `yarn validate` |
| Skill text kept after Claude Code compacts context | first 5,000 tokens of each skill, 25,000 shared | platform; put the steps and safety rules near the top |
| MCP server instructions (`dist/mcp/*/instructions.md`) | 2,500 characters | `adapters/mcp.mjs` |
| ZIP upload to OpenAI (ChatGPT, Responses API) | 50 MB per ZIP, 500 files, 25 MB per file, exactly one `SKILL.md` | platform |
| ZIP upload to claude.ai | no published number (third parties report 50 MB) | platform |

Why these matter more than folder size: every installed skill's name and description is
loaded into the model's context on every turn; bodies load only when a skill is picked. The
cost of this plugin grows with the number of skills and their description length. Keep the
plugin to a small set of well-described skills, and split into domain plugins at about ten.

## Files and text only

Skills contain Markdown, JSON and images only. No scripts, no executables, no API keys, no
direct API calls: all actions go through the Brevo MCP server's tools.
