# Update the ChatGPT / Codex plugin package after a release

The Brevo plugin on OpenAI's platform is uploaded by hand. Its listing details (name,
category, support, privacy and terms links, example prompts, test cases) and its MCP
connection are in the plugin package, and a release only supplies the skills. This repository
keeps a copy of the package's own files in [`openai-plugin/`](../openai-plugin) and a script
that puts a release's skills into it. The general version of these steps is in
[platforms.md](platforms.md#add-skills-to-a-plugin-that-already-exists).

## What the package looks like

```
.mcp.json                  MCP server entry (the OpenAI endpoint)
.codex-plugin/plugin.json  manifest: name, version, listing text, test cases, release notes
assets/brevo.png           logo and composer icon
skills/                    one folder per skill, each with a SKILL.md
```

The manifest is `.codex-plugin/plugin.json`, not a `plugin.json` at the top.

In this repository, `openai-plugin/` holds the first three. Its manifest has placeholders for
the plugin's name, the version and the release notes, which the script fills in. The plugin's
name on the OpenAI platform is not stored here; you pass it with `--app-id` or `OPENAI_APP_ID`. Copy it from the
manifest of the package you last uploaded.

## Build the ZIP

Run from the repository root. It needs `gh`, `shasum`, `unzip`, `zip` and `python3`.

```sh
scripts/build-openai-plugin.sh --app-id <the plugin's name on the OpenAI platform>
```

Or set `OPENAI_APP_ID` in your shell (not in the repo) and leave `--app-id` out. The option wins
if both are given.

Options:

| Option | What it does |
|---|---|
| `--tag v1.2.0` | Build from this release. The default is the latest release. |
| `--notes "text"` | Release notes for the manifest. The default is one line saying the skills were updated to the release and the MCP endpoint is unchanged. Write real notes when skills were added, updated or removed. |
| `--skip brevo-cli` | Leave a skill out of the plugin. Repeat for several. Use it for skills that need a terminal (`requires: ["shell"]`) if the chat plugin shouldn't have them. |
| `--out dir` | Folder for the ZIP. The default is `dist/`, which git ignores. |

The script:

1. Downloads `brevo-skills-<version>.zip` and `SHA256SUMS` from the release and stops if the
   checksum differs.
2. Starts from the files in `openai-plugin/` and puts the release's `skills/` folder in it.
   The release ZIP holds every shipped skill and no manifest, so it never replaces the
   plugin's own, and a skill the release dropped is gone.
3. Adds the skills in `openai-plugin/extras/`, one `<name>.md` per skill, as
   `skills/<name>/SKILL.md`. These are skills that are not in the release yet (today,
   `brevo-guide`). Delete a file from `extras/` once a release ships that skill, or the
   script overwrites the release's copy with the older one.
4. Applies `--skip`, then sets the name, version and release notes in the manifest. The version
   is the release's.
5. Writes `brevo-plugin-<version>.zip` with `.mcp.json` and `skills/` at the top of the ZIP.

Then check the ZIP with `unzip -l`: it lists `.mcp.json`, `.codex-plugin/plugin.json`,
`assets/` and one `skills/<name>/SKILL.md` per skill you expect, and no `agents/openai.yaml`
(the release ZIP leaves it out). Upload it on the plugin's page on the OpenAI platform and
submit it for review.

## Keep the copy in step with the platform

If you change the plugin's listing on the OpenAI platform (description, example prompts, test
cases, links, logo, MCP endpoint), make the same change in `openai-plugin/`, or the next build
brings back the old text. The other way round, a change here reaches the platform only when
you upload a ZIP.

## Without the script

Unzip the package you last uploaded, delete its `skills/` folder, put the release ZIP's
`skills/` folder in its place (check the ZIP against `SHA256SUMS` first), raise `version` and
rewrite `release_notes` in `.codex-plugin/plugin.json`, and zip the folder from inside, so
`.mcp.json` is at the top of the ZIP.

## Public repository rules

Don't write internal hostnames, private organisation names, tickets or people's names in the
release notes or anywhere else in this repo. See [../AGENTS.md](../AGENTS.md).
