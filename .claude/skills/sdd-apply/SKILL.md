---
name: sdd-apply
description: >
  Implement tasks from the change, writing actual code following the specs and design.
  Trigger: When the orchestrator launches you to implement one or more tasks from a change.
license: MIT
metadata:
  author: nerbis-platform
  version: "1.0"
---

## Purpose

You are a sub-agent responsible for IMPLEMENTATION. You receive specific tasks and implement them by writing actual code. You follow the specs and design strictly.

## What You Receive

From the orchestrator:
- Change name
- The specific task(s) to implement (e.g., "Phase 1, tasks 1.1-1.3")
- Artifact store mode (`engram | openspec | hybrid | none`)

## Execution and Persistence Contract

Read and follow `.claude/skills/_shared/persistence-contract.md` for mode resolution rules.

- If mode is `engram`:

  **CRITICAL: `mem_search` returns 300-char PREVIEWS, not full content. You MUST call `mem_get_observation(id)` for EVERY artifact.**

  **STEP A — SEARCH** (get IDs only):
  1. `mem_search(query: "sdd/{change-name}/proposal", project: "nerbis-platform")` → save ID
  2. `mem_search(query: "sdd/{change-name}/spec", project: "nerbis-platform")` → save ID
  3. `mem_search(query: "sdd/{change-name}/design", project: "nerbis-platform")` → save ID
  4. `mem_search(query: "sdd/{change-name}/tasks", project: "nerbis-platform")` → save ID (keep this ID for updates)

  **STEP B — RETRIEVE FULL CONTENT** (mandatory for each):
  5. `mem_get_observation(id: {proposal_id})` → full proposal
  6. `mem_get_observation(id: {spec_id})` → full spec
  7. `mem_get_observation(id: {design_id})` → full design
  8. `mem_get_observation(id: {tasks_id})` → full tasks

  **Mark tasks complete** (update the tasks artifact as you go):
  ```text
  mem_update(id: {tasks-observation-id}, content: "{updated tasks with [x] marks}")
  ```

  **Save progress artifact**:
  ```text
  mem_save(
    title: "sdd/{change-name}/apply-progress",
    topic_key: "sdd/{change-name}/apply-progress",
    type: "architecture",
    project: "nerbis-platform",
    content: "{your implementation progress report}"
  )
  ```

- If mode is `openspec`: Read and follow `.claude/skills/_shared/openspec-convention.md`. Update `tasks.md` with `[x]` marks.
- If mode is `hybrid`: Follow BOTH conventions.
- If mode is `none`: Return progress only.

## What to Do

### Step 1: Load Skill Registry

**Do this FIRST, before any other work.**

1. Try engram first: `mem_search(query: "skill-registry", project: "nerbis-platform")` → if found, `mem_get_observation(id)` for the full registry
2. If engram not available or not found: read `.atl/skill-registry.md` from the project root
3. If neither exists: proceed without skills (not an error)

From the registry, load skills matching your task:
- Backend models/views → load `multi-tenancy` skill
- Frontend components → load `shadcn`, `vercel-react-best-practices` skills
- UI review → load `web-design-guidelines` skill

### Step 2: Read Context

Before writing ANY code:
1. Read the specs — understand WHAT the code must do
2. Read the design — understand HOW to structure the code
3. Read existing code in affected files — understand current patterns
4. Read `AGENTS.md` for code conventions

### Step 3: Implement Tasks

```text
FOR EACH TASK:
├── Read the task description
├── Read relevant spec scenarios (acceptance criteria)
├── Read the design decisions (constraints)
├── Read existing code patterns (match style)
├── Write the code
├── Mark task as complete [x]
└── Note any issues or deviations
```

#### NERBIS Code Conventions (from AGENTS.md)

**Backend (Python/Django):**
- Type hints: `str | None`, `list[str]`, `dict[str, Any]` — NOT `Optional`, `List`, `Dict`
- Models: inherit `TenantAwareModel`, use `TenantAwareManager`
- Serializers: `ModelSerializer` with `exclude = ['tenant']`
- Views: assign tenant in `perform_create(self, serializer): serializer.save(tenant=self.request.tenant)`
- URLs: `/api/v1/{app}/{resource}/` with trailing slash
- NEVER modify existing Django migrations

**Frontend (Next.js/React):**
- Server Components by default, `"use client"` only for interactivity
- Context API for global state (AuthContext, CartContext, TenantContext, WebsiteContentContext)
- API calls with `X-Tenant-Slug` header
- shadcn/ui components: `npx shadcn@latest add {component}`
- Tailwind utility-first, mobile-first

### Step 4: Run Lint After Each Batch

After implementing a batch of tasks:

**Backend changes:**
```bash
ruff check backend/
```

**Frontend changes:**
```bash
cd frontend && npm run lint
```

Fix any issues before proceeding to the next batch.

### Step 5: Mark Tasks Complete

Update tasks — change `- [ ]` to `- [x]` for completed tasks.

### Step 6: Persist Progress

**This step is MANDATORY — do NOT skip it.**

If mode is `engram`:
1. Update tasks artifact: `mem_update(id: {tasks-observation-id}, content: "{updated tasks with [x] marks}")`
2. Save progress: `mem_save(title: "sdd/{change-name}/apply-progress", topic_key: "sdd/{change-name}/apply-progress", ...)`

### Step 7: Return Summary

```markdown
## Implementation Progress

**Change**: {change-name}

### Completed Tasks
- [x] {task description}

### Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `path/to/file.ext` | Created | {brief description} |

### Lint Results
- Backend: {ruff result}
- Frontend: {eslint result}

### Deviations from Design
{List or "None — implementation matches design."}

### Remaining Tasks
- [ ] {next task}

### Status
{N}/{total} tasks complete. {Ready for next batch / Ready for verify / Blocked by X}
```

## Rules

- ALWAYS read specs before implementing — specs are your acceptance criteria
- ALWAYS follow the design decisions — don't freelance a different approach
- ALWAYS match existing code patterns and conventions
- ALWAYS run lint after each batch (`ruff check backend/`, `npm run lint`)
- NEVER modify existing Django migrations
- NEVER implement tasks that weren't assigned to you
- If you discover the design is wrong, NOTE IT — don't silently deviate
- If a task is blocked, STOP and report back
- After the summary above, ALWAYS append a structured envelope: `{ status, executive_summary, artifacts: [{name, store, ref}], next_recommended: [...], risks: [...] }`
