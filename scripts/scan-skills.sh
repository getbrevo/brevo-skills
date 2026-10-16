#!/usr/bin/env bash
# Static security scan of the skill text with SkillSpector.
#
# Runs NVIDIA SkillSpector (https://github.com/NVIDIA/SkillSpector) over the skills in
# src/skills/: every folder with a SKILL.md, the ones changed since a git ref, or the paths
# given. Each skill gets a JSON report; a Markdown summary lists the skills above the
# threshold. The scanner has no PyPI release, so it is pinned to one commit, defined once
# below. The CI workflow calls this script, so the pin is the single source of truth.
#
# Verdict per skill, from the report's risk_assessment.score (0-100):
#   PASS   score at or below --threshold
#   FAIL   score above --threshold
#   ERROR  the scan didn't complete (the scanner exited 2, or wrote no readable report)
#
# Exit codes: 0 every skill passed (or nothing to scan); 1 a skill failed or errored;
# 2 the --changed ref isn't in this clone; 3 the scanner can't be installed; 64 bad usage.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VENV_DIR="${SCRIPT_DIR}/.skillspector-venv"
REPORT_DIR=""

# The pinned SkillSpector commit. Bump it here (and nowhere else) to take upstream changes.
SKILLSPECTOR_REPO="https://github.com/NVIDIA/SkillSpector.git"
SKILLSPECTOR_REF="${SKILLSPECTOR_REF:-4c52fbb83bbca0dd13f2685453c9b661d8c95bf8}"

THRESHOLD=50
MODE=all
CHANGED_REF=origin/main
LLM_FLAG=--no-llm
SUMMARY_FILE=""
EXPLICIT_PATHS=""

usage() {
  cat <<'USAGE'
Usage: scripts/scan-skills.sh [options] [SKILL_DIR ...]

Scans skill folders (src/skills/<name>/) with NVIDIA SkillSpector and fails when a skill's
risk score is above the threshold. With no paths, scans every skill.

Options:
  --all                 Scan every skill under src/skills/ (the default).
  --changed [REF]       Scan the skills with files changed since REF (default: origin/main).
                        A change under shared/ scans every skill: they all include it.
  --threshold N         Fail a skill whose risk score is above N (0-100, default: 50).
  --summary-file PATH   Also write the Markdown summary to PATH (for CI comments).
  --report-dir DIR      Where reports go (default: scripts/.skillspector-reports/).
  --root DIR            Repo to scan (default: the repo this script is in).
  --llm                 Also run SkillSpector's LLM analysis (needs a provider key; see
                        its README). Static rules only by default.
  -h, --help            Show this help.

Environment:
  SKILLSPECTOR_CMD      Command that runs the scanner ("skillspector", or a stub in tests).
                        Skips the bootstrap.
  SKILLSPECTOR_REF      Commit to install when bootstrapping (default: the pin in the script).

Without SKILLSPECTOR_CMD or a skillspector on PATH, the script installs the pinned commit
into scripts/.skillspector-venv/ with uv (Python 3.12) and reuses it on later runs.
`yarn scan` runs this script.
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --all) MODE=all; shift ;;
    --changed)
      MODE=changed
      if [ -n "${2:-}" ] && [ "${2#--}" = "$2" ]; then CHANGED_REF="$2"; shift; fi
      shift ;;
    --threshold) THRESHOLD="${2:?--threshold needs a value}"; shift 2 ;;
    --summary-file) SUMMARY_FILE="${2:?--summary-file needs a path}"; shift 2 ;;
    --report-dir) REPORT_DIR="${2:?--report-dir needs a path}"; shift 2 ;;
    --root) ROOT="$(cd "${2:?--root needs a path}" && pwd)"; shift 2 ;;
    --llm) LLM_FLAG=""; shift ;;
    -h|--help) usage; exit 0 ;;
    --*) echo "error: unknown option '$1'" >&2; usage >&2; exit 64 ;;
    *) EXPLICIT_PATHS="${EXPLICIT_PATHS}$1
