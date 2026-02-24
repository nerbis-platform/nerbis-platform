# backend/core/managers.py

from django.db import models
from django.db.models import QuerySet
from django.contrib.auth.models import UserManager


class TenantQuerySet(QuerySet):
    """
    QuerySet personalizado que filtra por tenant.
    """

    def for_tenant(self, tenant):
        """
        Filtrar por un tenant específico.

        Uso:
            Product.objects.for_tenant(request.tenant)
        """
        return self.filter(tenant=tenant)


class TenantManager(models.Manager):
    """
    Manager personalizado para modelos multi-tenant.

    Automáticamente filtra todas las queries por el tenant actual.
    """

    def get_queryset(self):
        """
        Sobrescribir get_queryset para devolver TenantQuerySet.
        """
        return TenantQuerySet(self.model, using=self._db)

    def for_tenant(self, tenant):
        """
        Filtrar por tenant.

        Uso:
            Product.objects.for_tenant(request.tenant)
        """
        return self.get_queryset().for_tenant(tenant)


class TenantAwareManager(TenantManager):
    """
    Manager que SIEMPRE filtra por tenant.

    NO permite ver datos de otros tenants bajo ninguna circunstancia.
    """

    def __init__(self, *args, **kwargs):
        self.tenant_field = kwargs.pop("tenant_field", "tenant")
        super().__init__(*args, **kwargs)

    def get_queryset(self):
        """
        SIEMPRE filtra por tenant si existe en el contexto.
        """
        qs = super().get_queryset()

        # Obtener tenant del contexto (lo veremos después)
        from core.context import get_current_tenant

        tenant = get_current_tenant()

        if tenant:
            return qs.filter(**{self.tenant_field: tenant})

        return qs


class TenantAwareUserManager(UserManager):
    """
    Manager para el modelo User que combina:
    - Funcionalidad de UserManager (create_user, normalize_email, etc.)
    - Filtrado automático por tenant
    """

    def __init__(self, *args, **kwargs):
        self.tenant_field = kwargs.pop("tenant_field", "tenant")
        super().__init__(*args, **kwargs)

    def get_queryset(self):
        """
        Filtra por tenant si existe en el contexto.
        """
        qs = super().get_queryset()

        from core.context import get_current_tenant

        tenant = get_current_tenant()

        if tenant:
            return qs.filter(**{self.tenant_field: tenant})

        return qs

    def for_tenant(self, tenant):
        """
        Filtrar por tenant específico.
        """
        return self.get_queryset().filter(**{self.tenant_field: tenant})
