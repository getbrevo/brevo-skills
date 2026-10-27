# Contributing

Thanks for helping. This repository publishes the Brevo skills; Brevo writes and tests them in
its own source repository, and each release overwrites the generated files here (see
[AGENTS.md](AGENTS.md) for the list).

## Suggest a change to a skill

Open an [issue](https://github.com/getbrevo/brevo-skills/issues/new/choose): which skill, which
agent, what you asked, what it did and what you expected. Remove personal data, API keys and
customer content first. A pull request that edits a generated file can't be merged, because the
next release would overwrite it.

## Pull requests we welcome

Changes to what this repository owns: the rest of `README.md`, `docs/`, the issue templates,
`CONTRIBUTING.md`, `AGENTS.md`, `openai-plugin/` and `scripts/`. Keep the changes small, say why in the description, and keep
the two `skills-table` markers in `README.md`.

## Public repository rules

Never include internal hostnames, private organisation names, tickets, people's names, API
keys or links to private systems, in files or in commit messages.

## Security

Report security problems privately as described in [SECURITY.md](SECURITY.md), never in a public
issue.
