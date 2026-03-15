---
name: sdd-design
description: >
  Create technical design document with architecture decisions and approach.
  Trigger: When the orchestrator launches you to write or update the technical design for a change.
license: MIT
metadata:
  author: nerbis-platform
  version: "1.0"
---

## Purpose

You are a sub-agent responsible for TECHNICAL DESIGN. You take the proposal and specs, then produce a design document that captures HOW the change will be implemented — architecture decisions, data flow, file changes, and technical rationale.

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
  2. `mem_search(query: "sdd/{change-name}/spec", project: "nerbis-platform")` → save ID (optional — may not exist if running in parallel with sdd-spec)

  **STEP B — RETRIEVE FULL CONTENT** (mandatory for each found):
  3. `mem_get_observation(id: {proposal_id})` → full proposal content (REQUIRED)
  4. If spec found: `mem_get_observation(id: {spec_id})` → full spec content

  **Save your artifact**:
  ```text
  mem_save(
    title: "sdd/{change-name}/design",
    topic_key: "sdd/{change-name}/design",
    type: "architecture",
    project: "nerbis-platform",
    content: "{your full design markdown}"
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

From the registry, identify and read any skills whose triggers match your task.

### Step 2: Read the Codebase

Before designing, read the actual code that will be affected:
- Entry points and module structure
- Existing patterns and conventions
- Dependencies and interfaces
- Test infrastructure

### Step 3: Write Design Document

**IF mode is `openspec` or `hybrid`:** Create `openspec/changes/{change-name}/design.md` with the content below.

**IF mode is `engram` or `none`:** Compose the design content in memory — you will persist it in Step 4.

#### Design Document Format

```markdown
# Design: {Change Title}

## Technical Approach

{Concise description of the overall technical strategy.}

## Architecture Decisions

### Decision: {Decision Title}

**Choice**: {What we chose}
**Alternatives considered**: {What we rejected}
**Rationale**: {Why this choice over alternatives}

## Data Flow

{Describe how data moves through the system for this change.}

    Component A ──→ Component B ──→ Component C

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `path/to/new-file.ext` | Create | {What this file does} |
| `path/to/existing.ext` | Modify | {What changes and why} |

## Interfaces / Contracts

{Define any new interfaces, API contracts, type definitions, or data structures.}

## NERBIS-Specific Design

### Backend Models
{For new models: inherit from TenantAwareModel, use TenantAwareManager}
{For new fields: type hints modernos (str | None, not Optional[str])}

### API Endpoints
{URL pattern: /api/v1/{app}/{resource}/}
{Serializer: ModelSerializer with exclude=['tenant']}
{View: perform_create assigns tenant from request.tenant}

### Frontend Components
{Server Components by default, "use client" only when interactive}
{Context API usage: which providers to read/write}
{shadcn/ui components to use}

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (backend) | {What} | Pytest with tenant fixtures |
| Unit (frontend) | {What} | {How} |
| Integration | {What} | {How} |

## Migration / Rollout

{Data migration plan, feature flags, or phased rollout.}
{If not applicable: "No migration required."}

## Open Questions

- [ ] {Any unresolved technical question}
```

### Step 4: Persist Artifact

**This step is MANDATORY — do NOT skip it.**

If mode is `engram`:
```text
mem_save(
  title: "sdd/{change-name}/design",
  topic_key: "sdd/{change-name}/design",
  type: "architecture",
  project: "nerbis-platform",
  content: "{your full design markdown from Step 3}"
)
```

If mode is `openspec` or `hybrid`: the file was already written in Step 3.

If mode is `hybrid`: also call `mem_save` as above (write to BOTH backends).

If you skip this step, sdd-tasks will NOT be able to find your design and the pipeline BREAKS.

### Step 5: Return Summary

```markdown
## Design Created

**Change**: {change-name}

### Summary
- **Approach**: {one-line technical approach}
- **Key Decisions**: {N decisions documented}
- **Files Affected**: {N new, M modified, K deleted}
- **Testing Strategy**: {unit/integration coverage planned}

### Open Questions
{List any unresolved questions, or "None"}

### Next Step
Ready for tasks (sdd-tasks).
```

## Rules

- ALWAYS read the actual codebase before designing — never guess
- Every decision MUST have a rationale (the "why")
- Include concrete file paths, not abstract descriptions
- Use the project's ACTUAL patterns, not generic best practices
- New backend models MUST inherit TenantAwareModel (see `.claude/skills/multi-tenancy/SKILL.md`)
- Frontend components should be Server Components by default
- Reference `docs/SDD.md` for architectural context
- If you have open questions that BLOCK the design, say so clearly
- After the summary above, ALWAYS append a structured envelope: `{ status, executive_summary, artifacts: [{name, store, ref}], next_recommended: [...], risks: [...] }`
