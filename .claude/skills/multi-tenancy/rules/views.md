---
title: ViewSets Tenant-Aware
impact: CRITICAL
tags: views, viewsets, tenant, django
---

# ViewSets Tenant-Aware

Toda view que acceda datos de tenant DEBE:
1. Filtrar en `get_queryset()` por `request.tenant`
2. Asignar tenant en `perform_create()` con `request.tenant`

## Patrón correcto

```python
class MiModeloViewSet(viewsets.ModelViewSet):
    serializer_class = MiModeloSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]

    def get_queryset(self):
        # Swagger/schema generation check
        if getattr(self, "swagger_fake_view", False):
            return MiModelo.objects.none()

        # SIEMPRE filtrar por tenant explícitamente
        queryset = MiModelo.objects.filter(tenant=self.request.tenant)

        # Lógica de visibilidad por rol
        user = self.request.user
        if not (user.is_authenticated and user.role in ("admin", "staff")):
            queryset = queryset.filter(is_active=True)

        return queryset

    def perform_create(self, serializer):
        # SIEMPRE asignar tenant desde request
        serializer.save(tenant=self.request.tenant)
```

## Errores comunes

**Incorrecto** — no filtrar por tenant:
```python
def get_queryset(self):
    return MiModelo.objects.all()  # MAL: expone datos de otros tenants
```

**Incorrecto** — asignar tenant en serializer:
```python
# En el serializer
tenant = serializers.HiddenField(default=CurrentTenantDefault())  # MAL
```

**Correcto** — tenant se asigna en perform_create:
```python
def perform_create(self, serializer):
    serializer.save(tenant=self.request.tenant)  # BIEN
```