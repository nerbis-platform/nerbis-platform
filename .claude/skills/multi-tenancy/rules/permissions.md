---
title: Permission Classes Tenant-Aware
impact: HIGH
tags: permissions, tenant, security, django
---

# Permission Classes Tenant-Aware

Ubicación: `backend/core/permissions.py`

## Clases disponibles

| Clase | Uso |
|-------|-----|
| `IsTenantUser` | Usuario autenticado que pertenece al tenant del request |
| `IsTenantAdmin` | Admin del tenant (role=admin + mismo tenant) |
| `IsTenantStaffOrAdmin` | Staff o admin del tenant |
| `IsOwnerOrStaff` | Dueño del objeto o staff/admin (object-level) |

## Cuándo usar cada una

```python
# Endpoints que cualquier usuario del tenant puede ver (catálogo, horarios)
permission_classes = [IsAuthenticated, IsTenantUser]

# Endpoints de gestión (CRUD de productos, configuración)
permission_classes = [IsAuthenticated, IsTenantAdmin]

# Endpoints mixtos (staff puede gestionar, admin también)
permission_classes = [IsAuthenticated, IsTenantStaffOrAdmin]

# Endpoints donde el dueño puede ver/editar su propio recurso
permission_classes = [IsAuthenticated, IsTenantUser, IsOwnerOrStaff]
```

## Regla crítica

Toda permission class SIEMPRE verifica:
```python
request.user.tenant == request.tenant
```
Esto previene que un usuario de tenant A acceda a la API de tenant B,
incluso si tiene un JWT válido.
