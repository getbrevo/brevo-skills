# Brevo skills

[![Latest release](https://img.shields.io/github/v/release/getbrevo/brevo-skills)](https://github.com/getbrevo/brevo-skills/releases)
[![License: MIT](https://img.shields.io/github/license/getbrevo/brevo-skills)](LICENSE)

Skills that teach AI agents to work with Brevo, packaged for Claude, ChatGPT, Codex, Gemini
and any agent that reads `SKILL.md`. Each skill drives the
[Brevo MCP server](https://developers.brevo.com), which handles sign-in with OAuth: no API
keys to copy anywhere.

**Using Claude?** Add the [Brevo connector](https://claude.com/marketplace/connectors/brevo)
from Claude's directory to connect your Brevo account, then install these skills so Claude
knows how to use it well.

<!-- skills-table:start -->
| Skill | Status | What it does | Source |
|---|---|---|---|
| [`brevo-cli`](skills/brevo-cli/SKILL.md) | public | Use the Brevo Developer CLI to manage OAuth apps, UI apps and Brevo Functions. | Synced from [getbrevo/brevo-cli](https://github.com/getbrevo/brevo-cli) |
| [`email-brand-kit`](skills/email-brand-kit/SKILL.md) | public | Read the account's brand kit (logo, colours, fonts, social links) as email styles, and set it up or change it after the user approves. | Brevo |
| [`email-test-send`](skills/email-test-send/SKILL.md) | beta | Send a test of one email template to addresses the user chooses. | Brevo |
<!-- skills-table:end -->

Versions below 1.0 may still change; skills marked beta may change more.

## What you can ask

| Skill | Try asking |
|---|---|
| `email-brand-kit` | "Show my Brevo brand kit" · "Set up my brand kit from example.com" |
| `email-test-send` | "Send a test of my welcome template to me@example.com" |
| `brevo-cli` | "Scaffold a Brevo OAuth app" · "Deploy my Brevo Function" |

## Install

Most people need one of the first two rows.

| Agent | How |
|---|---|
| Claude Code | `/plugin marketplace add getbrevo/brevo-skills`, then `/plugin install brevo@brevo-skills` |
| Any other agent | `npx skills add getbrevo/brevo-skills` |

<details>
<summary>Codex, Cursor, Grok, Gemini CLI, the Brevo CLI, and uploads to claude.ai, ChatGPT and Gemini</summary>

| Agent | How |
|---|---|
| Codex | `codex plugin marketplace add getbrevo/brevo-skills`, then `/plugins` |
| Cursor | Add the plugin from `getbrevo/brevo-skills` in Cursor's plugin settings |
| Grok | Install the plugin from `getbrevo/brevo-skills` |
| Gemini CLI | `gemini extensions install https://github.com/getbrevo/brevo-skills` |
| claude.ai, ChatGPT, Gemini (upload) | Download the skill ZIP from the [latest release](https://github.com/getbrevo/brevo-skills/releases) and upload it in your agent's skill settings |
| Brevo CLI | `npm i -g @getbrevo/cli`, then `brevo skill install` |

</details>

Every path, with each platform's limits: [docs/platforms.md](docs/platforms.md).

## Keep your skills current

An agent that already has a skill (plugin, `npx skills add`, `brevo skill install` or an upload)
uses it directly and does not call the Brevo MCP server for the same text. An agent connected to
the server can check its copies: `list_brevo_guides` with the versions of the skills it has
returns `current` or `stale` for each, and how to update a stale one. A skill that is not
installed can be read through the server's `get_brevo_guide` tool, which always returns the
current text.

To update: `brevo skill update` (checks every file against the release hash), refresh the
plugin in your agent, or upload the new ZIP from the latest release. `brevo skill check` lists the
copies that are behind.

## How this repo works

The skills are written and tested in Brevo's source repository, and each release publishes
them here: `skills/<name>/` (the skills), the plugin manifests (`.claude-plugin/`,
`.cursor-plugin/`, `.grok-plugin/`, `plugin.json`, `mcp.json`, `gemini-extension.json`,
`GEMINI.md`), `catalog.json`, which the Brevo CLI reads, `brevo-skills.json` and the changelog.
Those files, and the skills table above, are overwritten at each release, so open an issue to
suggest a change instead of editing them. The rest of this repository (this README, the
guides in `docs/`, the issue templates) is edited here by pull request. A release also attaches
the skill ZIPs and `SHA256SUMS`. How the skills reach agents: [docs/distribution.md](docs/distribution.md).

## Feedback, releases and security

- **Found a problem, or want a skill we don't have?** Open an
  [issue](https://github.com/getbrevo/brevo-skills/issues/new/choose). See
  [CONTRIBUTING.md](CONTRIBUTING.md) for what is edited here.
- **What changed?** See the [releases](https://github.com/getbrevo/brevo-skills/releases) and
  the [CHANGELOG](CHANGELOG.md).
- **Security problem?** Report it privately as described in [SECURITY.md](SECURITY.md), never
  in a public issue.

Licensed under [MIT](LICENSE).
