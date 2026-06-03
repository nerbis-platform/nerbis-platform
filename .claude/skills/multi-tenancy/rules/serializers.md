---
title: Serializers Tenant-Aware
impact: HIGH
tags: serializers, tenant, django, drf
---

# Serializers Tenant-Aware

El campo `tenant` NUNCA debe aparecer en serializers. El tenant se asigna
server-side en `perform_create()`, nunca desde el cliente.

## Patrón correcto

```python
class MiModeloSerializer(serializers.ModelSerializer):
    class Meta:
        model = MiModelo
        # NUNCA incluir 'tenant' en fields
        fields = ["id", "name", "slug", "is_active"]
        read_only_fields = ["id", "slug"]
```

## Errores comunes

**Incorrecto** — exponer tenant:
```python
fields = ["id", "tenant", "name"]  # MAL: expone tenant_id al cliente
```

**Incorrecto** — tenant como campo writable:
```python
fields = "__all__"  # MAL: incluye tenant y permite que el cliente lo modifique
```

**Correcto** — listar campos explícitamente sin tenant:
```python
fields = ["id", "name", "slug", "is_active"]  # BIEN: sin tenant
```