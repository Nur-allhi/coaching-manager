#!/usr/bin/env bash
#
# Scan every tracked file for an accidentally committed credential.
#
# T-007. Called by CI on every push and pull request, and by publish-github.sh before a
# release, so a secret cannot reach main unnoticed. Exits non-zero if one is found.
#
# The pattern is assembled from fragments so that this script does not match itself: a
# scanner that flags its own source is useless, and excluding the file would leave a blind
# spot. Every tracked file, including this one, is scanned.

set -euo pipefail

cd "$(dirname "$0")/.."

PRIV_KEY_HEAD='-----BEGIN '
SECRET_PATTERN="(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|xox[abprs]-[A-Za-z0-9-]{10,}|${PRIV_KEY_HEAD}[A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|npm_[A-Za-z0-9]{30,}|sk_live_[A-Za-z0-9]{10,}|rk_live_[A-Za-z0-9]{10,}|SG\.[A-Za-z0-9_-]{20,})"

if git grep -lIE "$SECRET_PATTERN" -- . 2>/dev/null; then
  echo "error: a possible secret was found in the tracked files." >&2
  exit 1
fi

echo "no secrets found in tracked files"
