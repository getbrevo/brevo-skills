#!/usr/bin/env node
// Scaffolds a new skill: src/skills/<name>/ (skill.json as a draft, a SKILL.md skeleton) and
// evals/<name>/cases.json with one example case.
//
//   yarn new-skill <name> --owner <team> --summary "<job it does>"
//                        [--platforms claude,openai,gemini] [--tools tool_a,tool_b] [--shell]
//
// It refuses an existing or invalid name (the same rules as `yarn validate`), validates
// what it wrote, and prints the next steps. It writes only inside src/skills/<name>/ and
// evals/<name>/.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PLATFORMS, loadSkills, nameProblems, renderFrontmatter, validateSkill } from './lib/skills.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'usage: new-skill.mjs <name> --owner <team> --summary "<job it does>" [--platforms claude,openai,gemini] [--tools tool_a,tool_b] [--shell]';

const VALUE_FLAGS = ['--owner', '--summary', '--platforms', '--tools'];

function list(value) {
  return (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

// Parses the command line into the options scaffoldSkill takes. Throws on a bad invocation.
export function parseArgs(argv) {
  const options = {};
  let name;
  let shell = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (VALUE_FLAGS.includes(arg)) {
      if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new Error(`${arg} needs a value\n${USAGE}`);
      options[arg] = argv[++i];
    } else if (arg === '--shell') shell = true;
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}\n${USAGE}`);
    else if (name === undefined) name = arg;
    else throw new Error(`unexpected argument ${arg}\n${USAGE}`);
  }
  if (!name) throw new Error(USAGE);
  if (!options['--owner']?.trim()) throw new Error(`--owner is required\n${USAGE}`);
  if (!options['--summary']?.trim()) throw new Error(`--summary is required\n${USAGE}`);
  return {
    name,
    owner: options['--owner'].trim(),
    summary: options['--summary'].trim(),
    platforms: '--platforms' in options ? list(options['--platforms']) : [...PLATFORMS],
    tools: list(options['--tools']),
    shell,
  };
}

function titleFor(name) {
  const words = name.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function skillJson({ name, owner, summary, platforms, tools, shell }) {
  const meta = {
    name,
    title: titleFor(name),
    version: '1.0.0',
    status: 'draft',
    owner,
    summary,
    platforms,
  };
  if (shell) meta.requires = ['shell'];
  meta.requires_tools = tools;
  return `${JSON.stringify(meta, null, 2)}\n`;
}

function skillMd({ name, summary, tools, shell }) {
  const toolRows = tools.length ? tools.map((t) => `| … | \`${t}\` |`) : ['| … | `tool_name` |'];
  const noTerminal = shell
    ? ['This skill runs commands in a terminal: it needs a coding agent, not a chat app.', '']
    : [];
  const frontmatter = renderFrontmatter({
    name,
    description: `${summary} Use when the user asks to … (finish this: the requests it answers, in the user's words; what it checks, confirms and refuses; at most 1024 characters).`,
  });
  return [
    frontmatter.trimEnd(),
    '',
    `# ${titleFor(name)}`,
    '',
    `${summary}`,
    '',
    'One paragraph on what the skill does and what it never does. Spend the words on',
    'Brevo-specific facts, the order of steps and the safety rules, not on what a model',
    'already knows.',
    '',
    ...noTerminal,
    '| Step | Tool |',
    '|---|---|',
    ...toolRows,
    '',
    "If one of these tools isn't in your tool list, stop and tell the user their Brevo",
    "connection doesn't offer this feature yet.",
    '',
    '<!-- include: shared/connection.md -->',
    '',
    '## 1. Collect the inputs',
    '',
    'What the user must give, in one message. What to ask for when it is missing, and what',
    'to refuse (a URL to scrape, a customer file, a key).',
    '',
    '## 2. Confirm what will happen',
    '',
    'Tell the user, in one line, what you are about to do and to what. Confirm before',
    'creating, sending or changing anything: "I\'ll … Go ahead?"',
    '',
    '## 3. Do the work',
    '',
    'The tool calls, in order, with the rules for each: what to pass, what never to pass,',
    'how long to wait, when to stop. Longer material goes in `references/` and is linked',
    'from here.',
    '',
    '## 4. Refusals and errors',
    '',
    'Explain each refusal in plain words, then show the message as returned.',
    '',
    '| Response | Meaning | Tell the user |',
    '|---|---|---|',
    '| … | … | … |',
    '',
    "Don't retry a refused call in a loop: one retry at most, after the user fixed the cause.",
    '',
    '## 5. Finish',
    '',
    'What the reply ends with: the object, its ID, a link to it in Brevo, and what the user',
    'still has to do there.',
    '',
    '<!-- include: shared/output-rules.md -->',
    '',
  ].join('\n');
}

