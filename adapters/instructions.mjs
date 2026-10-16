// Condensed instructions: one self-contained Markdown file per skill, with its references
// inlined. For hosts that can't load a skill folder: the OpenAI Responses API without the
// shell tool, the Gemini API, the Agents SDK, or a system prompt. These hosts have no
// terminal, so skills that require a shell are left out (supports: []).

import { GENERATED_NOTE, inlineSkill } from './util.mjs';

export default {
  id: 'instructions',
  platform: null,
  supports: [],
  build({ config, skills, version }) {
    const endpoints = Object.entries(config.mcp.endpoints)
      .map(([platform, url]) => `- ${platform}: ${url}`)
      .join('\n');
    const dist = {};
    for (const skill of skills) {
      dist[`instructions/${skill.name}.md`] = `<!-- ${GENERATED_NOTE} -->
<!-- ${skill.name} ${skill.meta.version} (release ${version}) -->

Connect the Brevo MCP server before using these instructions. Endpoints by platform:
${endpoints}

${inlineSkill(skill)}`;
    }
    return { dist };
  },
};
