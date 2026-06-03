---
title: Testing Tenant-Aware
impact: HIGH
tags: testing, tenant, pytest, fixtures
---

# Testing Tenant-Aware

Usar las fixtures de `conftest.py` para tests con contexto de tenant.

## Fixtures disponibles

| Fixture | Descripción |
|---------|-------------|
| `tenant` | Tenant de prueba |
| `tenant_context` | Setea tenant en thread-local (limpia al final) |
| `api_client` | APIClient con header X-Tenant-Slug |
| `auth_admin_client` | APIClient autenticado como admin (JWT) |
| `auth_customer_client` | APIClient autenticado como customer (JWT) |
| `second_tenant` | Segundo tenant para tests de aislamiento |

## Patrón correcto

```python
class TestMiModelo:
    def test_create(self, auth_admin_client, tenant):
        response = auth_admin_client.post("/api/v1/mi-app/modelos/", {
            "name": "Test",
        })
        assert response.status_code == 201
        assert response.data["name"] == "Test"

    def test_isolation(self, auth_admin_client, second_tenant):
        """Datos de otro tenant no deben ser visibles."""
        MiModelo.objects.create(tenant=second_tenant, name="Otro")
        response = auth_admin_client.get("/api/v1/mi-app/modelos/")
        assert response.status_code == 200
        assert len(response.data["results"]) == 0  # No ve datos del otro tenant
```

## Reglas de testing

1. **SIEMPRE** usar `tenant_context` o fixtures que lo incluyan (api_client, auth_admin_client)
2. **SIEMPRE** probar aislamiento entre tenants (crear dato en second_tenant, verificar que no se ve)
3. **NUNCA** crear APIClient sin header X-Tenant-Slug
4. Las fixtures auth_admin_client y auth_customer_client son instancias independientes