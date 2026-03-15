---
name: sdd-init
description: >
  Initialize Spec-Driven Development context in the NERBIS project. Detects stack, conventions, and bootstraps the active persistence backend.
  Trigger: When user wants to initialize SDD in a project, or says "sdd init", "iniciar sdd".
license: MIT
metadata:
  author: nerbis-platform
  version: "1.0"
---

## Purpose

You are a sub-agent responsible for initializing the Spec-Driven Development (SDD) context in the NERBIS project. You detect the project stack and conventions, then bootstrap the active persistence backend.

## Execution and Persistence Contract

Read and follow `.claude/skills/_shared/persistence-contract.md` for mode resolution rules.

- If mode is `engram`:
  Do NOT create `openspec/` directory.

  **Save project context**:
  ```
  mem_save(
    title: "sdd-init/nerbis-platform",
    topic_key: "sdd-init/nerbis-platform",
    type: "architecture",
    project: "nerbis-platform",
    content: "{detected project context markdown}"
  )
  ```
  `topic_key` enables upserts — re-running init updates the existing context.

- If mode is `openspec`: Read and follow `.claude/skills/_shared/openspec-convention.md`. Run full bootstrap.
- If mode is `hybrid`: Follow BOTH convention files. Run openspec bootstrap AND persist context to Engram.
- If mode is `none`: Return detected context without writing project files.

## What to Do

### Step 1: Detect Project Context

Read the project to understand:

**Backend (Django 5 + DRF):**
- Apps in `backend/` (check for models.py in each app directory)
- Multi-tenancy setup: `backend/core/models.py` (TenantAwareModel), `backend/middleware/tenant.py`
- Test framework: Pytest with `backend/settings_test.py`
- Lint: Ruff (`ruff check backend/`)

**Frontend (Next.js 16 + React 19):**
- Routes in `frontend/src/app/`
- Context providers: AuthContext, CartContext, TenantContext, WebsiteContentContext
- Components: shadcn/ui
- Lint: ESLint (`cd frontend && npm run lint`)

**Infrastructure:**
- CI: GitHub Actions (backend + frontend pipelines)
- Git: conventional commits with commitlint + husky
- CodeRabbit: `.coderabbit.yaml`
- Release Please: semantic versioning on push to main

### Step 2: Initialize Persistence Backend

If mode resolves to `openspec`, create this directory structure:

```
openspec/
├── config.yaml
├── specs/
└── changes/
    └── archive/
```

### Step 3: Generate Config (openspec mode)

Based on detected context, create `openspec/config.yaml` following the template in `.claude/skills/_shared/openspec-convention.md`.

### Step 4: Build Skill Registry

Follow the same logic as `.claude/skills/skill-registry/SKILL.md`:

1. Scan `.claude/skills/` for non-SDD skills (multi-tenancy, shadcn, vercel-react-best-practices, web-design-guidelines)
2. Scan project root for conventions (AGENTS.md, CLAUDE.md, .cursorrules, docs/SDD.md)
3. **ALWAYS write `.atl/skill-registry.md`**
4. If engram is available, also save: `mem_save(title: "skill-registry", topic_key: "skill-registry", type: "config", project: "nerbis-platform", content: "{registry}")`

### Step 5: Persist Project Context

**This step is MANDATORY — do NOT skip it.**

If mode is `engram`:
```
mem_save(
  title: "sdd-init/nerbis-platform",
  topic_key: "sdd-init/nerbis-platform",
  type: "architecture",
  project: "nerbis-platform",
  content: "{your detected project context from Steps 1-4}"
)
```

### Step 6: Return Summary

```
## SDD Initialized

**Project**: nerbis-platform
**Stack**: Django 5 + DRF / Next.js 16 + React 19
**Persistence**: {engram | openspec | hybrid | none}

### Context Saved
{Details of what was persisted and where}

### Skills Found
| Skill | Path |
|-------|------|
| multi-tenancy | .claude/skills/multi-tenancy/SKILL.md |
| shadcn | .claude/skills/shadcn/SKILL.md |
| vercel-react-best-practices | .claude/skills/vercel-react-best-practices/SKILL.md |
| web-design-guidelines | .claude/skills/web-design-guidelines/SKILL.md |

### Next Steps
Ready for /sdd-explore <topic> or /sdd-new <change-name>.
```

## Rules

- NEVER create placeholder spec files — specs are created via sdd-spec during a change
- ALWAYS detect the real tech stack, don't guess
- If the project already has an `openspec/` directory, report what exists
- Keep context CONCISE — no more than 10 lines
- Return a structured envelope with: `status`, `executive_summary`, `artifacts`, `next_recommended`, `risks`
