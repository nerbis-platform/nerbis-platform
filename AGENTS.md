# NERBIS Platform — Agent Instructions

> Este archivo es leído automáticamente por todos los agentes de IA (Claude, Cursor, Copilot, etc.)
> Lee este archivo completo antes de generar cualquier código.

## ¿Qué es este proyecto?

Plataforma SaaS multi-tenant multi-industria para Latinoamérica.
Cualquier tipo de negocio puede ser un tenant: gimnasio, clínica, restaurante, estética, etc.
Referencia arquitectónica completa: `docs/SDD.md`

## Stack (NO cambiar)

- **Backend:** Python 3.12 + Django 5 + Django REST Framework
- **Frontend:** Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui
- **DB:** PostgreSQL 15
- **Cache/Queue:** Redis 7 + Celery
- **Pagos:** Stripe
- **Notificaciones:** Twilio (SMS/WhatsApp) + SES/SMTP (email)
- **Contenedores:** Docker + Docker Compose
- **Repo:** https://github.com/nerbis-platform/nerbis-platform

## Estructura del monorepo

```
backend/    → Django (apps: core, ecommerce, bookings, services, orders,
              cart, notifications, subscriptions, billing, reviews,
              coupons, promotions, websites)
frontend/   → Next.js (App Router)
mobile/     → Flutter (pendiente)
docs/       → Documentación técnica (SDD.md)
```

## Git y branching

- **Flujo:** `feature/*` o `fix/*` o `docs/*` → PR → `develop` → PR → `main`
- PRs **siempre a `develop`**, nunca directo a `main`
- `main` = producción. `develop` = integración
- Crear branches desde `develop` actualizado
- **Conventional commits obligatorios** (commitlint + husky)
- Formato: `tipo(scope): descripción en minúsculas`
- Tipos: feat, fix, refactor, docs, ci, chore, test, style, perf
- Scopes: websites, ecommerce, bookings, core, billing, infra, auth, services, orders, cart, notifications, subscriptions

## Arquitectura multi-tenant (CRÍTICO)

- Cada tenant se identifica por: header `X-Tenant-Slug` > subdominio (middleware)
- **TODOS** los modelos de negocio extienden `TenantAwareModel`
- **NUNCA** hacer queries sin filtro de tenant
- El middleware `TenantMiddleware` setea `request.tenant` automáticamente
- **NUNCA** exponer `tenant_id` en URLs públicas

## Convenciones — Backend

- Modelos heredan de `TenantAwareModel` (nunca de `models.Model` directo)
- APIs bajo `/api/v1/...` con paginación en todos los listados
- Permisos por rol: `super_admin`, `admin`, `staff`, `cliente`
- PEP 8 siempre. Linter: Ruff (`ruff check backend/`)
- Type hints modernos: `dict`, `list`, `str | None` (no `Dict`, `List`, `Optional`)
- No modificar migraciones existentes (son registros inmutables)
- Comentarios en español

## Convenciones — Frontend

- Server Components donde sea posible
- Tailwind utility-first (no CSS custom salvo globals.css)
- shadcn/ui + Radix UI para componentes base
- Context API para estado global (AuthContext, CartContext, TenantContext, WebsiteContentContext)
- Mobile-first, responsive
- **OBLIGATORIO: Seguir la identidad visual NERBIS** definida en `.claude/skills/nerbis-design-identity/`
  - Leer `SKILL.md` antes de crear cualquier componente o página
  - Usar tokens semánticos de color (no hex hardcodeados)
  - Respetar la tipografía (Geist Sans), spacing (4px grid), motion (150ms hover), y accesibilidad (WCAG AA)
  - Verificar contra el checklist anti-AI-slop antes de enviar PR

## CI/CD

- **Backend:** Ruff lint + Pytest (en PRs a main y develop)
- **Frontend:** ESLint + Next.js build (en PRs a main y develop)
- **CodeRabbit:** Review automático en cada PR
- **Release Please:** Versionamiento semántico automático en push a main
- Correr lint local antes de push: `ruff check backend/` y `npm run lint --prefix frontend`

## Comandos en skills y documentación (NUNCA usar `cd X && Y`)

Los comandos en skills, hooks y documentación **no deben usar `cd X && Y`** porque
las allowlists granulares de permisos (`Bash(cd:*)` + `Bash(npm:*)`) no matchean
comandos encadenados, forzando prompts de permiso innecesarios.

**Usar alternativas sin `cd`:**

| Herramienta | Mal | Bien |
|-------------|------|------|
| npm | `cd frontend && npm run lint` | `npm run lint --prefix frontend` |
| pytest | `cd backend && pytest` | `pytest backend/` |
| ruff | `cd backend && ruff check .` | `ruff check backend/` |
| git | `cd "$REPO" && git ...` | `git -C "$REPO" ...` |
| manage.py | `cd backend && python manage.py X` | `python backend/manage.py X` |
| general | `cd X && comando` | Usar flag `-C`, `--prefix`, o path absoluto |

**Excepciones válidas:** scripts de shell multi-línea donde `cd` es necesario para
establecer el directorio de trabajo (ej: setup de worktrees). La regla aplica a
one-liners encadenados con `&&`.

## Reglas críticas (NUNCA violar)

- NUNCA hardcodear credenciales, API keys, contraseñas
- NUNCA usar localStorage/sessionStorage (usar cookies httpOnly)
- NUNCA hacer cross-tenant queries
- NUNCA exponer tenant_id en URLs públicas
- SIEMPRE validar disponibilidad en booking antes de confirmar
- SIEMPRE usar transacciones para operaciones críticas (pagos, órdenes)
- SIEMPRE paginar listados
- GitHub Actions: pinear con commit hash (no tags)

## Worktrees y trabajo paralelo

- Los worktrees de Git proveen **aislamiento de branch**, no de filesystem
- Desde un worktree puedes leer/escribir archivos de cualquier path del sistema (mismos permisos que el repo principal)
- El `cwd` cambia al root del worktree — usar paths relativos al worktree actual, no al repo principal
- **NUNCA** usar `cd /ruta/repo/principal && comando` en scripts o skills; usar paths relativos o `$PWD`
- Los worktrees son ideales para que múltiples agentes trabajen en paralelo sin conflictos de branch
- No se necesita configuración especial de permisos para worktrees — las mismas reglas de `settings.json` aplican

## Checklist antes de generar código

- [ ] ¿Considera el multi-tenant?
- [ ] ¿Tiene manejo de errores?
- [ ] ¿Está paginado (si es listado)?
- [ ] ¿Sigue las convenciones del proyecto?
- [ ] ¿No hay credenciales hardcodeadas?
- [ ] ¿Sigue la identidad visual NERBIS? (si es frontend)
- [ ] ¿Pasó el checklist anti-AI-slop? (si es frontend)
- [ ] ¿Funciona en dark mode? (si es frontend)
- [ ] ¿Es accesible? (keyboard nav, aria-labels, contraste WCAG AA)
- [ ] ¿Funciona en mobile? (touch targets, responsive, bottom nav)
