---
title: Modelos Tenant-Aware
impact: CRITICAL
tags: models, tenant, django
---

# Modelos Tenant-Aware

Todo modelo de negocio DEBE heredar de `TenantAwareModel`. Esto le da automáticamente:
- Campo `tenant` (FK a Tenant)
- Campos `created_at` y `updated_at`
- `TenantAwareManager` como manager por defecto
- Index compuesto `(tenant, created_at)`

## Patrón correcto

```python
from core.models import TenantAwareModel

class MiModelo(TenantAwareModel):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Mi Modelo"
        ordering = ["name"]
        # unique_together SIEMPRE incluye tenant
        unique_together = [["tenant", "slug"]]
        # indexes SIEMPRE incluyen tenant como primer campo
        indexes = [
            models.Index(fields=["tenant", "is_active"]),
        ]
```

## Errores comunes

**Incorrecto** — heredar de models.Model:
```python
class MiModelo(models.Model):  # MAL: sin tenant
    name = models.CharField(max_length=200)
```

**Incorrecto** — unique sin tenant:
```python
unique_together = [["slug"]]  # MAL: slug puede colisionar entre tenants
```

**Correcto** — unique CON tenant:
```python
unique_together = [["tenant", "slug"]]  # BIEN: único por tenant
```