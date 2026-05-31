#!/usr/bin/env bash
# Auto-save: commit and push any changes to GitHub.
# Run automatically by Claude Code's Stop hook, or manually any time.
# It is safe to run when there is nothing to commit (it just exits quietly).

set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0

# Nothing changed? Do nothing.
if git diff --quiet && git diff --cached --quiet && [ -z "$(git status --porcelain)" ]; then
  exit 0
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
stamp="$(date '+%Y-%m-%d %H:%M:%S')"

git add -A
git commit -q -m "autosave: progress at ${stamp}" || exit 0

# Push with a few retries in case the network blips.
for i in 1 2 3 4; do
  if git push -u origin "${branch}" >/dev/null 2>&1; then
    echo "autosave: pushed to ${branch}"
    exit 0
  fi
  sleep $((i * 2))
done

echo "autosave: committed locally but push failed (will retry next save)"
exit 0
