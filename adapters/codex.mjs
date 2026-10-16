// Codex skill metadata: skills/<name>/agents/openai.yaml declares the MCP server the skill
// needs, so Codex can offer to connect it when the skill is installed on its own
// (`$skill-installer`, `npx skills add … -a codex`) rather than through the plugin.
// Docs: https://learn.chatgpt.com/docs/build-skills

import { yaml } from './util.mjs';

export default {
  id: 'codex',
  platform: 'openai',
  supports: ['shell'],
  build({ config, skills }) {
    const repo = {};
    for (const skill of skills) {
      repo[`skills/${skill.name}/agents/openai.yaml`] = `${yaml({
        interface: {
          display_name: skill.meta.title ?? skill.name,
          short_description: skill.meta.summary,
        },
        dependencies: {
          tools: [
            {
              type: 'mcp',
              value: config.mcp.serverName,
              description: 'Brevo MCP server',
              transport: 'streamable_http',
              url: config.mcp.endpoints.openai,
            },
          ],
        },
      })}\n`;
    }
    return { repo };
  },
};