"; MODE=explicit; shift ;;
  esac
done

case "${THRESHOLD}" in
  ''|*[!0-9]*) echo "error: --threshold must be an integer from 0 to 100 (got '${THRESHOLD}')." >&2; exit 64 ;;
esac
if [ "${THRESHOLD}" -gt 100 ]; then
  echo "error: --threshold must be an integer from 0 to 100 (got '${THRESHOLD}')." >&2; exit 64
fi
[ -n "${REPORT_DIR}" ] || REPORT_DIR="${ROOT}/scripts/.skillspector-reports"

# --- The scanner ---------------------------------------------------------------------
RUNNER=""
resolve_runner() {
  if [ -n "${SKILLSPECTOR_CMD:-}" ]; then RUNNER="${SKILLSPECTOR_CMD}"; return; fi
  if command -v skillspector >/dev/null 2>&1; then RUNNER=skillspector; return; fi
  if command -v uv >/dev/null 2>&1; then
    local stamp="${VENV_DIR}/.skillspector-ref"
    if [ ! -x "${VENV_DIR}/bin/skillspector" ] || [ "$(cat "${stamp}" 2>/dev/null || true)" != "${SKILLSPECTOR_REF}" ]; then
      echo "Installing SkillSpector @ ${SKILLSPECTOR_REF} into ${VENV_DIR} (once) ..." >&2
      rm -rf "${VENV_DIR}"
      if ! uv venv --python 3.12 "${VENV_DIR}" >/dev/null \
        || ! uv pip install --python "${VENV_DIR}/bin/python" "git+${SKILLSPECTOR_REPO}@${SKILLSPECTOR_REF}" >/dev/null; then
        echo "error: couldn't install SkillSpector. Check the network and that uv can fetch Python 3.12, then retry." >&2
        exit 3
      fi
      echo "${SKILLSPECTOR_REF}" > "${stamp}"
    fi
    RUNNER="${VENV_DIR}/bin/skillspector"; return
  fi
  echo "error: skillspector isn't on PATH and uv isn't available to install it." >&2
  echo "  Install uv (https://docs.astral.sh/uv/) and run again, or install the scanner yourself:" >&2
  echo "    uv tool install git+${SKILLSPECTOR_REPO}@${SKILLSPECTOR_REF}" >&2
  echo "  then set SKILLSPECTOR_CMD=skillspector." >&2
  exit 3
}

# --- Which skills --------------------------------------------------------------------
# A skill is a folder directly under src/skills/ that holds a SKILL.md.
discover_all() {
  find "${ROOT}/src/skills" -mindepth 2 -maxdepth 2 -name SKILL.md 2>/dev/null | sed 's#/SKILL.md$##' | sort
}

# The skills owning a file changed since REF (compared with the working tree, so uncommitted
# edits count). Any change under shared/ means every skill, since every skill includes it.
discover_changed() {
  local ref="$1" changed
  changed="$(git -C "${ROOT}" diff --name-only "${ref}" -- src/skills shared)"
  if printf '%s\n' "${changed}" | grep -q '^shared/'; then
    discover_all
    return 0
  fi
  printf '%s\n' "${changed}" | sed -n 's#^\(src/skills/[^/][^/]*\)/.*#\1#p' | sort -u | while IFS= read -r rel; do
    if [ -n "${rel}" ] && [ -f "${ROOT}/${rel}/SKILL.md" ]; then echo "${ROOT}/${rel}"; fi
  done
  return 0
}

resolve_explicit() {
  printf '%s' "${EXPLICIT_PATHS}" | while IFS= read -r p; do
    [ -n "${p}" ] || continue
    if [ ! -f "${p}/SKILL.md" ]; then
      echo "error: ${p} has no SKILL.md" >&2
      exit 64
    fi
    (cd "${p}" && pwd)
  done
}

