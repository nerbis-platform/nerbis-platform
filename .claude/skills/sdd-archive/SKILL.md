---
name: sdd-archive
description: >
  Sync delta specs to main specs and archive a completed change.
  Trigger: When the orchestrator launches you to archive a change after implementation and verification.
license: MIT
metadata:
  author: nerbis-platform
  version: "1.1"
---

## Purpose

You are a sub-agent responsible for ARCHIVING. You close the SDD cycle by creating an archive report with full lineage. If using openspec mode, you also merge delta specs into main specs and move the change folder to archive.

## What You Receive

From the orchestrator:
- Change name
- Artifact store mode (`engram | openspec | hybrid | none`)

## Execution and Persistence Contract

Read and follow `.claude/skills/_shared/persistence-contract.md` for mode resolution rules.

- If mode is `engram`:

  **CRITICAL: `mem_search` returns 300-char PREVIEWS, not full content. You MUST call `mem_get_observation(id)` for EVERY artifact.**

  **STEP A — SEARCH** (get IDs only):
  1. `mem_search(query: "sdd/{change-name}/proposal", project: "nerbis-platform")` → save ID
  2. `mem_search(query: "sdd/{change-name}/spec", project: "nerbis-platform")` → save ID
  3. `mem_search(query: "sdd/{change-name}/design", project: "nerbis-platform")` → save ID
  4. `mem_search(query: "sdd/{change-name}/tasks", project: "nerbis-platform")` → save ID
  5. `mem_search(query: "sdd/{change-name}/verify-report", project: "nerbis-platform")` → save ID

  **STEP B — RETRIEVE FULL CONTENT** (mandatory for each):
  6-10. `mem_get_observation(id: {id})` for each artifact

  **Record all observation IDs** — include them in the archive report for full traceability.

  **Save your artifact**:
  ```text
  mem_save(
    title: "sdd/{change-name}/archive-report",
    topic_key: "sdd/{change-name}/archive-report",
    type: "architecture",
    project: "nerbis-platform",
    content: "{your archive report with all observation IDs for lineage}"
  )
  ```

- If mode is `openspec`: Perform merge and archive folder moves.
- If mode is `hybrid`: Follow BOTH conventions.
- If mode is `none`: Return closure summary only.

## What to Do

### Step 1: Load Skill Registry

**Do this FIRST, before any other work.**

1. Try engram first: `mem_search(query: "skill-registry", project: "nerbis-platform")` → if found, `mem_get_observation(id)` for the full registry
2. If engram not available or not found: read `.atl/skill-registry.md` from the project root
3. If neither exists: proceed without skills (not an error)

### Step 2: Verify Prerequisites

Before archiving, check the verification report verdict:
- If verdict is **FAIL**: STOP. Do NOT archive. Report back to orchestrator.
- If verdict is **PASS** or **PASS WITH WARNINGS**: proceed.

### Step 3: Sync Delta Specs (openspec/hybrid only)

**IF mode is `engram`:** Skip — artifacts live in Engram only.
**IF mode is `none`:** Skip.

**IF mode is `openspec` or `hybrid`:** For each delta spec, merge into main specs:
- ADDED Requirements → Append to main spec
- MODIFIED Requirements → Replace matching requirement
- REMOVED Requirements → Delete from main spec

### Step 4: Move to Archive (openspec/hybrid only)

```text
openspec/changes/{change-name}/
  → openspec/changes/archive/YYYY-MM-DD-{change-name}/
```

### Step 5: NERBIS-Specific Actions

1. **Update `docs/SDD.md`** if the change introduced architectural modifications (new models, new API endpoints, new frontend routes). Suggest specific sections to update.

2. **Suggest PR creation** to `develop` branch:
   ```text
   Recommend: Create PR with title following conventional commits
   Branch: feature/{change-name} or fix/{change-name}
   Target: develop
   Include Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   ```

3. **Save learnings to Engram** if any discoveries/patterns were found during the SDD cycle:
   ```text
   mem_save(title: "{learning}", type: "discovery", project: "nerbis-platform", content: "...")
   ```

### Step 6: Persist Archive Report

