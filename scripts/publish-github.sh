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
bash scripts/scan-secrets.sh

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