# --- One skill -----------------------------------------------------------------------
# Prints "score severity recommendation issues" from a report, or "-1 ..." when unreadable.
parse_report() {
  node -e '
    const fs = require("node:fs");
    try {
      const d = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      const r = d.risk_assessment || {};
      const score = Number.isInteger(r.score) && d.execution_successful !== false ? r.score : -1;
      console.log(score, r.severity || "?", r.recommendation || "?", (d.issues || []).length);
    } catch {
      console.log(-1, "?", "?", 0);
    }
  ' "$1"
}

# Markdown bullets for the findings in a report, so a FAIL is actionable from the summary.
format_findings() {
  node -e '
    const fs = require("node:fs");
    const clip = (s, n) => { s = String(s || "").split(/\s+/).join(" ").replace(/`/g, "\x27"); return s.length <= n ? s : s.slice(0, n - 1) + "…"; };
    let issues = [];
    try { issues = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).issues || []; } catch {}
    if (!issues.length) console.log("_No structured findings in the report._");
    for (const i of issues.slice(0, 25)) {
      const loc = i.location || {};
      const where = loc.start_line ? `${loc.file || "?"}:${loc.start_line}` : loc.file || "?";
      const head = [i.category, i.pattern].filter(Boolean).join(" / ");
      console.log(`- **[${i.severity || "?"}] ${head}** — \`${where}\``);
      if (i.finding) console.log(`  - finding: \`${clip(i.finding, 120)}\``);
      if (i.remediation) console.log(`  - fix: ${clip(i.remediation, 200)}`);
    }
    if (issues.length > 25) console.log(`- _… and ${issues.length - 25} more (see the JSON report)._`);
  ' "$1"
}

PASS_COUNT=0; FAIL_COUNT=0; ERROR_COUNT=0; SKILL_COUNT=0
ROWS=""; FAILED_REPORTS=""; ERROR_LOGS=""

run_one() {
  local dir="$1" rel slug json_out log_out rc score sev rec issues verdict disp
  rel="${dir#"${ROOT}"/}"
  slug="$(printf '%s' "${rel}" | tr '/' '_')"
  json_out="${REPORT_DIR}/${slug}.json"
  log_out="${REPORT_DIR}/${slug}.log"
  rm -f "${json_out}"

  set +e
  # shellcheck disable=SC2086  # RUNNER and LLM_FLAG are meant to word-split
  ${RUNNER} scan "${dir}" ${LLM_FLAG} --format json --output "${json_out}" >"${log_out}" 2>&1
  rc=$?
  set -e

  read -r score sev rec issues <<EOR
$(parse_report "${json_out}")
EOR

  # A missing or unreadable report is an ERROR, never a silent pass.
  if [ "${rc}" -eq 2 ] || [ "${score}" -lt 0 ]; then
    verdict=ERROR; disp="?"; ERROR_COUNT=$((ERROR_COUNT + 1)); ERROR_LOGS="${ERROR_LOGS}${rel}|${log_out}
"
  elif [ "${score}" -gt "${THRESHOLD}" ]; then
    verdict=FAIL; disp="${score}"; FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED_REPORTS="${FAILED_REPORTS}${rel}|${json_out}
"
  else
    verdict=PASS; disp="${score}"; PASS_COUNT=$((PASS_COUNT + 1))
  fi

  printf '  [%-5s] %3s/100 %-8s issues=%-3s %s\n' "${verdict}" "${disp}" "${sev}" "${issues}" "${rel}"
  # Only FAIL and ERROR rows go in the summary table; passing skills are counted in the headline.
  if [ "${verdict}" != PASS ]; then
    ROWS="${ROWS}| \`${rel}\` | ${verdict} | ${disp} | ${sev} | $(printf '%s' "${rec}" | tr '_' ' ') | ${issues} |
"
  fi
}

