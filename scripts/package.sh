#!/usr/bin/env bash
# Packages a release into dist/release/: one ZIP per target, plus checksums.
# Run after `yarn build`. Used by .github/workflows/release.yml.
set -euo pipefail

cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./brevo-skills.json').version")
PLUGIN=$(node -p "require('./brevo-skills.json').plugin.name")
OUT="dist/release"
rm -rf "$OUT" && mkdir -p "$OUT"

# 1. One ZIP per skill, the skill folder at the ZIP root: claude.ai, ChatGPT and Gemini
#    workspace uploads, the OpenAI /v1/skills API. Those hosts have no terminal, so skills
#    that require a shell get no upload ZIP (they still ship in the all-platform skill bundle).
for dir in skills/*/; do
  name=$(basename "$dir")
  read -r skill_version needs_shell < <(node -p "const s = require('./catalog.json').skills.find(s => s.name === '$name'); s.version + ' ' + s.requires.includes('shell')")
  if [ "$needs_shell" = "true" ]; then
    echo "skipping the upload ZIP for $name: it requires a shell"
    continue
  fi
  (cd skills && zip -qr "../$OUT/${name}-${skill_version}.zip" "$name")
done

# 2. Every shipped skill in one ZIP, `skills/` at the root and nothing else (no manifest, no MCP
#    config): unzip it over an existing plugin's `skills/` folder, then zip the plugin again
#    (see docs/platforms.md). Each skill's agents/openai.yaml (Codex metadata) and the generated
#    skills/README.md are left out; shell skills are included.
zip -qr "$OUT/${PLUGIN}-skills-${VERSION}.zip" skills -x '*.DS_Store' 'skills/README.md' 'skills/*/agents/' 'skills/*/agents/*'

# 3. The all-platform skill bundle: Claude Code, Agent Plugins (ChatGPT, Codex), Cursor, Grok and
#    Gemini CLI, with each platform's manifest.
zip -qr "$OUT/${PLUGIN}-all-platform-skill-bundle-${VERSION}.zip" \
  .claude-plugin .cursor-plugin .grok-plugin plugin.json mcp.json gemini-extension.json GEMINI.md \
  catalog.json skills LICENSE -x 'skills/README.md'

# 4. Antigravity plugin and condensed instructions (release-only artifacts). A dist folder
#    with nothing in it (no shipped skill fits that target, as when every skill needs a
#    shell) gets no ZIP: zip refuses an empty tree.
zip_dist() { # <folder under dist/> <ZIP name>
  if [ -z "$(find "dist/$1" -type f -print -quit 2>/dev/null)" ]; then
    echo "skipping $2: no skill ships as $1"
    return
  fi
  (cd dist && zip -qr "../$OUT/$2" "$1")
}
(cd dist/antigravity && zip -qr "../../$OUT/${PLUGIN}-antigravity-${VERSION}.zip" "$PLUGIN")
zip_dist instructions "${PLUGIN}-instructions-${VERSION}.zip"
zip_dist mcp "${PLUGIN}-mcp-text-${VERSION}.zip"

cp catalog.json "$OUT/catalog.json"

if command -v sha256sum >/dev/null; then
  (cd "$OUT" && sha256sum ./* > SHA256SUMS)
else
  (cd "$OUT" && shasum -a 256 ./* > SHA256SUMS)
fi
echo "Packaged v${VERSION} into ${OUT}:"
ls -1 "$OUT"
