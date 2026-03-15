# OpenSpec File Convention (shared across all SDD skills)

## Directory Structure

```text
openspec/
├── config.yaml              <- Project-specific SDD config
├── specs/                   <- Source of truth (main specs)
│   └── {domain}/
│       └── spec.md
└── changes/                 <- Active changes
    ├── archive/             <- Completed changes (YYYY-MM-DD-{change-name}/)
    └── {change-name}/       <- Active change folder
        ├── state.yaml       <- DAG state (orchestrator, survives compaction)
        ├── exploration.md   <- (optional) from sdd-explore
        ├── proposal.md      <- from sdd-propose
        ├── specs/           <- from sdd-spec
        │   └── {domain}/
        │       └── spec.md  <- Delta spec
        ├── design.md        <- from sdd-design
        ├── tasks.md         <- from sdd-tasks (updated by sdd-apply)
        └── verify-report.md <- from sdd-verify
```

## Artifact File Paths

| Skill | Creates / Reads | Path |
|-------|----------------|------|
| orchestrator | Creates/Updates | `openspec/changes/{change-name}/state.yaml` |
| sdd-init | Creates | `openspec/config.yaml`, `openspec/specs/`, `openspec/changes/`, `openspec/changes/archive/` |
| sdd-explore | Creates (optional) | `openspec/changes/{change-name}/exploration.md` |
| sdd-propose | Creates | `openspec/changes/{change-name}/proposal.md` |
| sdd-spec | Creates | `openspec/changes/{change-name}/specs/{domain}/spec.md` |
| sdd-design | Creates | `openspec/changes/{change-name}/design.md` |
| sdd-tasks | Creates | `openspec/changes/{change-name}/tasks.md` |
| sdd-apply | Updates | `openspec/changes/{change-name}/tasks.md` (marks `[x]`) |
| sdd-verify | Creates | `openspec/changes/{change-name}/verify-report.md` |
| sdd-archive | Moves | `openspec/changes/{change-name}/` → `openspec/changes/archive/YYYY-MM-DD-{change-name}/` |
| sdd-archive | Updates | `openspec/specs/{domain}/spec.md` (merges deltas into main specs) |

## Reading Artifacts

Each skill reads its dependencies from the filesystem:

```text
Proposal:  openspec/changes/{change-name}/proposal.md
Specs:     openspec/changes/{change-name}/specs/  (all domain subdirectories)
Design:    openspec/changes/{change-name}/design.md
Tasks:     openspec/changes/{change-name}/tasks.md
Config:    openspec/config.yaml
Main specs: openspec/specs/{domain}/spec.md
```

## Writing Rules

- ALWAYS create the change directory (`openspec/changes/{change-name}/`) before writing artifacts
- If a file already exists, READ it first and UPDATE it (don't overwrite blindly)
- If the change directory already exists with artifacts, the change is being CONTINUED
- Use the `openspec/config.yaml` `rules` section to apply project-specific constraints per phase

## Config File Reference

```yaml
# openspec/config.yaml
schema: spec-driven

context: |
  Tech stack: Django 5 + DRF (backend), Next.js 16 + React 19 (frontend)
  Architecture: Multi-tenant SaaS, monorepo (backend/ + frontend/ + mobile/)
  Testing: Pytest (backend), ESLint + Next.js build (frontend)
  Style: Ruff (Python), ESLint (JS/TS), conventional commits

rules:
  proposal:
    - Include rollback plan for risky changes
    - Include multi-tenancy impact if backend models are in scope
  specs:
    - Use Given/When/Then for scenarios
    - Use RFC 2119 keywords (MUST, SHALL, SHOULD, MAY)
    - Include tenant isolation requirements for backend changes
  design:
    - Include sequence diagrams for complex flows
    - Document architecture decisions with rationale
    - New models MUST inherit TenantAwareModel
  tasks:
    - Group by phase, use hierarchical numbering
    - Keep tasks completable in one session
    - Include lint steps in cleanup phase
  apply:
    - Follow existing code patterns (see AGENTS.md)
    tdd: false
    test_command: "pytest backend/"
    lint_backend: "ruff check backend/"
    lint_frontend: "cd frontend && npm run lint"
  verify:
    test_command: "pytest backend/"
    build_command: "cd frontend && npm run build"
    lint_backend: "ruff check backend/"
    lint_frontend: "cd frontend && npm run lint"
    coverage_threshold: 0
  archive:
    - Warn before merging destructive deltas
    - Suggest PR creation to develop branch
```

## Archive Structure

When archiving, the change folder moves to:
```text
openspec/changes/archive/YYYY-MM-DD-{change-name}/
```

Use today's date in ISO format. The archive is an AUDIT TRAIL — never delete or modify archived changes.
