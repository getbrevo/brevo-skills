// Claude Code plugin + marketplace. Claude Code reads both straight from the repo:
//   /plugin marketplace add getbrevo/brevo-skills
//   /plugin install brevo@brevo-skills
// Skills are discovered from skills/ at the plugin root; the MCP server is declared inline.
// Format: https://code.claude.com/docs/en/plugin-marketplaces

import { json, publisherFields } from './util.mjs';

export default {
  id: 'claude',
  platform: 'claude',
  supports: ['shell'],
  build({ config, version }) {
    const { plugin, mcp } = config;
    return {
      repo: {
        '.claude-plugin/plugin.json': json({
          $schema: 'https://json.schemastore.org/claude-code-plugin-manifest.json',
          name: plugin.name,
          version,
          description: plugin.description,
          ...publisherFields(config),
          mcpServers: {
            [mcp.serverName]: { type: 'http', url: mcp.endpoints.claude },
          },
        }),
        '.claude-plugin/marketplace.json': json({
          $schema: 'https://json.schemastore.org/claude-code-marketplace.json',
          name: config.repository.split('/').pop(),
          owner: plugin.author,
          metadata: { description: plugin.description },
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