function casesJson({ name, tools }) {
  const tool = tools[0] ?? 'tool_name';
  const cases = {
    skill: name,
    how_to_run: 'Install the skill and connect the Brevo MCP server on a test account. Give the agent each prompt. Score each expectation as met or not. See evals/README.md.',
    cases: [
      {
        id: 'happy-path',
        prompt: 'A request this skill answers, written as a user would write it.',
        fixture: null,
        expect: [
          'confirms what it will do before creating, sending or changing anything',
          `calls ${tool} with the confirmed inputs only`,
          "ends with the object's name, its ID and a link to it in Brevo",
        ],
      },
    ],
  };
  return `${JSON.stringify(cases, null, 2)}\n`;
}

// Checks the options before anything is written. Throws with every problem found.
function checkOptions(root, { name, owner, summary, platforms, tools }) {
  const problems = nameProblems(name);
  const skillDir = path.join(root, 'src', 'skills', name);
  const evalDir = path.join(root, 'evals', name);
  if (problems.length === 0) {
    for (const dir of [skillDir, evalDir]) {
      if (fs.existsSync(dir)) problems.push(`${path.relative(root, dir)} already exists`);
    }
  }
  if (!owner) problems.push('owner is required');
  if (!summary) problems.push('summary is required');
  if (platforms.length === 0) problems.push(`platforms must list at least one of ${PLATFORMS.join(', ')}`);
  for (const p of platforms) if (!PLATFORMS.includes(p)) problems.push(`unknown platform "${p}"`);
  for (const t of tools) if (!/^[A-Za-z0-9_]+$/.test(t)) problems.push(`tool name "${t}" must be letters, digits and underscores`);
  if (problems.length) throw new Error(`can't scaffold "${name}":\n  ${problems.join('\n  ')}`);
}

// Writes the skill and its evals under `root`, validates the result, and returns the files
// written (relative to `root`). Pure in the sense that it touches nothing outside those two
// folders, so tests can run it in a temp directory with its own shared/ fragments.
export function scaffoldSkill(root, rawOptions) {
  const options = {
    ...rawOptions,
    owner: rawOptions.owner?.trim() ?? '',
    summary: rawOptions.summary?.trim() ?? '',
    platforms: rawOptions.platforms ?? [...PLATFORMS],
    tools: rawOptions.tools ?? [],
    shell: Boolean(rawOptions.shell),
  };
  checkOptions(root, options);
  const { name } = options;
  const skillDir = path.join(root, 'src', 'skills', name);
  const evalDir = path.join(root, 'evals', name);
  const files = {
    [path.join(skillDir, 'skill.json')]: skillJson(options),
    [path.join(skillDir, 'SKILL.md')]: skillMd(options),
    [path.join(evalDir, 'cases.json')]: casesJson(options),
  };
  fs.mkdirSync(skillDir, { recursive: true });
  fs.mkdirSync(evalDir, { recursive: true });
  for (const [file, content] of Object.entries(files)) fs.writeFileSync(file, content);

  const skill = loadSkills(root).find((s) => s.folder === name);
  const errors = validateSkill(skill, root);
  if (errors.length) {
    fs.rmSync(skillDir, { recursive: true, force: true });
    fs.rmSync(evalDir, { recursive: true, force: true });
    throw new Error(`the scaffold for "${name}" doesn't validate, nothing was kept:\n  ${errors.join('\n  ')}`);
  }
  return { name, files: Object.keys(files).map((f) => path.relative(root, f)) };
}

export function nextSteps(name) {
  return [
    'Next:',
    `  1. Write src/skills/${name}/SKILL.md: finish the description ("Use when …"), the steps and the refusals. Rules: CONTRIBUTING.md, "Add a skill".`,
    `  2. List every MCP tool it calls in requires_tools (src/skills/${name}/skill.json), and tag them for each platform on the MCP server.`,
    `  3. Replace the example case in evals/${name}/cases.json with real ones.`,
    '  4. yarn build && yarn verify',
    '  5. Open a PR. Move status to beta once it works end to end.',
  ].join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    return;
  }
  const { name, files } = scaffoldSkill(ROOT, parseArgs(argv));
  console.log(`Created ${name} (draft):`);
  for (const file of files) console.log(`  ${file}`);
  console.log('Valid: the skeleton passes yarn validate.');
  console.log(nextSteps(name));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