**This step is MANDATORY — do NOT skip it.**

If mode is `engram`:
```text
mem_save(
  title: "sdd/{change-name}/archive-report",
  topic_key: "sdd/{change-name}/archive-report",
  type: "architecture",
  project: "nerbis-platform",
  content: "{archive report with all observation IDs}"
)
```

### Step 7: Return Summary

```markdown
## Change Archived

**Change**: {change-name}

### Artifact Lineage (Engram observation IDs)
| Artifact | Observation ID |
|----------|---------------|
| explore | #{id} |
| proposal | #{id} |
| spec | #{id} |
| design | #{id} |
| tasks | #{id} |
| verify-report | #{id} |
| archive-report | #{id} |

### NERBIS Actions
- SDD.md update needed: {Yes — sections X, Y / No}
- PR suggestion: {branch name} → develop
- Branch cleanup: {Pending — will execute after PR merge / Skipped}

### SDD Cycle Complete
The change has been fully planned, implemented, verified, and archived.
Ready for the next change.
```

### Step 8: Branch Cleanup (post-merge)

**This step runs AFTER the PR has been merged to `develop`.** If the PR has not been created or merged yet, include the cleanup instructions in the summary and skip execution.

**8.1 — Human Gate (MANDATORY)**

Before executing any cleanup, ask the user for confirmation:
```text
🧹 Branch cleanup ready. This will:
  - Delete remote branch: origin/{branch-name}
  - Delete local branch: {branch-name}
  - {If worktree: Remove worktree at {worktree-path}}
  - Switch to develop (updated)

Proceed with cleanup? (y/n)
```

Do NOT proceed without explicit user approval.

**8.2 — Detect context**

```bash
BRANCH_NAME=$(git branch --show-current)
IS_WORKTREE=$([ "$(git rev-parse --git-common-dir)" != "$(git rev-parse --git-dir)" ] && echo "yes" || echo "no")
WT_PATH=$(git rev-parse --show-toplevel)
```

**8.3 — Execute cleanup**

```bash
# Switch to develop first (required before deleting the current branch)
git checkout develop
git pull origin develop

# Delete remote branch (may already be deleted if "Automatically delete head branches" is enabled)
git push origin --delete {branch-name} 2>/dev/null || echo "Remote branch already deleted (auto-delete may be enabled)"

# Delete local branch (use -d for safe delete — fails if not fully merged)
git branch -d {branch-name}
```

**8.4 — Worktree cleanup (if applicable)**

If `IS_WORKTREE` was "yes":
```bash
# From the MAIN repo (not from inside the worktree)
MAIN_REPO="$(git rev-parse --git-common-dir | sed 's|/\.git$||')"
git -C "$MAIN_REPO" worktree remove {worktree-path}
```

**8.5 — Verify cleanup**

```bash
# Confirm branch is gone
git branch | grep -q "{branch-name}" && echo "⚠️ Local branch still exists" || echo "✅ Local branch deleted"
git ls-remote --heads origin {branch-name} | grep -q "{branch-name}" && echo "⚠️ Remote branch still exists" || echo "✅ Remote branch deleted"
echo "✅ On branch: $(git branch --show-current)"
```

> **Tip:** Consider enabling "Automatically delete head branches" in the GitHub repository settings (Settings → General → Pull Requests) to handle remote branch deletion automatically on merge.

## Rules

- NEVER archive a change with CRITICAL issues in its verification report
- If using openspec, ALWAYS sync delta specs BEFORE moving to archive
- When merging, PRESERVE requirements not mentioned in the delta
- Use ISO date format (YYYY-MM-DD) for archive folder prefix
- The archive is an AUDIT TRAIL — never delete or modify archived changes
- ALWAYS suggest SDD.md updates for architectural changes
- ALWAYS suggest PR creation to develop
- ALWAYS ask for user confirmation (Human Gate) before deleting branches or worktrees
- Use `git branch -d` (safe delete) — NEVER use `-D` (force delete) unless the user explicitly requests it
- After the summary above, ALWAYS append a structured envelope: `{ status, executive_summary, artifacts: [{name, store, ref}], next_recommended: [...], risks: [...] }`
