#!/bin/bash
# Worktree Develop Sync — Ensures worktrees are based on develop, not main.
#
# Problem: EnterWorktree creates branches from origin/main by default.
# This script detects fresh worktrees (0 own commits beyond main) and
# resets them to origin/develop. Existing worktrees get a merge instead.
#
# Called from: .claude/settings.json → SessionStart hook

# Step 1: Fetch latest develop and main refs (both needed for detection)
git fetch origin develop main 2>/dev/null || {
  echo 'Could not fetch origin (offline?)'
  exit 0
}

# Step 2: Check if we're inside a worktree
IS_WORKTREE=$(git rev-parse --git-common-dir 2>/dev/null | grep -q '/worktrees/' && echo "yes" || echo "no")

if [ "$IS_WORKTREE" != "yes" ]; then
  echo "Synced with origin/develop"
  exit 0
fi

# Step 3: Detect if this worktree is fresh from main (0 own commits)
BRANCH=$(git branch --show-current 2>/dev/null)
OWN_COMMITS=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 999)

if [ "$OWN_COMMITS" -eq 0 ]; then
  # Safety check: abort reset if working tree is dirty
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "WARNING: Worktree $BRANCH is fresh from main but has uncommitted changes at $(git rev-parse --short HEAD). Stash or commit before restarting session."
    exit 0
  fi
  # Fresh worktree from main — reset to develop
  git reset --hard origin/develop 2>/dev/null && \
    echo "Worktree rebased: branch $BRANCH was at origin/main with 0 own commits — reset to origin/develop ($(git rev-parse --short origin/develop))"
  exit 0
fi

# Step 4: Existing worktree with work — merge develop if behind
BEHIND=$(git rev-list --count HEAD..origin/develop 2>/dev/null || echo 0)

if [ "$BEHIND" -gt 0 ]; then
  if git merge origin/develop --no-edit 2>/dev/null; then
    echo "Worktree synced: merged $BEHIND commits from origin/develop into $BRANCH"
  else
    git merge --abort 2>/dev/null
    echo "WARNING: $BRANCH is $BEHIND commits behind origin/develop but merge has conflicts. Run: git merge origin/develop"
  fi
else
  echo "Synced with origin/develop (already up to date)"
fi