# --- Summary -------------------------------------------------------------------------
write_summary() {
  local actionable=$((FAIL_COUNT + ERROR_COUNT)) entry rel file
  {
    echo "## SkillSpector security scan"
    echo
    echo "Scanned **${SKILL_COUNT}** skill(s). A skill fails above risk score **${THRESHOLD}**."
    echo
    echo "**${PASS_COUNT} passed · ${FAIL_COUNT} failed · ${ERROR_COUNT} errored**"
    echo
    if [ "${SKILL_COUNT}" -eq 0 ]; then
      echo "_No skill to scan._"
    elif [ "${actionable}" -eq 0 ]; then
      echo "Every scanned skill is at or below the threshold."
    else
      echo "The ${actionable} skill(s) to look at (the ${PASS_COUNT} passing one(s) are left out):"
      echo
      echo "| Skill | Verdict | Score | Severity | Recommendation | Issues |"
      echo "| --- | --- | --- | --- | --- | --- |"
      printf '%s' "${ROWS}"
      if [ -n "${FAILED_REPORTS}" ]; then
        echo
        echo "### Findings"
        printf '%s' "${FAILED_REPORTS}" | while IFS='|' read -r rel file; do
          [ -n "${rel}" ] || continue
          echo
          echo "<details><summary><code>${rel}</code></summary>"
          echo
          format_findings "${file}"
          echo
          echo "</details>"
        done
      fi
    fi
    if [ -n "${ERROR_LOGS}" ]; then
      echo
      echo "### Scan errors"
      printf '%s' "${ERROR_LOGS}" | while IFS='|' read -r rel file; do
        [ -n "${rel}" ] || continue
        echo
        echo "<details><summary><code>${rel}</code></summary>"
        echo
        echo '```'
        tail -n 15 "${file}" 2>/dev/null || echo "(no log captured)"
        echo '```'
        echo
        echo "</details>"
      done
    fi
    echo
    echo "_The static rules flag patterns, not intent: review a finding before changing a skill. Scanner: [NVIDIA/SkillSpector](${SKILLSPECTOR_REPO%.git}) @ \`${SKILLSPECTOR_REF}\`._"
  } > "${REPORT_DIR}/summary.md"
  if [ -n "${SUMMARY_FILE}" ]; then cp "${REPORT_DIR}/summary.md" "${SUMMARY_FILE}"; fi
}

# --- Main ----------------------------------------------------------------------------
mkdir -p "${REPORT_DIR}"

SKILLS=""
case "${MODE}" in
  explicit) SKILLS="$(resolve_explicit)" ;;
  changed)
    if ! git -C "${ROOT}" rev-parse --verify --quiet "${CHANGED_REF}^{commit}" >/dev/null; then
      echo "error: --changed ref '${CHANGED_REF}' isn't in this clone (fetch it first)." >&2
      exit 2
    fi
    SKILLS="$(discover_changed "${CHANGED_REF}")" ;;
  all) SKILLS="$(discover_all)" ;;
esac
if [ -n "${SKILLS}" ]; then SKILL_COUNT="$(printf '%s\n' "${SKILLS}" | grep -c .)"; fi

if [ "${SKILL_COUNT}" -eq 0 ]; then
  write_summary
  echo "No skill to scan."
  exit 0
fi

resolve_runner

echo "SkillSpector scan"
echo "  scanner   : ${RUNNER}"
if [ "${MODE}" = changed ]; then echo "  mode      : changed since ${CHANGED_REF}"; else echo "  mode      : ${MODE}"; fi
if [ -z "${LLM_FLAG}" ]; then echo "  llm       : on"; else echo "  llm       : off"; fi
echo "  threshold : fails above ${THRESHOLD}"
echo "  skills    : ${SKILL_COUNT}"
echo "  reports   : ${REPORT_DIR}"
echo

while IFS= read -r skill; do
  [ -n "${skill}" ] || continue
  run_one "${skill}"
done <<EOS
${SKILLS}
EOS

write_summary

echo
echo "Summary: ${PASS_COUNT} passed, ${FAIL_COUNT} failed, ${ERROR_COUNT} errored."
echo "Report : ${REPORT_DIR}/summary.md"

if [ "${FAIL_COUNT}" -gt 0 ] || [ "${ERROR_COUNT}" -gt 0 ]; then exit 1; fi
exit 0
