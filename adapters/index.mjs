// Every build target. Adding a platform = writing one adapter and listing it here.
// An adapter receives only the skills whose skill.json `platforms` include its `platform`
// (all published skills when `platform` is null), minus skills whose skill.json `requires`
// aren't all in the adapter's `supports` (for example `shell`), and returns files to write:
//   repo: committed at the repo root (marketplaces read the repo directly)
//   dist: release artifacts under dist/

import claude from './claude.mjs';
import agentPlugins from './agent-plugins.mjs';
import cursor from './cursor.mjs';
import grok from './grok.mjs';
import codex from './codex.mjs';
import geminiCli from './gemini-cli.mjs';
import antigravity from './antigravity.mjs';
import instructions from './instructions.mjs';
import mcp from './mcp.mjs';

export default [claude, agentPlugins, cursor, grok, codex, geminiCli, antigravity, instructions, mcp];
