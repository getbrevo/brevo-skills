// Cursor plugin + marketplace. Cursor also loads the Agent Plugins package at the root, but
// its own manifest adds a display name and logo for the Cursor marketplace. Skills come from
// skills/ (Cursor's default discovery); the MCP server is declared inline, which replaces the
// default root mcp.json for Cursor.
// Docs: https://cursor.com/docs/reference/plugins

import { json, publisherFields } from './util.mjs';

export default {
  id: 'cursor',
  platform: null,
  supports: ['shell'],
  build({ config, version }) {
    const { plugin, mcp } = config;
    return {
      repo: {
        '.cursor-plugin/plugin.json': json({
          name: plugin.name,
          displayName: plugin.displayName,
          description: plugin.description,
          version,
          ...publisherFields(config),
          mcpServers: { [mcp.serverName]: { url: mcp.endpoints.openai } },
        }),
        '.cursor-plugin/marketplace.json': json({
          name: config.repository.split('/').pop(),
          owner: plugin.author,
          plugins: [{ name: plugin.name, source: './' }],
        }),
      },
    };
  },
};
