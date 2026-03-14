# NERBIS — Instrucciones del Proyecto

## Sobre el proyecto

Plataforma SaaS multi-tenant multi-industria. Lee `docs/SDD.md` antes de hacer cambios arquitectónicos.

- **Stack:** Django 5 + DRF (backend) / Next.js 16 + React 19 (frontend)
- **Monorepo:** backend/ + frontend/ + mobile/
- **Repo:** https://github.com/nerbis-platform/nerbis-platform

## Git y branching

- **Flujo:** `feature/*` o `fix/*` o `docs/*` → PR → `develop` → PR → `main`
- **PRs siempre a `develop`**, nunca directo a `main`
- `main` = producción. `develop` = integración
- Crear branches desde `develop` actualizado (`git checkout develop && git pull`)

## Commits

- **Conventional commits obligatorios** (commitlint + husky)
- Formato: `tipo(scope): descripción en minúsculas`
- Tipos: feat, fix, refactor, docs, ci, chore, test, style, perf
- Scopes comunes: websites, ecommerce, bookings, core, billing, infra
- Subject siempre en minúsculas (commitlint lo valida)
- Incluir co-author: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

## Antes de codear

1. Leer el SDD (`docs/SDD.md`) si el cambio toca la arquitectura
2. Usar worktree si se trabaja en paralelo con otros agentes
3. Verificar en qué branch estás antes de empezar
4. Crear branch desde `develop` (no desde `main` ni desde otro feature)

## CI/CD

- **Backend:** Ruff lint + format check + Pytest (en PRs a main y develop)
- **Frontend:** ESLint + Next.js build (en PRs a main y develop)
- **CodeRabbit:** Review automático en PRs a main y develop
- **Release Please:** Versionamiento semántico automático en push a main
- Correr lint local antes de push: `ruff check backend/` y `cd frontend && npm run lint`

## Skills

Para tareas de frontend, leer los skills instalados en `.claude/skills/` antes de actuar:

- `.claude/skills/web-design-guidelines` — diseño web, UI/UX, layouts, accesibilidad
- `.claude/skills/shadcn` — uso correcto de shadcn/ui + Radix UI
- `.claude/skills/vercel-react-best-practices` — patrones React 19 + Next.js performance

## Código

- No modificar migraciones existentes de Django (son registros inmutables)
- Python: type hints modernos (`dict`, `list`, `str | None` — no `Dict`, `List`, `Optional`)
- Backend: excluir migraciones del linting (ya configurado en pyproject.toml)
- Frontend: Shadcn/ui + Radix UI para componentes base
- Frontend: TailwindCSS 4 para estilos
- Frontend: Context API para estado global (AuthContext, CartContext, TenantContext, WebsiteContentContext)

## Multi-tenancy

- Todos los modelos de datos heredan de `TenantAwareModel`
- El tenant se detecta por: header `X-Tenant-Slug` > subdominio (middleware)
- El `TenantAwareManager` auto-filtra queries por tenant
- Nunca hacer queries sin filtro de tenant (excepto endpoints públicos)

## Seguridad

- No hardcodear secretos. Usar variables de entorno
- No commitear .env, credentials, o archivos con datos sensibles
- Actions de GitHub: pinear con commit hash (no tags)
- Rate limiting configurado en endpoints de auth
