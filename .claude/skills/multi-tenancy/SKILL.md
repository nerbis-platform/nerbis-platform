---
name: multi-tenancy
description: >
  Patrones y reglas de multi-tenancy para Django. Se activa cuando se crean o modifican
  modelos, views, serializers, tests, o cualquier código que toque datos de tenant.
user-invocable: false
metadata:
  author: nerbis-platform
  version: "1.0.0"
---

# Multi-Tenancy — Django (Shared DB, Tenant-per-Request)

## Arquitectura

```
Request → TenantMiddleware → request.tenant + thread-local context
                                    ↓
              TenantAwareModel → TenantAwareManager (auto-filtra por tenant)
```

- **Detección:** header `X-Tenant-Slug` > subdominio (middleware)
- **Context:** thread-local storage (`core/context.py`) — disponible en todo el request
- **Filtrado:** `TenantAwareManager` filtra automáticamente, pero views SIEMPRE filtran explícitamente
- **Asignación:** `perform_create()` asigna `tenant=request.tenant`

## Reglas CRÍTICAS (nunca violar)

1. **NUNCA** crear un modelo de negocio sin heredar de `TenantAwareModel`
2. **NUNCA** hacer queries sin filtro de tenant (excepto endpoints públicos)
3. **NUNCA** exponer `tenant` o `tenant_id` en serializers o URLs
4. **NUNCA** permitir cross-tenant queries (un tenant viendo datos de otro)
5. **SIEMPRE** asignar tenant en `perform_create()`, nunca en el serializer
6. **SIEMPRE** verificar `user.tenant == request.tenant` en permisos

## Archivos clave del proyecto

| Archivo | Propósito |
|---------|-----------|
| `backend/core/models.py` | TenantAwareModel, Tenant model |
| `backend/core/managers.py` | TenantAwareManager (auto-filtrado) |
| `backend/core/context.py` | Thread-local: set/get/clear_current_tenant |
| `backend/core/permissions.py` | IsTenantUser, IsTenantAdmin, IsTenantStaffOrAdmin |
| `backend/middleware/tenant.py` | TenantMiddleware (detección) |
| `backend/conftest.py` | Fixtures de testing (tenant, api_client, auth clients) |

## Patrones detallados

- [Modelos](./rules/models.md) — cómo crear modelos tenant-aware
- [Views](./rules/views.md) — patrones de viewsets
- [Serializers](./rules/serializers.md) — reglas de serialización
- [Testing](./rules/testing.md) — fixtures y patrones de test
- [Permisos](./rules/permissions.md) — permission classes disponibles