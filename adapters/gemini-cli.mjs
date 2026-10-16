// Gemini CLI extension: gemini-extension.json + GEMINI.md at the repo root, skills/ beside them.
//   gemini extensions install https://github.com/getbrevo/brevo-skills --ref vX.Y.Z
// Docs: https://geminicli.com/docs/extensions/reference/

import { json, GENERATED_NOTE } from './util.mjs';

export default {
  id: 'gemini-cli',
  platform: 'gemini',
  supports: ['shell'],
  build({ config, skills, version, shared }) {
    const { plugin, mcp } = config;
    const list = skills
      .map((s) => `- **${s.name}** (\`skills/${s.name}/SKILL.md\`): ${s.meta.summary}`)
      .join('\n');
    const context = `<!-- ${GENERATED_NOTE} -->

# Brevo

This extension connects the Brevo MCP server (\`${mcp.serverName}\`) and ships these skills:

${list}

${skills.some((s) => s.meta.role === 'router') ? `For any Brevo request, start with the \`${skills.find((s) => s.meta.role === 'router').name}\` skill: it checks the account and picks the skill for each step.` : 'When a request matches a skill, read its \`SKILL.md\` and follow it step by step.'}

${shared.connection}
`;
    return {
      repo: {
        'gemini-extension.json': json({
          name: plugin.name,
          version,
          description: plugin.description,
          contextFileName: 'GEMINI.md',
          mcpServers: {
            [mcp.serverName]: { httpUrl: mcp.endpoints.gemini },
          },
        }),
        'GEMINI.md': context,
      },
    };
  },
};
