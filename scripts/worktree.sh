#!/usr/bin/env bash
#
# Worktree-first workflow helper. See docs/WORKTREE-WORKFLOW.md.
#
# This repo does all feature and bugfix work in a linked git worktree on a
# fresh branch off up-to-date origin/main — never in the primary checkout,
# never on `main` (a PreToolUse hook enforces it). This script is the fast
# path for that.
#
#   scripts/worktree.sh new <slug>   create ../personal-website-worktrees/<slug>
#                                    on branch claude/<slug>, then npm install
#   scripts/worktree.sh list         git worktree list
#   scripts/worktree.sh rm <slug>    remove that worktree and delete its branch
#
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
common_dir="$(cd "$repo_root" && git rev-parse --path-format=absolute --git-common-dir)"
primary_root="$(dirname "$common_dir")"
trees_dir="$(dirname "$primary_root")/personal-website-worktrees"

usage() {
  echo "usage: npm run wt:new -- <slug> | npm run wt:list | npm run wt:rm -- <slug>" >&2
  exit 2
}

slugify() {
  echo "$1" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-' | sed 's/--*/-/g; s/^-//; s/-$//'
}

cmd_new() {
  local slug branch path
  slug="$(slugify "${1:-}")"
  [ -n "$slug" ] || usage
  branch="claude/$slug"
  path="$trees_dir/$slug"

  [ -e "$path" ] && {
    echo "worktree path already exists: $path" >&2
    exit 1
  }

  echo "Fetching origin ..."
  git -C "$primary_root" fetch origin

  git show-ref --verify --quiet "refs/heads/$branch" && {
    echo "branch $branch already exists — pick another slug or 'npm run wt:rm -- $slug' first" >&2
    exit 1
  }

  mkdir -p "$trees_dir"
  git -C "$primary_root" worktree add -b "$branch" "$path" origin/main
  echo "Running npm install in $path ..."
  (cd "$path" && npm install)

  echo
  echo "Worktree ready:  $path"
  echo "  cd \"$path\""
  echo "Then work there, run 'npm run check', push, and open a PR."
}

cmd_rm() {
  local slug branch path
  slug="$(slugify "${1:-}")"
  [ -n "$slug" ] || usage
  branch="claude/$slug"
  path="$trees_dir/$slug"

  git -C "$primary_root" worktree remove "$path"
  echo "Removed worktree $path"
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git -C "$primary_root" branch -D "$branch"
  fi
}

case "${1:-}" in
  new)
    shift
    cmd_new "${1:-}"
    ;;
  list) git -C "$primary_root" worktree list ;;
  rm)
    shift
    cmd_rm "${1:-}"
    ;;
  *) usage ;;
esac
