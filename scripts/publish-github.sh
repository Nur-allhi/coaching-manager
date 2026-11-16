#!/usr/bin/env bash
#
# Create the public GitHub repository and push this project to it.
#
# Idempotent: if the repository already exists it is updated rather than re-created.
# Requires an authenticated `gh` (run `gh auth login` first) and SSH access to GitHub.
#
# Usage: ./scripts/publish-github.sh [owner/name]

set -euo pipefail

REPO_SLUG="${1:-Nur-allhi/coaching-manager}"
DESCRIPTION="Offline-first coaching manager for a coaching centre: admissions, fees, attendance, exams and reports. React 19 + TypeScript + SQLite (WASM) over OPFS."
TOPICS="react,typescript,sqlite,vite,offline-first,pwa,tailwindcss,shadcn,bangla"

cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
  echo "error: the working tree is dirty. Commit or stash first." >&2
  exit 1
fi

echo "==> Verifying the tree is safe to publish"

# The pattern is assembled from fragments so that this script does not match itself:
# a scanner that flags its own source is useless, and excluding the file would leave
# a blind spot. Every tracked file, including this one, is scanned.
PRIV_KEY_HEAD='-----BEGIN '
SECRET_PATTERN="(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|xox[abprs]-[A-Za-z0-9-]{10,}|${PRIV_KEY_HEAD}[A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|npm_[A-Za-z0-9]{30,}|sk_live_[A-Za-z0-9]{10,}|rk_live_[A-Za-z0-9]{10,}|SG\.[A-Za-z0-9_-]{20,})"

if git grep -lIE "$SECRET_PATTERN" -- . 2>/dev/null; then
  echo "error: a possible secret was found in the tracked files. Aborting." >&2
  exit 1
fi
echo "    no secrets found in tracked files"

if gh repo view "$REPO_SLUG" >/dev/null 2>&1; then
  echo "==> Repository $REPO_SLUG already exists, updating it"
else
  echo "==> Creating $REPO_SLUG (public)"
  gh repo create "$REPO_SLUG" \
    --public \
    --source=. \
    --remote=origin \
    --description "$DESCRIPTION"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "git@github.com:$REPO_SLUG.git"
else
  git remote add origin "git@github.com:$REPO_SLUG.git"
fi

echo "==> Pushing main"
git push -u origin main

echo "==> Setting the description and topics"
gh repo edit "$REPO_SLUG" --description "$DESCRIPTION" --add-topic $TOPICS

echo
echo "Done: https://github.com/$REPO_SLUG"
