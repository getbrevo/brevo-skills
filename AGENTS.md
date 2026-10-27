# Working in this repo

Instructions for AI coding agents (and humans) editing `getbrevo/brevo-skills`.

## What you can and cannot edit

This repository is where the Brevo skills are published. Brevo writes and tests them in its
own source repository, and every release overwrites these files:

- `skills/`, `.claude-plugin/`, `.cursor-plugin/`, `.grok-plugin/`, `plugin.json`, `mcp.json`,
  `gemini-extension.json`, `GEMINI.md`, `catalog.json`, `brevo-skills.json`, `CHANGELOG.md`
- the skills table in `README.md`, between the `skills-table` markers

Don't edit those: the next release overwrites the change. To change a skill, open an issue.

Everything else is this repository's own and is edited here by pull request: the rest of
`README.md`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`, `docs/`,
`.github/`, `openai-plugin/` and `scripts/`. Don't remove the two `skills-table` markers from
`README.md`: the release fails without them.

## Using the skills

- A skill is text an agent reads. It acts only through the Brevo MCP server's tools: no
  scripts, no API keys, no direct API calls.
- If a skill is already loaded (plugin, `npx skills add`, `brevo skill install` or an upload),
  use it. Don't fetch the same text again with the server's `get_brevo_guide` tool.
- Check that your copy is current with the server's `list_brevo_guides` (pass the versions in
  each `SKILL.md` metadata). Update with `brevo skill update`, a plugin refresh or the new ZIP.

## Building the ChatGPT / Codex plugin ZIP

The plugin on OpenAI's platform is uploaded by hand. After a release, build its ZIP with
`scripts/build-openai-plugin.sh --app-id <the plugin's name on the platform>` (or set
`OPENAI_APP_ID`). The script takes
the release's `skills/`, adds the plugin's own files from `openai-plugin/` and the skills in
`openai-plugin/extras/` that the release doesn't have yet, and writes `brevo-plugin-<version>.zip`.
Don't put the plugin's name in the repo, and don't add a skill under `skills/` by hand: put it in
`openai-plugin/extras/` until a release ships it, then delete it there. Steps and options:
[docs/openai-plugin-update.md](docs/openai-plugin-update.md).

## This repo is public

Never write internal hostnames, private organisation names, tickets, people's names or
internal links anywhere in it, including commit messages and docs.
