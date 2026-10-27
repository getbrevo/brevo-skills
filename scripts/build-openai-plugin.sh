#!/usr/bin/env bash
# Build the ChatGPT / Codex plugin ZIP from a release of this repository.
#
# Usage: scripts/build-openai-plugin.sh --app-id <id> [--tag v1.2.0] [--notes "text"]
#                                       [--skip <skill>]... [--out <dir>]
#
#   --app-id  the plugin's `name` on the OpenAI platform (kept out of this repo)
#   --tag     release to build from (default: the latest release)
#   --notes   release notes for the manifest (default: a one-line summary)
#   --skip    leave a skill out of the plugin, e.g. --skip brevo-cli (repeatable)
#   --out     folder for the ZIP (default: dist/)
#
# Needs: gh, shasum, unzip, zip, python3. See docs/openai-plugin-update.md.
set -euo pipefail

REPO="getbrevo/brevo-skills"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$ROOT/openai-plugin"

app_id="" tag="" notes="" out="$ROOT/dist"
skip=()
while [ $# -gt 0 ]; do
  case "$1" in
    --app-id) app_id="$2"; shift 2 ;;
    --tag) tag="$2"; shift 2 ;;
    --notes) notes="$2"; shift 2 ;;
    --skip) skip+=("$2"); shift 2 ;;
    --out) out="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done
[ -n "$app_id" ] || { echo "--app-id is required" >&2; exit 2; }

if [ -z "$tag" ]; then
  tag="$(gh release view -R "$REPO" --json tagName --jq .tagName)"
fi
version="${tag#v}"
[ -n "$notes" ] || notes="Update the bundled Brevo skills to release $version. The Brevo MCP endpoint and functionality are unchanged."

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

echo "Downloading brevo-skills-$version.zip from $tag"
gh release download "$tag" -R "$REPO" -p "brevo-skills-$version.zip" -p SHA256SUMS -D "$work"
expected="$(awk -v f="brevo-skills-$version.zip" '{n=$2; sub(/^\.\//,"",n)} n==f {print $1}' "$work/SHA256SUMS")"
actual="$(shasum -a 256 "$work/brevo-skills-$version.zip" | awk '{print $1}')"
[ -n "$expected" ] && [ "$expected" = "$actual" ] || { echo "Checksum mismatch for brevo-skills-$version.zip" >&2; exit 1; }

pkg="$work/package"
mkdir -p "$pkg"
cp -R "$TEMPLATE/." "$pkg/"
rm -rf "$pkg/extras"
unzip -q "$work/brevo-skills-$version.zip" -d "$work/skills-zip"
cp -R "$work/skills-zip/skills" "$pkg/skills"

# Skills that are not in the release yet.
for f in "$TEMPLATE"/extras/*.md; do
  name="$(basename "$f" .md)"
  mkdir -p "$pkg/skills/$name"
  cp "$f" "$pkg/skills/$name/SKILL.md"
done

for s in ${skip[@]+"${skip[@]}"}; do rm -rf "$pkg/skills/$s"; done

python3 -I - "$pkg/.codex-plugin/plugin.json" "$app_id" "$version" "$notes" <<'PY'
import json, sys
path, app_id, version, notes = sys.argv[1:5]
d = json.load(open(path))
d["name"] = app_id
d["version"] = version
d["extensions"]["com.openai"]["publication"]["release_notes"] = notes
with open(path, "w") as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
    f.write("\n")
PY

find "$pkg" -name .DS_Store -delete
mkdir -p "$out"
zip_path="$out/brevo-plugin-$version.zip"
rm -f "$zip_path"
(cd "$pkg" && zip -q -r "$zip_path" . -x '.DS_Store')

echo "Built $zip_path"
unzip -l "$zip_path" | grep -E "SKILL.md|plugin.json|\.mcp\.json"
