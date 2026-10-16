// Grok Build plugin + marketplace. Grok finds the manifest at .grok-plugin/plugin.json (then
// .claude-plugin/plugin.json), skills in skills/, and MCP servers in the manifest's
// `mcpServers` or else a root `.mcp.json`. It does not read mcp.json, so the server is
// declared inline, in the shape Claude Code uses (`type: "http"`).
// xAI documents the layout in its plugin catalog: https://github.com/xai-org/plugin-marketplace
// (README and scripts/plugin_catalog.py); there is no published JSON schema.

import { json, publisherFields } from './util.mjs';

export default {
  id: 'grok',
  platform: null,
  supports: ['shell'],
  build({ config, version }) {
    const { plugin, mcp } = config;
    return {
      repo: {
        '.grok-plugin/plugin.json': json({
          name: plugin.name,
          version,
          description: plugin.description,
          ...publisherFields(config),
          mcpServers: {
            [mcp.serverName]: { type: 'http', url: mcp.endpoints.openai },
          },
        }),
        '.grok-plugin/marketplace.json': json({
          name: config.repository.split('/').pop(),
          description: plugin.description,
          owner: plugin.author,
          plugins: [
            {
              name: plugin.name,
              source: './',
              description: plugin.description,
              version,
              homepage: plugin.homepage,
              keywords: plugin.keywords,
            },
          ],
        }),
      },
    };
  },
};
