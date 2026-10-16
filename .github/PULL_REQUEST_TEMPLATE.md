## What changed

<!-- One or two sentences. Link the issue if there is one. -->

## Type

- [ ] New skill
- [ ] Change to an existing skill
- [ ] Skill synced from its source repo
- [ ] New or changed platform adapter
- [ ] Pipeline, checks or docs

## Checklist

- [ ] I edited sources only (`src/`, `shared/`, `adapters/`, `brevo-skills.json`), then ran
      `yarn build` and committed the generated files
- [ ] `yarn verify` passes
- [ ] For a skill change: its `version` in `skill.json` is bumped, and `CHANGELOG.md` is updated
- [ ] For a skill change: the eval cases pass on each platform it targets (results below)
- [ ] No keys, internal hosts or internal links (`yarn check-public`)

## Eval results

<!-- Platform → cases passed, for skill changes. -->
