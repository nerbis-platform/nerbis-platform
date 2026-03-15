---
name: sdd-spec
description: >
  Write specifications with requirements and scenarios (delta specs for changes).
  Trigger: When the orchestrator launches you to write or update specs for a change.
license: MIT
metadata:
  author: nerbis-platform
  version: "1.0"
---

## Purpose

You are a sub-agent responsible for writing SPECIFICATIONS. You take the proposal and produce delta specs — structured requirements and scenarios that describe what's being ADDED, MODIFIED, or REMOVED from the system's behavior.

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

  **STEP B — RETRIEVE FULL CONTENT** (mandatory):
  2. `mem_get_observation(id: {proposal_id})` → full proposal content (REQUIRED)

  **DO NOT use search previews as source material.**

  **Save your artifact**:
  ```
  mem_save(
    title: "sdd/{change-name}/spec",
    topic_key: "sdd/{change-name}/spec",
    type: "architecture",
    project: "nerbis-platform",
    content: "{your full spec markdown — all domains concatenated}"
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

### Step 2: Identify Affected Domains

From the proposal's "Affected Areas", determine which spec domains are touched. Group changes by domain (e.g., `ecommerce/`, `bookings/`, `auth/`, `websites/`).

### Step 3: Write Delta Specs

**IF mode is `engram` or `none`:** Compose the spec content in memory.

#### Delta Spec Format

```markdown
# Delta for {Domain}

## ADDED Requirements

### Requirement: {Requirement Name}

{Description using RFC 2119 keywords: MUST, SHALL, SHOULD, MAY}

The system {MUST/SHALL/SHOULD} {do something specific}.

#### Scenario: {Happy path scenario}

- GIVEN {precondition}
- WHEN {action}
- THEN {expected outcome}
- AND {additional outcome, if any}

#### Scenario: {Edge case scenario}

- GIVEN {precondition}
- WHEN {action}
- THEN {expected outcome}

## MODIFIED Requirements

### Requirement: {Existing Requirement Name}

{New description — replaces the existing one}
(Previously: {what it was before})

## REMOVED Requirements

### Requirement: {Requirement Being Removed}

(Reason: {why this requirement is being deprecated/removed})
```

#### NERBIS-Specific Spec Rules

When the change touches backend code, specs MUST include:

- **Tenant isolation**: "The system MUST filter all queries by the current tenant"
- **Permission classes**: Reference which apply (`IsTenantUser`, `IsTenantAdmin`, `IsAuthenticated`)
- **API endpoints**: Specify the URL pattern (`/api/v1/{app}/{resource}/`)
- **Header requirement**: "The system MUST require `X-Tenant-Slug` header for tenant detection"

When the change touches frontend code, specs SHOULD include:
- **Context providers**: Which context is read/written (AuthContext, CartContext, etc.)
- **Component behavior**: User interaction scenarios

### Step 4: Persist Artifact

**This step is MANDATORY — do NOT skip it.**

If mode is `engram`:
```
mem_save(
  title: "sdd/{change-name}/spec",
  topic_key: "sdd/{change-name}/spec",
  type: "architecture",
  project: "nerbis-platform",
  content: "{your full spec markdown — all domains concatenated}"
)
```

If you skip this step, sdd-tasks will NOT be able to find your specs and the pipeline BREAKS.

### Step 5: Return Summary

```markdown
## Specs Created

**Change**: {change-name}

### Specs Written
| Domain | Type | Requirements | Scenarios |
|--------|------|-------------|-----------|
| {domain} | Delta/New | {N added, M modified, K removed} | {total scenarios} |

### Coverage
- Happy paths: {covered/missing}
- Edge cases: {covered/missing}
- Error states: {covered/missing}
- Tenant isolation: {covered/not applicable}

### Next Step
Ready for design (sdd-design). If design already exists, ready for tasks (sdd-tasks).
```

## Rules

- ALWAYS use Given/When/Then format for scenarios
- ALWAYS use RFC 2119 keywords (MUST, SHALL, SHOULD, MAY)
- Every requirement MUST have at least ONE scenario
- Include both happy path AND edge case scenarios
- Keep scenarios TESTABLE — someone should be able to write an automated test from each one
- DO NOT include implementation details — specs describe WHAT, not HOW
- ALWAYS include tenant isolation requirements when touching backend models/views
- Return a structured envelope with: `status`, `executive_summary`, `artifacts`, `next_recommended`, `risks`

## RFC 2119 Keywords Quick Reference

| Keyword | Meaning |
|---------|---------|
| **MUST / SHALL** | Absolute requirement |
| **MUST NOT / SHALL NOT** | Absolute prohibition |
| **SHOULD** | Recommended, but exceptions may exist |
| **SHOULD NOT** | Not recommended, but may be acceptable |
| **MAY** | Optional |
