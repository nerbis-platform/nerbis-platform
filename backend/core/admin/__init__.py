# backend/core/admin/__init__.py
"""
Paquete admin de core — importa todos los submodulos para que Django
los descubra automaticamente y para mantener backward compatibility
con imports como ``from core.admin import ShopModuleAdmin``.
"""

from .auth import SocialAccountAdmin, WebAuthnCredentialAdmin  # noqa: F401
from .base import (  # noqa: F401
    BookingsModuleAdmin,
    MarketingModuleAdmin,
    ServicesModuleAdmin,
    ShopModuleAdmin,
    TenantFilteredAdmin,
    is_superadmin,
)
from .content import BannerAdmin, PlatformModuleAdmin  # noqa: F401
from .tenant import (  # noqa: F401
    TenantAdmin,
    TenantAdminForm,
    TenantConfigAdmin,
    TenantWebsiteAdmin,
    TenantWebsiteForm,
)
from .user import (  # noqa: F401
    AuthMethodFilter,
    CustomUserCreationForm,
    UserAdmin,
)
