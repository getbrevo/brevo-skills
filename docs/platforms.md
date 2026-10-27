# Platforms

How each agent gets Brevo's skills and connects the Brevo MCP server. Checked against each
vendor's documentation in October 2026; re-check before announcing anything to customers.

## Endpoints

| Platform | MCP endpoint | Used by |
|---|---|---|
| Claude | `https://mcp.brevo.com/v1/anthropic/mcp` | Claude Code, claude.ai, Desktop, Cowork |
| OpenAI | `https://mcp.brevo.com/v1/openai/mcp` | ChatGPT, Codex, Cursor, Grok and other Agent Plugins clients |
| Gemini | `https://mcp.brevo.com/v1/google/mcp` | Gemini app, Gemini CLI, Antigravity |

Every endpoint uses OAuth 2.1 with PKCE and supports dynamic client registration. No manifest
in this repo holds a credential: each client runs OAuth against the endpoint itself.

## Install paths

| Agent | Install | Gets | Package |
|---|---|---|---|
| Claude Code (terminal, IDE, Desktop Code tab) | `/plugin marketplace add getbrevo/brevo-skills`, then `/plugin install brevo@brevo-skills` | Skills + MCP | `.claude-plugin/` |
| claude.ai / Desktop chat | Customize → Skills → + → Upload a skill (the skill ZIP); connector at claude.ai/customize/connectors | Skill + connector, added separately | Skill ZIP |
| Cowork (Claude Desktop) | Customize → Plugins → Add marketplace → `getbrevo/brevo-skills` | Skills + MCP | `.claude-plugin/` |
| Codex CLI / IDE | `codex plugin marketplace add getbrevo/brevo-skills`, then `/plugins`; `codex mcp login brevo` | Skills + MCP | `plugin.json` + `mcp.json` |
| ChatGPT | chatgpt.com/plugins → + → Add custom MCP server; skills through a plugin or a workspace upload | MCP; skills where the plan allows | Agent Plugin or skill ZIP |
| Gemini CLI | `gemini extensions install https://github.com/getbrevo/brevo-skills --ref vX.Y.Z`, then `/mcp auth brevo` | Skills + MCP | `gemini-extension.json` |
| Antigravity CLI | `agy plugin install <the antigravity ZIP from a release>` | Skills + MCP | `dist/antigravity/` |
| Gemini app | Settings → Skills → Upload; Settings → Connected Apps → Custom apps for MCP | Skill + MCP | Skill ZIP |
| Gemini Enterprise | Skills → Import (the skill ZIP); custom MCP data store with a manual OAuth client | Skill + MCP | Skill ZIP |
| Cursor | Plugin settings → add `getbrevo/brevo-skills` (Cursor's own manifest, or the Agent Plugins one) | Skills + MCP | `.cursor-plugin/` |
| Grok | Plugin install from `getbrevo/brevo-skills` | Skills + MCP | `.grok-plugin/` |
| Copilot, VS Code, Kiro | Their plugin flow, or connect the MCP endpoint | Skills + MCP | `plugin.json` + `mcp.json` |
| Any `SKILL.md` agent | `npx skills add getbrevo/brevo-skills` (`-a codex`, `-a gemini-cli`, …) | Skills only, no MCP config | `skills/` |
| OpenAI Responses API | Upload the skill ZIP to `POST /v1/skills`, attach it to the shell tool; MCP tool with your own token | Skill + MCP | Skill ZIP |
| Gemini API, Agents SDK, system prompts | Use the condensed instructions; MCP tool with your own token | Instructions + MCP | `dist/instructions/` |

## Add skills to a plugin that already exists

Some plugins are published or uploaded by hand: the ChatGPT plugin on OpenAI's platform, and a
plugin file uploaded to Claude. Their listing details (name, category, support, privacy and
terms links, example prompts) and their MCP connection live in that plugin, not in this repo,
so a release only has to supply the skills. The steps are the same on each:

1. Get the plugin package you published and unzip it.
2. Delete the plugin's `skills/` folder, unzip `brevo-skills-<version>.zip` from the release
   and put its `skills/` folder in the plugin. The ZIP holds every shipped skill and no
   manifest, so it never replaces the plugin's own. Deleting the old folder first removes
   skills that were dropped. The ZIP leaves out each skill's `agents/openai.yaml`, which is
   Codex metadata.
3. Raise `version` in the plugin's manifest, zip the plugin folder and upload it again.

For the ChatGPT plugin, [openai-plugin-update.md](openai-plugin-update.md) has the full steps.

| Platform | Get the package | Manifest to bump | Upload |
|---|---|---|---|
| ChatGPT | The plugin's page on the OpenAI platform | `plugin.json` | The same page |
| Claude (Cowork, claude.ai) | The folder or ZIP you uploaded, or the bundle from a release (`brevo-all-platform-skill-bundle-<version>.zip`) | `.claude-plugin/plugin.json` | Customize → Plugins, upload from a file |

The all-skills ZIP also holds skills that need a shell (`requires: ["shell"]`, such as
`brevo-cli`). Their `compatibility` field says they need a terminal. ChatGPT's upload checks
accepted such a skill, but how an agent without a terminal treats it is untested: delete that
skill's folder before uploading if the chat plugin shouldn't have it.

Claude Code, Codex, Cursor, Grok, Gemini CLI and Antigravity read this repo or the release
ZIP directly, so they have no separate copy to update. The Gemini app and Gemini Enterprise
take the skill ZIP alone (see the install table above).

## Update an installed copy

An agent with a shell can update the skills itself when asked ("update the Brevo skills"):

| Installed with | Command |
|---|---|
| Claude Code plugin | `claude plugin marketplace update brevo-skills`, then `claude plugin update brevo@brevo-skills`; restart Claude Code to apply |
| Codex plugin | `codex plugin marketplace upgrade` |
| `npx skills add` | `npx skills add getbrevo/brevo-skills` again |
| Brevo CLI | `brevo skill update` |

An upload to claude.ai or ChatGPT can't be updated by the agent: upload the new ZIP again.
Skills work best with the Brevo MCP server connected, so check that first.

## OpenAI Responses API / Agents SDK

Only tools reach the model there: server instructions, resources and prompts from the Brevo
MCP server don't. Two ways to get the guidance in anyway:

- Add the Brevo MCP tool to the request with a `server_description` such as "Before any
  Brevo job, call get_brevo_guide." The server's `get_brevo_guide` tool returns a skill's
  full text, and each job tool's description already says which guide to load first.
- Or paste `dist/instructions/<skill>.md` (from the instructions ZIP of a release) into the
  system prompt.

```json
{
  "type": "mcp",
  "server_label": "brevo",
  "server_url": "https://mcp.brevo.com/v1/openai/mcp",
  "server_description": "Before any Brevo job, call get_brevo_guide.",
  "authorization": "<the user's token>"
}
```

## Known limits

- **Skills that need a terminal** (`requires: ["shell"]`, such as `brevo-cli`) work only in
  coding agents: Claude Code, Codex, Cursor, Gemini CLI, Antigravity. They have no upload ZIP
  and no condensed instructions.
- **ChatGPT**: standalone skills work in the desktop app; skills inside a plugin also work on
  web and mobile. Plan availability differs by tier.
- **Gemini app**: custom MCP connections are limited to personal accounts in the US, 18+.
- **Gemini Enterprise**: no dynamic client registration; it needs a manually registered OAuth
  client.
- **Gemini CLI** was replaced by Antigravity CLI for free and Google One users in June 2026;
  Code Assist Standard and Enterprise keep it.
- **APIs** (OpenAI Responses, Gemini Interactions) don't run OAuth: the calling app supplies
  the user's token.

## Sources

- Claude Code: [plugins and marketplaces](https://code.claude.com/docs/en/plugin-marketplaces), [skills](https://code.claude.com/docs/en/skills.md), [MCP](https://code.claude.com/docs/en/mcp.md)
- Claude: [using skills](https://support.claude.com/en/articles/12512180-using-skills-in-claude), [Cowork plugins](https://claude.com/docs/cowork/guide/plugins)
- OpenAI: [ChatGPT skills](https://learn.chatgpt.com/docs/build-skills), [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [plugins](https://developers.openai.com/plugins/build/plugins), [connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt), [Responses API skills](https://developers.openai.com/api/docs/guides/tools-skills), [Responses API MCP](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)
- Google: [Gemini CLI skills](https://geminicli.com/docs/cli/skills/), [Gemini CLI extensions](https://geminicli.com/docs/extensions/reference/), [Gemini CLI MCP](https://geminicli.com/docs/tools/mcp-server/), [Antigravity plugins](https://antigravity.google/docs/plugins?tab=cli), [Gemini Enterprise skills](https://docs.cloud.google.com/gemini/enterprise/docs/skills), [ADK skills](https://adk.dev/skills/)
- Cursor: [plugins reference](https://cursor.com/docs/reference/plugins)
- Cross-platform: [Agent Plugins](https://agent-plugins.org/), [Agent Skills](https://agentskills.io/), [skills CLI](https://github.com/vercel-labs/skills)
