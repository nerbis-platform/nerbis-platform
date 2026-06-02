# backend/core/admin/auth.py
"""
Admin para SocialAccount y WebAuthnCredential (Passkeys).
"""

from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin as UnfoldModelAdmin

from ..admin_site import nerbis_admin_site
from ..models import SocialAccount, WebAuthnCredential


@admin.register(SocialAccount, site=nerbis_admin_site)
class SocialAccountAdmin(UnfoldModelAdmin):
    """
    Panel de administracion para Cuentas Sociales.
    Permite ver y gestionar las vinculaciones sociales de los usuarios.
    """

    list_display = [
        "avatar_thumbnail",
        "user",
        "provider_badge",
        "provider_name_display",
        "email",
        "tenant",
        "created_at",
    ]
    list_filter = ["provider", "tenant"]
    search_fields = ["user__email", "user__first_name", "user__last_name", "email"]
    search_help_text = "Buscar por email del usuario o email del proveedor"
    readonly_fields = [
        "provider_uid",
        "provider_name_display",
        "provider_avatar_display",
        "extra_data",
        "created_at",
        "updated_at",
    ]
    ordering = ["-created_at"]
    actions = ["disconnect_social_accounts"]

    fieldsets = (
        (
            "Vinculación",
            {"fields": ("user", "tenant", "provider", "email", "provider_uid")},
        ),
        (
            "Datos del proveedor",
            {
                "fields": ("provider_name_display", "provider_avatar_display"),
                "description": "Nombre y avatar obtenidos del proveedor OAuth al momento de la vinculación.",
            },
        ),
        (
            "Datos adicionales (JSON)",
            {
                "fields": ("extra_data", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    @admin.display(description="Avatar")
    def avatar_thumbnail(self, obj):
        """Miniatura del avatar del proveedor en la lista."""
        picture = obj.extra_data.get("picture", "")
        if picture and picture.startswith(("https://", "http://")):
            return format_html(
                '<img src="{}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;" alt="avatar" />',
                picture,
            )
        return format_html(
            '<span style="display:inline-block; width:28px; height:28px; border-radius:50%; '
            'background:#e5e7eb; text-align:center; line-height:28px; font-size:14px; color:#6b7280;">—</span>'
        )

    @admin.display(description="Proveedor")
    def provider_badge(self, obj):
        """Badge visual con color del proveedor."""
        colors = {"google": "#4285F4", "apple": "#000000", "facebook": "#1877F2"}
        color = colors.get(obj.provider, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_provider_display(),
        )

    @admin.display(description="Nombre del proveedor")
    def provider_name_display(self, obj):
        """Nombre completo del usuario segun el proveedor OAuth."""
        name = obj.extra_data.get("name", "")
        return name or "—"

    @admin.display(description="Avatar del proveedor")
    def provider_avatar_display(self, obj):
        """Avatar del usuario segun el proveedor OAuth."""
        picture = obj.extra_data.get("picture", "")
        if picture and picture.startswith(("https://", "http://")):
            return format_html(
                '<img src="{}" style="width:64px; height:64px; border-radius:50%; object-fit:cover;" alt="avatar" />',
                picture,
            )
        return "Sin avatar"

    @admin.action(description="Desvincular cuentas sociales seleccionadas")
    def disconnect_social_accounts(self, request, queryset):
        """Elimina las vinculaciones seleccionadas verificando que el usuario no pierda acceso."""
        from django.contrib.admin.models import DELETION, LogEntry
        from django.contrib.contenttypes.models import ContentType

        disconnected = 0
        skipped = 0
        ct = ContentType.objects.get_for_model(SocialAccount)

        for social_account in queryset:
            user = social_account.user
            has_password = user.has_usable_password()
            other_social = (
                SocialAccount.objects.filter(user=user, tenant=user.tenant).exclude(pk=social_account.pk).count()
            )
            if not has_password and other_social == 0:
                skipped += 1
                continue

            # Registrar en audit log antes de eliminar
            LogEntry.objects.log_action(
                user_id=request.user.pk,
                content_type_id=ct.pk,
                object_id=str(social_account.pk),
                object_repr=f"{social_account.get_provider_display()} (id={social_account.pk})",
                action_flag=DELETION,
                change_message=f"Desvinculación de cuenta {social_account.get_provider_display()} del usuario id={user.pk}",
            )
            social_account.delete()
            disconnected += 1

        if disconnected:
            self.message_user(request, f"{disconnected} cuenta(s) desvinculada(s) correctamente.")
        if skipped:
            self.message_user(
                request,
                f"{skipped} cuenta(s) omitida(s) porque es el único método de acceso del usuario.",
                level="warning",
            )

    def has_add_permission(self, request):
        """Las cuentas sociales se crean por OAuth, no manualmente."""
        return False

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, "tenant") and request.user.tenant:
            return qs.filter(tenant=request.user.tenant)
        return qs.none()


# ---------------------------------------------------------------
# WEBAUTHN CREDENTIALS (Passkeys)
# ---------------------------------------------------------------


@admin.register(WebAuthnCredential, site=nerbis_admin_site)
class WebAuthnCredentialAdmin(UnfoldModelAdmin):
    """
    Panel de administracion para Passkeys (WebAuthn).
    Permite ver y revocar credenciales registradas por los usuarios.
    Solo lectura de los campos criptograficos por seguridad.
    """

    list_display = [
        "name",
        "user",
        "tenant_display",
        "transports_display",
        "sign_count",
        "created_at",
        "last_used_display",
    ]
    list_filter = ["created_at", "last_used_at", "user__tenant"]
    search_fields = ["name", "user__email", "user__first_name", "user__last_name"]
    search_help_text = "Buscar por nombre del passkey o email del usuario"
    readonly_fields = [
        "user",
        "credential_id_display",
        "public_key_display",
        "sign_count",
        "transports",
        "created_at",
        "last_used_at",
    ]
    ordering = ["-created_at"]
    actions = ["revoke_passkeys"]

    fieldsets = (
        (
            "Identificación",
            {"fields": ("user", "name", "transports")},
        ),
        (
            "Datos criptográficos (solo lectura)",
            {
                "fields": ("credential_id_display", "public_key_display", "sign_count"),
                "description": (
                    "Estos valores son generados por el authenticator del usuario y no "
                    "deben modificarse. Si están comprometidos, revoca el passkey."
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Auditoría",
            {"fields": ("created_at", "last_used_at"), "classes": ("collapse",)},
        ),
    )

    @admin.display(description="Tenant", ordering="user__tenant")
    def tenant_display(self, obj):
        return obj.user.tenant.name if obj.user.tenant_id else "—"

    @admin.display(description="Transports")
    def transports_display(self, obj):
        if not obj.transports:
            return "—"
        return ", ".join(obj.transports)

    @admin.display(description="Último uso", ordering="last_used_at")
    def last_used_display(self, obj):
        if not obj.last_used_at:
            return format_html('<span style="color:#9ca3af;">Nunca</span>')
        return obj.last_used_at.strftime("%Y-%m-%d %H:%M")

    @admin.display(description="Credential ID")
    def credential_id_display(self, obj):
        # Mostrar solo primeros/ultimos bytes en hex para identificacion
        raw = bytes(obj.credential_id)
        hex_str = raw.hex()
        if len(hex_str) > 32:
            hex_str = f"{hex_str[:16]}…{hex_str[-16:]}"
        return format_html('<code style="font-size:11px;">{}</code>', hex_str)

    @admin.display(description="Public key")
    def public_key_display(self, obj):
        size = len(bytes(obj.public_key))
        return format_html('<span style="color:#6b7280;">{} bytes (binario COSE)</span>', size)

    @admin.action(description="Revocar passkeys seleccionados")
    def revoke_passkeys(self, request, queryset):
        from django.contrib.admin.models import DELETION, LogEntry
        from django.contrib.contenttypes.models import ContentType

        ct = ContentType.objects.get_for_model(WebAuthnCredential)
        count = 0
        for credential in queryset:
            LogEntry.objects.log_action(
                user_id=request.user.pk,
                content_type_id=ct.pk,
                object_id=str(credential.pk),
                object_repr=f"{credential.name} (user={credential.user_id})",
                action_flag=DELETION,
                change_message=f"Passkey revocado por admin id={request.user.pk}",
            )
            credential.delete()
            count += 1
        self.message_user(
            request,
            f"Se revocaron {count} passkey(s). Los usuarios deberán registrar uno nuevo.",
        )

    def has_add_permission(self, request):
        # Los passkeys solo pueden crearse via flujo WebAuthn del usuario.
        return False

    def get_queryset(self, request):
        """Aislar passkeys por tenant para admins no-superusuarios."""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, "tenant") and request.user.tenant:
            return qs.filter(user__tenant=request.user.tenant)
        return qs.none()
