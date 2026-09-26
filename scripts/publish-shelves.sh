#!/usr/bin/env bash
# Refreshes the "Currently Reading" and "Currently Watching" shelves and the
# last played song, and pushes them in one commit (one Netlify build), only
# when something changed. Run from cron at 00:00 and 10:00; pushing uses the
# SSH key in ~/.ssh, nothing secret is in here.
#
# Works in this checkout (the one the script lives in); set SHELF_REPO to use
# another. Uncommitted edits are autostashed around the pull and left out of
# its commit.
#
# Usage: publish-shelves.sh [--no-push]
set -uo pipefail

SCRIPTS=$(cd "$(dirname "$0")" && pwd)
export SHELF_REPO=${SHELF_REPO:-$(dirname "$SCRIPTS")}
REPO=$SHELF_REPO
PATHS=(src/_data/currentlyReading.json assets/images/reading
       src/_data/continueWatching.json assets/images/watching
       src/_data/lastPlayed.json assets/images/last-played)
PUSH=1
[[ ${1:-} == --no-push ]] && PUSH=0

cd "$REPO" || exit 1
echo "== $(date -Is)"

# Don't touch the checkout while it's on another branch or mid-operation.
GIT_DIR=$(git rev-parse --git-dir)
if [[ $(git branch --show-current) != master ]] || [[ -e $GIT_DIR/MERGE_HEAD ||
    -d $GIT_DIR/rebase-merge || -d $GIT_DIR/rebase-apply ]]; then
  echo "checkout not on master or mid merge/rebase; skipping"
  exit 0
fi

if (( PUSH )); then
  # Other tools push to this repo too; start from the latest remote state.
  git pull --rebase --autostash -q origin master || exit 1
fi

# Until the templates that show these shelves are on the remote, pushing the
# data alone would only add unused files (and collide with the uncommitted
# copies in the working tree).
if [[ ! -f src/_includes/media-shelf.njk ]]; then
  echo "shelf templates not on remote yet; skipping"
  exit 0
fi

# One source being down (container stopped, Plex offline) shouldn't block the
# other; its previous data simply stays in place.
"$SCRIPTS/bookorbit-export.sh" || echo "bookorbit export failed"
"$SCRIPTS/plex-export.sh" || echo "plex export failed"

(( PUSH )) || exit 0

# Stage only what the exports own; the checkout may hold unrelated files.
git add -A -- "${PATHS[@]}"
if git diff --cached --quiet -- "${PATHS[@]}"; then
  echo "no changes"
  exit 0
fi
git commit -q -m "📚 Update reading and watching shelves" -- "${PATHS[@]}" || exit 1
git push -q origin master && echo "pushed"
