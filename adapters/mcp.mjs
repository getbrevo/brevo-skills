// Text for the Brevo MCP server itself, so agents that never install a skill still get the
// guidance: one folder per platform server (dist/mcp/<server>/), each with
//   instructions.md  always-on server instructions: the shared rules, plus a pointer to the
//                    guide to load for each job (that's what makes a guide skill-like)
//   skills/<name>.md the full skill (references inlined), served by the get_brevo_guide tool,
//                    as a resource and as a prompt
//   manifest.json    what the server registers: instructions, guides, resources, prompts, and
//                    tool_notes (lines appended to tool descriptions, which every client sees)
// Tools are the one MCP feature every client supports: many clients drop server instructions
// and resources, so the full text is also behind a tool, `get_brevo_guide`, and every tool
// that belongs to a single skill gets a note telling the agent to call it first.
// A platform server only gets skills that target its platform and need no terminal, so each
// server's text matches the tools it exposes. The MCP server's generator reads these files.

import { json, GENERATED_NOTE, inlineSkill } from './util.mjs';

export const RESOURCE_PREFIX = 'brevo://skills/';
export const GUIDE_TOOL = 'get_brevo_guide';
// Clients send instructions with every request; keep them short.
export const MAX_INSTRUCTIONS_CHARS = 2500;

export const guideNote = (name) => `Before first use in a conversation, call ${GUIDE_TOOL} with name '${name}'.`;

// Tools that belong to exactly one served skill (so loading that skill's guide is the right
// first step), skipping tools shared across jobs (`mcp.shared_tools` in brevo-skills.json).
export function singleSkillTools(served, sharedTools = []) {
  const users = new Map();
  for (const s of served) {
    for (const tool of s.meta.requires_tools ?? []) users.set(tool, [...(users.get(tool) ?? []), s.name]);
  }
  return new Map([...users].filter(([tool, names]) => names.length === 1 && !sharedTools.includes(tool)).map(([tool, [name]]) => [tool, name]));
}

export default {
  id: 'mcp',
  platform: null,
  supports: [],
  build({ config, skills, version, shared }) {
    const dist = {};
    for (const [platform, server] of Object.entries(config.mcp.servers)) {
      const served = skills.filter(
        (s) => s.meta.platforms.includes(platform) && s.meta.role !== 'router' && (s.meta.requires_tools ?? []).length > 0,
      );
      // One sentence for all guides, then one line per guide: the instructions have a size limit
      // and a sentence per skill stops fitting at about eight skills.
      const pointers = served.map((s) => `- \`${s.name}\`: ${s.meta.summary.replace(/\.$/, '')}`).join('\n');
      const intro = `For these jobs, first call \`${GUIDE_TOOL}\` with the name (or read resource \`${RESOURCE_PREFIX}<name>\`) and follow it:`;
      const instructions = `${shared.mcpInstructions}\n${pointers ? `\n${intro}\n${pointers}\n` : ''}`;
      if (instructions.length > MAX_INSTRUCTIONS_CHARS) {
        throw new Error(`mcp: instructions for ${server} are ${instructions.length} characters (max ${MAX_INSTRUCTIONS_CHARS})`);
      }

      const base = `mcp/${server}`;
      dist[`${base}/instructions.md`] = instructions;
      const toolNotes = {};
      const addNote = (tool, note) => {
        toolNotes[tool] = toolNotes[tool] ? `${toolNotes[tool]} ${note}` : note;
      };
      for (const s of served) {
        dist[`${base}/skills/${s.name}.md`] = `<!-- ${GENERATED_NOTE} -->\n<!-- ${s.name} ${s.meta.version} -->\n\n${inlineSkill(s)}`;
        for (const [tool, note] of Object.entries(s.meta.tool_notes ?? {})) addNote(tool, note);
      }
      // After the skills' own notes, so a tool's rule comes first and the pointer last.
      for (const [tool, name] of singleSkillTools(served, config.mcp.shared_tools)) addNote(tool, guideNote(name));
      dist[`${base}/manifest.json`] = json({
        version,
        server,
        instructions: 'instructions.md',
        guides: served.map((s) => ({ name: s.name, description: s.meta.summary, file: `skills/${s.name}.md` })),
        resources: served.map((s) => ({
          uri: `${RESOURCE_PREFIX}${s.name}`,
          name: s.name,
          description: s.meta.summary,
          mime_type: 'text/markdown',
          file: `skills/${s.name}.md`,
        })),
        prompts: served.map((s) => ({
          name: s.name.replace(/-/g, '_'),
          description: s.meta.summary,
          file: `skills/${s.name}.md`,
        })),
        tool_notes: Object.fromEntries(Object.entries(toolNotes).sort(([a], [b]) => a.localeCompare(b))),
      });
    }
    return { dist };
  },
};
