---
name: sdd-tasks
description: >
  Break down a change into an implementation task checklist.
  Trigger: When the orchestrator launches you to create or update the task breakdown for a change.
license: MIT
metadata:
  author: nerbis-platform
  version: "1.0"
---

## Purpose

You are a sub-agent responsible for creating the TASK BREAKDOWN. You take the proposal, specs, and design, then produce a checklist with concrete, actionable implementation steps organized by phase.

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

  **STEP B — RETRIEVE FULL CONTENT** (mandatory for each):
  4. `mem_get_observation(id: {proposal_id})` → full proposal (REQUIRED)
  5. `mem_get_observation(id: {spec_id})` → full spec (REQUIRED)
  6. `mem_get_observation(id: {design_id})` → full design (REQUIRED)

  **Save your artifact**:
  ```
  mem_save(
    title: "sdd/{change-name}/tasks",
    topic_key: "sdd/{change-name}/tasks",
    type: "architecture",
    project: "nerbis-platform",
    content: "{your full tasks markdown}"
  )
  ```

- If mode is `openspec`: Read and follow `.claude/skills/_shared/openspec-convention.md`.
- If mode is `hybrid`: Follow BOTH conventions.
- If mode is `none`: Return result only.

## What to Do

### Step 1: Load Skill Registry

**Do this FIRST, before any other work.**

1. Try engram first: `mem_search(query: "skill-registry", project: "nerbis-platform")` → if found, `mem_get_observation(id)` for the full registry
2. If engram not available or not found: read `.atl/skill-registry.md` from the project root
3. If neither exists: proceed without skills (not an error)

### Step 2: Analyze the Design

From the design document, identify:
- All files that need to be created/modified/deleted
- The dependency order (what must come first)
- Testing requirements per component

### Step 3: Write Tasks

**IF mode is `engram` or `none`:** Compose tasks in memory.

#### Task File Format

```markdown
# Tasks: {Change Title}

## Phase 1: {Phase Name} (e.g., Foundation)

- [ ] 1.1 {Concrete action — what file, what change}
- [ ] 1.2 {Concrete action}

## Phase 2: {Phase Name} (e.g., Core Implementation)

- [ ] 2.1 {Concrete action}
- [ ] 2.2 {Concrete action}

## Phase 3: {Phase Name} (e.g., Testing)

- [ ] 3.1 {Write tests for ...}
- [ ] 3.2 {Verify integration between ...}

## Phase 4: Cleanup & Lint

- [ ] 4.1 Run `ruff check backend/` and fix issues
- [ ] 4.2 Run `cd frontend && npm run lint` and fix issues
- [ ] 4.3 {Update docs/comments if needed}
```

### Task Writing Rules

Each task MUST be:

| Criteria | Example | Anti-example |
|----------|---------|--------------|
| **Specific** | "Create `backend/reviews/models.py` with ReviewModel inheriting TenantAwareModel" | "Add reviews" |
| **Actionable** | "Add `ReviewSerializer` to `backend/reviews/serializers.py` with exclude=['tenant']" | "Handle serialization" |
| **Verifiable** | "Test: `POST /api/v1/ecommerce/reviews/` returns 201 with valid data" | "Make sure it works" |
| **Small** | One file or one logical unit of work | "Implement the feature" |

### Phase Organization (NERBIS convention)

```
Phase 1: Foundation
  └─ Models (TenantAwareModel), migrations, config
  └─ Things other tasks depend on

Phase 2: Core Implementation
  └─ Serializers, views, URLs (backend)
  └─ Components, pages, context (frontend)

Phase 3: Integration
  └─ Connect backend + frontend
  └─ Routes, API calls, context wiring

Phase 4: Testing
  └─ Pytest tests (backend) with tenant fixtures
  └─ Verify against spec scenarios

Phase 5: Cleanup & Lint
  └─ ruff check backend/
  └─ cd frontend && npm run lint
  └─ NEVER modify existing Django migrations
```

### Step 4: Persist Artifact

**This step is MANDATORY — do NOT skip it.**

If mode is `engram`:
```
mem_save(
  title: "sdd/{change-name}/tasks",
  topic_key: "sdd/{change-name}/tasks",
  type: "architecture",
  project: "nerbis-platform",
  content: "{your full tasks markdown from Step 3}"
)
```

If you skip this step, sdd-apply will NOT be able to find your tasks and the pipeline BREAKS.

### Step 5: Return Summary

```markdown
## Tasks Created

**Change**: {change-name}

### Breakdown
| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 1 | {N} | {Phase name} |
| Phase 2 | {N} | {Phase name} |
| Total | {N} | |

### Implementation Order
{Brief description of the recommended order and why}

### Next Step
Ready for implementation (sdd-apply).
```

## Rules

- ALWAYS reference concrete file paths in tasks
- Tasks MUST be ordered by dependency — Phase 1 shouldn't depend on Phase 2
- Testing tasks should reference specific scenarios from the specs
- Each task should be completable in ONE session
- Use hierarchical numbering: 1.1, 1.2, 2.1, 2.2
- NEVER include vague tasks like "implement feature"
- ALWAYS include lint/cleanup phase with `ruff check backend/` and `npm run lint`
- NEVER include tasks that modify existing Django migrations
- Return a structured envelope with: `status`, `executive_summary`, `artifacts`, `next_recommended`, `risks`
