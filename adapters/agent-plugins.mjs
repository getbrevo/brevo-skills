// Agent Plugins package (root plugin.json + mcp.json + skills/), read by ChatGPT, Codex,
// Cursor, Grok, GitHub Copilot, VS Code and Kiro.
//   codex plugin marketplace add getbrevo/brevo-skills   then /plugins
// Spec and schemas: https://agent-plugins.org/  ·  OpenAI: https://developers.openai.com/plugins/build/plugins
// These clients share one endpoint, the OpenAI tool set on mcp.brevo.com.
// They read skills/ from the repo, so they get every published skill; chat-only clients
// (ChatGPT) learn from a skill's `compatibility` field when it needs a shell.

import { json } from './util.mjs';

export default {
  id: 'agent-plugins',
  platform: 'openai',
  supports: ['shell'],
  build({ config, version }) {
    const { plugin, mcp } = config;
    return {
      repo: {
        // The schema forbids unknown fields, so no logo here.
        'plugin.json': json({
          $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
          name: plugin.name,
          version,
          description: plugin.description,
          author: plugin.author,
          homepage: plugin.homepage,
          repository: config.repository,
          ...(config.license ? { license: config.license } : {}),
          keywords: plugin.keywords,
        }),
        'mcp.json': json({
          $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
          mcpServers: {
            [mcp.serverName]: { type: 'streamable-http', url: mcp.endpoints.openai },
          },
        }),
      },
    };
  },
};
