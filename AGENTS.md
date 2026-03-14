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

- Cada tenant se identifica por: header `X-Tenant-Slug` > subdominio > query param (solo dev)
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

## CI/CD

- **Backend:** Ruff lint + Pytest (en PRs a main y develop)
- **Frontend:** ESLint + Next.js build (en PRs a main y develop)
- **CodeRabbit:** Review automático en cada PR
- **Release Please:** Versionamiento semántico automático en push a main
- Correr lint local antes de push: `ruff check backend/` y `cd frontend && npm run lint`

## Reglas críticas (NUNCA violar)

- NUNCA hardcodear credenciales, API keys, contraseñas
- NUNCA usar localStorage/sessionStorage (usar cookies httpOnly)
- NUNCA hacer cross-tenant queries
- NUNCA exponer tenant_id en URLs públicas
- SIEMPRE validar disponibilidad en booking antes de confirmar
- SIEMPRE usar transacciones para operaciones críticas (pagos, órdenes)
- SIEMPRE paginar listados
- GitHub Actions: pinear con commit hash (no tags)

## Checklist antes de generar código

- [ ] ¿Considera el multi-tenant?
- [ ] ¿Tiene manejo de errores?
- [ ] ¿Está paginado (si es listado)?
- [ ] ¿Sigue las convenciones del proyecto?
- [ ] ¿No hay credenciales hardcodeadas?
