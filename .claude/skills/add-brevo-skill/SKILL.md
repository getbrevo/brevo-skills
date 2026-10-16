---
name: add-brevo-skill
description: Walk a contributor through adding a skill to this repository, from scaffold to pull request. Use when someone working in this repo wants to add, create or contribute a new Brevo skill, or asks how a skill is written, tested or released here. Scaffolds with yarn new-skill, applies the writing rules, adds evals, builds and verifies, bumps the version and prepares the PR, following CONTRIBUTING.md.
---

# Add a Brevo skill

A repo-level skill for contributors using Claude Code in `getbrevo/brevo-skills`. It is
not part of the shipped plugin: the build reads `src/skills/` and the plugin reads
`skills/`, neither of which includes this folder.

The rules live in [CONTRIBUTING.md](../../../CONTRIBUTING.md) ("Add a skill") and
[docs/architecture.md](../../../docs/architecture.md). Read the relevant section before
each step instead of working from memory; this file only says what to do in which order.

## 1. Agree on the skill before writing anything

Ask the user for, and confirm in one message:

- the **name**: lower-case words joined by hyphens, at most 64 characters, no reserved
  host word (`anthropic`, `claude`, `openai`, `gemini`)
- the **owner** team, as it will appear in `skill.json`
- the **summary**: the job it does, in one sentence ("Turn an HTML email into an editable
  template"); the router's routing table is built from it
- the **platforms** it targets and the **MCP tools** it calls, if known
- whether it runs **shell commands** (then it stays out of chat-only targets)

If the skill lives in another public repo, stop here and follow "Add a skill that lives in
another repo" in CONTRIBUTING.md instead: that path syncs, it does not scaffold.

## 2. Scaffold

```bash
yarn new-skill <name> --owner <team> --summary "<job it does>" \
  [--platforms claude,openai,gemini] [--tools tool_a,tool_b] [--shell]
```

It creates `src/skills/<name>/skill.json` (status `draft`), `src/skills/<name>/SKILL.md`
and `evals/<name>/cases.json`, validates them and prints the next steps. It refuses a name
that exists or breaks the rules; fix the name rather than working around the check. Don't
create these files by hand.

## 3. Write SKILL.md

Follow "Writing rules" in CONTRIBUTING.md. In particular:

- Finish the `description`: what it does **and when to use it** ("Use when …"), at most
  1024 characters. Agents choose the skill from this text alone.
- Keep the skeleton's order: tools table and connection rules, collect the inputs,
  confirm what will happen, do the work, refusals, finish, output rules.
- Stay under 500 lines; put longer material in `references/` and link to it directly from
  `SKILL.md`.
- Every Brevo action goes through MCP tools; never an API key, a script or a direct call.
- Text and images only in the skill folder. No executables.

Then complete `skill.json`: every tool the skill calls in `requires_tools`, `tool_notes`
for rules that must reach every agent, and `"requires": ["shell"]` if it runs commands.

## 4. Evals

Replace the example case in `evals/<name>/cases.json` with real ones, following
[evals/README.md](../../../evals/README.md): a happy path, a missing input, a refusal, and
each error the skill explains. Expectations must be checkable from a transcript. Fixtures
are invented, never real customer data.

## 5. Build and verify

```bash
yarn build && yarn verify
```

A `draft` skill is validated but not shipped, so `skills/` and `catalog.json` won't change
yet. Fix every problem `verify` reports; don't edit generated files.

## 6. Version and changelog

A new skill starts at `1.0.0`; leave it. For later changes to the skill's text, bump
`version` in `skill.json` and add a line under the unreleased version in `CHANGELOG.md`
(`yarn check-versions` fails the PR otherwise). Add the new skill to `CHANGELOG.md` now,
under "Added".

## 7. Pull request

Before opening it, run through the "Public-repo rules" in CONTRIBUTING.md on the diff and
the PR text: no keys, internal hosts, internal links, people or real data.
`yarn check-public` catches what it can.

Then:

- fill `.github/PULL_REQUEST_TEMPLATE.md`: tick "New skill" and the checklist
- keep `status: draft` in the first PR; move to `beta` when it works end to end, and to
  `public` once the evals pass on every platform it targets, recording the results in the PR
