# NERBIS — Instrucciones para Claude Code

## Contexto rápido

Plataforma SaaS multi-tenant. Lee `AGENTS.md` para reglas universales del proyecto.
Lee `docs/SDD.md` antes de cambios arquitectónicos.

- **Stack:** Django 5 + DRF (backend) / Next.js 16 + React 19 (frontend)
- **Monorepo:** backend/ + frontend/ + mobile/
- **Repo:** https://github.com/nerbis-platform/nerbis-platform

## Git (específico Claude)

- Incluir siempre: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Subject en minúsculas (commitlint lo valida)
- Usar prefijos: `feature/*`, `fix/*`, `docs/*` según el tipo de cambio
- Crear branch desde `develop` actualizado (`feature/*` o `fix/*` o `docs/*` → PR → `develop`)

## Antes de codear

1. Leer `AGENTS.md` si es primera tarea de la sesión
2. Leer `docs/SDD.md` si el cambio toca la arquitectura
3. Usar worktree si se trabaja en paralelo con otros agentes
4. Verificar branch actual antes de empezar

## Subagentes y paralelismo

### Cuándo usar subagentes (Task tool)
- **Exploración**: buscar patrones en el codebase sin saturar contexto principal
- **Tareas independientes**: lint backend + lint frontend en paralelo
- **Investigación**: leer docs largas (SDD.md) y resumir lo relevante
- **NO usar** para tareas que modifican los mismos archivos (riesgo de conflictos)

### Cuándo usar worktrees
- Múltiples agentes Claude trabajando en paralelo
- Tarea larga que no debe bloquear el branch principal
- Activar con: `claude -w nombre-feature "descripción de tarea"` o `claude --worktree nombre-feature "..."`
- Claude crea automáticamente `.claude/worktrees/nombre-feature` y el branch `worktree-nombre-feature`
- `EnterWorktree` es una acción interna de permisos — no es un comando manual

## Skills

Leer los skills relevantes en `.claude/skills/` antes de actuar:

**Frontend:**
- `.claude/skills/web-design-guidelines` — diseño web, UI/UX, layouts, accesibilidad
- `.claude/skills/shadcn` — uso correcto de shadcn/ui + Radix UI
- `.claude/skills/vercel-react-best-practices` — patrones React 19 + Next.js performance

**Backend:**
- `.claude/skills/multi-tenancy` — patrones multi-tenant (modelos, views, serializers, permisos, tests)

## Context7 — Documentación en tiempo real

Usar Context7 (MCP) para consultar documentación actualizada cuando:
- Implementes componentes con Next.js 16, React 19, TailwindCSS 4 o shadcn/ui
- Uses APIs específicas de Django 5 o DRF
- No estés seguro si una API cambió entre versiones

NO usar Context7 para: git, CI/CD, documentación, refactoring, o tareas que no tocan APIs de librerías.

## Código (específico Claude)

- Python: type hints modernos (`dict`, `list`, `str | None` — no `Dict`, `List`, `Optional`)
- No modificar migraciones existentes de Django
- Frontend: Context API para estado (AuthContext, CartContext, TenantContext, WebsiteContentContext)
- Todas las reglas de código, multi-tenancy y seguridad están en `AGENTS.md`

## CI/CD

- **Backend:** Ruff lint + format check + Pytest (en PRs a main y develop)
- **Frontend:** ESLint + Next.js build (en PRs a main y develop)
- **CodeRabbit:** Review automático en PRs
- **Release Please:** Versionamiento semántico en push a main
- Correr lint local antes de push: `ruff check backend/` y `cd frontend && npm run lint`
