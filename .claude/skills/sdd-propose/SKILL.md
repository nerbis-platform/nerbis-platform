---
name: sdd-propose
description: >
  Create a change proposal with intent, scope, and approach.
  Trigger: When the orchestrator launches you to create or update a proposal for a change.
license: MIT
metadata:
  author: nerbis-platform
  version: "1.0"
---

## Purpose

You are a sub-agent responsible for creating PROPOSALS. You take the exploration analysis (or direct user input) and produce a structured proposal document.

## What You Receive

From the orchestrator:
- Change name (e.g., "add-product-reviews")
- Exploration analysis (from sdd-explore) OR direct user description
- Artifact store mode (`engram | openspec | hybrid | none`)

## Execution and Persistence Contract

Read and follow `.claude/skills/_shared/persistence-contract.md` for mode resolution rules.

- If mode is `engram`:

  **Read dependencies** (two-step — search returns truncated previews):
  1. `mem_search(query: "sdd/{change-name}/explore", project: "nerbis-platform")` → get observation ID (optional — may not exist)
  2. If found: `mem_get_observation(id: {id})` → full exploration content
  3. `mem_search(query: "sdd-init/nerbis-platform", project: "nerbis-platform")` → project context (optional)
  4. If found: `mem_get_observation(id: {id})` → full project context

  **Save your artifact**:
  ```text
  mem_save(
    title: "sdd/{change-name}/proposal",
    topic_key: "sdd/{change-name}/proposal",
    type: "architecture",
    project: "nerbis-platform",
    content: "{your full proposal markdown}"
  )
  ```

- If mode is `openspec`: Read and follow `.claude/skills/_shared/openspec-convention.md`.
- If mode is `hybrid`: Follow BOTH conventions.
- If mode is `none`: Return result only.

## What to Do

### Step 0: Sync with develop (MANDATORY)

**Before ANY analysis, ensure you are working on the latest code from GitHub.**

```bash
git fetch origin develop
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "develop" ]; then
  git pull origin develop
else
  git rebase origin/develop
fi
```

If the rebase has conflicts, STOP and report to the user. Do NOT continue with stale code.

### Step 1: Load Skill Registry

**Do this FIRST, before any other work.**

1. Try engram first: `mem_search(query: "skill-registry", project: "nerbis-platform")` → if found, `mem_get_observation(id)` for the full registry
2. If engram not available or not found: read `.atl/skill-registry.md` from the project root
3. If neither exists: proceed without skills (not an error)

From the registry, identify and read any skills whose triggers match your task. Also read any project convention files listed in the registry.

### Step 2: Create Change Directory (openspec/hybrid only)

**IF mode is `openspec` or `hybrid`:** create the change folder:
```text
openspec/changes/{change-name}/
└── proposal.md
```

**IF mode is `engram` or `none`:** Skip this step.

### Step 3: Read Existing Specs (openspec/hybrid only)

**IF mode is `openspec` or `hybrid`:** Read `openspec/specs/` if relevant specs exist.

### Step 4: Write Proposal

```markdown
# Proposal: {Change Title}

## Intent

{What problem are we solving? Why does this change need to happen?}

## Scope

### In Scope
- {Concrete deliverable 1}
- {Concrete deliverable 2}

### Out of Scope
- {What we're explicitly NOT doing}

## Approach

{High-level technical approach. Reference the recommended approach from exploration if available.}

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `path/to/area` | New/Modified/Removed | {What changes} |

## Multi-Tenancy Impact

{Required if ANY backend model, view, or serializer is in scope.}
- New models: {Will they inherit TenantAwareModel?}
- Queries: {Any cross-tenant query risk?}
- Permissions: {Which permission classes apply?}
- Tests: {Tenant isolation test scenarios needed?}

{If change is frontend-only: "No multi-tenancy impact — frontend-only change."}

## Module Impact

{Required if change affects feature flags in Tenant model.}
- Affected modules: {has_website, has_shop, has_bookings, etc.}

{If no module flags affected: "No module impact."}

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| {Risk description} | Low/Med/High | {How we mitigate} |

## Rollback Plan

{How to revert if something goes wrong. Be specific.}

## Dependencies

- {External dependency or prerequisite, if any}

## Success Criteria

- [ ] {How do we know this change succeeded?}
- [ ] {Measurable outcome}
```

### Step 5: Persist Artifact

**This step is MANDATORY — do NOT skip it.**

If mode is `engram`:
```text
mem_save(
  title: "sdd/{change-name}/proposal",
  topic_key: "sdd/{change-name}/proposal",
  type: "architecture",
  project: "nerbis-platform",
  content: "{your full proposal markdown from Step 4}"
)
```

If mode is `openspec` or `hybrid`: Write the proposal content to `openspec/changes/{change-name}/proposal.md` (directory was created in Step 2).

If mode is `hybrid`: also call `mem_save` as above (write to BOTH backends).

If you skip this step, the next phase (sdd-spec) will NOT be able to find your proposal and the pipeline BREAKS.

### Step 6: Return Summary

```markdown
## Proposal Created

**Change**: {change-name}

### Summary
- **Intent**: {one-line summary}
- **Scope**: {N deliverables in, M items deferred}
- **Approach**: {one-line approach}
- **Risk Level**: {Low/Medium/High}
- **Multi-Tenancy Impact**: {Yes/No}

### Next Step
Ready for specs (sdd-spec) and design (sdd-design) — these can run in parallel.
```

## Rules

- Keep the proposal CONCISE — it's a thinking tool, not a novel
- Every proposal MUST have a rollback plan
- Every proposal MUST have success criteria
- Use concrete file paths in "Affected Areas" when possible
- ALWAYS include "Multi-Tenancy Impact" section when backend code is in scope
- ALWAYS include "Module Impact" section when tenant feature flags might be affected
- After the summary above, ALWAYS append a structured envelope: `{ status, executive_summary, artifacts: [{name, store, ref}], next_recommended: [...], risks: [...] }`
