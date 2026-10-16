// Antigravity CLI (`agy`) plugin. Its plugin.json allows only `name` and `description`
// (additionalProperties: false), so it can't share the root plugin.json with Agent Plugins.
// It ships as a release artifact instead: dist/antigravity/<plugin>/.
//   agy plugin install <url or path>
// Docs: https://antigravity.google/docs/plugins?tab=cli

import { json } from './util.mjs';

export default {
  id: 'antigravity',
  platform: 'gemini',
  supports: ['shell'],
  build({ config, skills }) {
    const { plugin, mcp } = config;
    const base = `antigravity/${plugin.name}`;
    const dist = {
      [`${base}/plugin.json`]: json({ name: plugin.name, description: plugin.description }),
      [`${base}/mcp_config.json`]: json({
        mcpServers: { [mcp.serverName]: { serverUrl: mcp.endpoints.gemini } },
      }),
    };
    for (const skill of skills) {
      for (const [rel, content] of Object.entries(skill.output)) {
        dist[`${base}/skills/${skill.name}/${rel}`] = content;
      }
    }
    return { dist };
  },
};
