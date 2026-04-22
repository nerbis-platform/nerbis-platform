# backend/core/serializers.py

from django.contrib.auth.password_validation import (
    validate_password,
)
from django.contrib.auth.password_validation import (
    validate_password as django_validate_password,
)
from rest_framework import serializers

from .models import Banner, SocialAccount, TeamInvitation, Tenant, User


class TenantSerializer(serializers.ModelSerializer):
    """Serializer para Tenant (información pública)"""

    # Campos de suscripción (read-only, vienen del modelo)
    plan_display = serializers.CharField(source="get_plan_display", read_only=True)
    subscription_status = serializers.CharField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    is_trial = serializers.BooleanField(read_only=True)

    industry_display = serializers.CharField(source="get_industry_display", read_only=True)
    website_status = serializers.SerializerMethodField()

    def get_website_status(self, obj):
        config = getattr(obj, "website_config", None)
        return config.status if config else None

    class Meta:
        model = Tenant
        fields = [
            "id",
            "name",
            "slug",
            "industry",
            "industry_display",
            "email",
            "phone",
            "city",
            "country",
            "logo",
            "primary_color",
            "secondary_color",
            "timezone",
            "currency",
            "language",
            "years_experience",
            "clients_count",
            "treatments_count",
            "average_rating",
            "hero_image_home",
            "hero_image_services",
            # Feature flags
            "has_shop",
            "has_bookings",
            "has_services",
            "has_marketing",
            "has_website",
            "modules_configured",
            # Suscripción
            "plan",
            "plan_display",
            "subscription_status",
            "days_remaining",
            "is_trial",
            # Website
            "website_status",
        ]
        read_only_fields = ["id", "slug"]


class SocialAccountSerializer(serializers.ModelSerializer):
    """Serializer para cuentas sociales vinculadas."""

    class Meta:
        model = SocialAccount
        fields = ["id", "provider", "email", "created_at"]
        read_only_fields = fields


class SocialAccountDetailSerializer(serializers.ModelSerializer):
    """Serializer extendido para social accounts — incluye nombre y avatar del proveedor."""

    provider_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = SocialAccount
        fields = ["id", "provider", "email", "provider_name", "avatar_url", "created_at"]
        read_only_fields = fields

    def get_provider_name(self, obj) -> str:
        return obj.extra_data.get("name", "")

    def get_avatar_url(self, obj) -> str:
        return obj.extra_data.get("picture", "")


class UserSerializer(serializers.ModelSerializer):
    """Serializer para User (información completa)"""

    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    full_name = serializers.SerializerMethodField()
    has_password = serializers.SerializerMethodField()
    social_accounts = SocialAccountSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "avatar",
            "tenant",
            "tenant_name",
            "role",
            "role_display",
            "is_active",
            "date_joined",
            "has_password",
            "social_accounts",
        ]
        read_only_fields = ["id", "tenant", "date_joined"]

    def get_full_name(self, obj) -> str:
        return obj.get_full_name() or obj.username

    def get_has_password(self, obj) -> bool:
        return obj.has_usable_password()


class TeamMemberSerializer(serializers.ModelSerializer):
    """Serializer para miembros del equipo — vista de admin con social accounts detalladas."""

    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    has_password = serializers.SerializerMethodField()
    social_accounts = SocialAccountDetailSerializer(many=True, read_only=True)
    auth_method = serializers.SerializerMethodField()
    has_2fa = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "avatar",
            "role",
            "role_display",
            "is_active",
            "date_joined",
            "has_password",
            "social_accounts",
            "auth_method",
            "has_2fa",
        ]
        read_only_fields = fields

    def get_full_name(self, obj) -> str:
        return obj.get_full_name() or obj.username

    def get_has_password(self, obj) -> bool:
        return obj.has_usable_password()

    def get_auth_method(self, obj) -> str:
        has_password = obj.has_usable_password()
        has_social = obj.social_accounts.exists()
        if has_password and has_social:
            return "both"
        if has_social:
            return "social_only"
        return "email_only"

    def get_has_2fa(self, obj) -> bool:
        device = getattr(obj, "totp_device", None)
        if device and device.confirmed:
            return True
        return obj.webauthn_credentials.exists()


class UserPublicSerializer(serializers.ModelSerializer):
    """Serializer para User (información pública - sin datos sensibles)"""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "avatar",
        ]
        read_only_fields = fields

    def get_full_name(self, obj) -> str:
        return obj.get_full_name() or obj.username


class UserSessionSerializer(serializers.ModelSerializer):
    """
    Serializer para la sesión del usuario autenticado.
    Incluye los campos necesarios para el frontend (navegación, badges de rol, etc).
    """

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
        ]
        read_only_fields = fields

    def get_full_name(self, obj) -> str:
        return obj.get_full_name() or obj.username


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer para registro de nuevos usuarios.

    El tenant se obtiene del request (header X-Tenant-Slug o query param ?tenant=).
    No se requiere tenant_slug en el body.
    El username se genera automáticamente desde el email.
    """

    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password], style={"input_type": "password"}
    )
    password2 = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["email", "password", "password2", "first_name", "last_name", "phone"]

    def validate_email(self, value):
        """Normalizar email a minúsculas"""
        return value.lower()

    def validate(self, attrs):
        """Validaciones que requieren múltiples campos"""
        # Validar que las contraseñas coincidan
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden"})

        # Obtener el tenant del request (inyectado por el middleware)
        request = self.context.get("request")
        if not request or not hasattr(request, "tenant"):
            raise serializers.ValidationError({"tenant": "No se pudo identificar el centro"})

        tenant = request.tenant

        # Validar email único por tenant (incluye activos e inactivos para
        # no revelar si existe una cuenta inactiva — previene account takeover #135)
        email = attrs.get("email", "").lower()
        if User.objects.filter(tenant=tenant, email__iexact=email).exists():
            raise serializers.ValidationError(
                {"email": "Ya existe un usuario con este email. Por favor inicia sesión."}
            )

        return attrs

    def _generate_username(self, email, tenant):
        """Generar username único desde el email"""
        base_username = email.split("@")[0].lower()
        username = base_username
        counter = 1

        while User.objects.filter(tenant=tenant, username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        return username

    def create(self, validated_data):
        validated_data.pop("password2")

        # Obtener tenant del request
        request = self.context.get("request")
        tenant = request.tenant

        # Generar username automáticamente desde el email
        email = validated_data["email"].lower()
        username = self._generate_username(email, tenant)

        user = User.objects.create_user(
            tenant=tenant,
            username=username,
            email=email,
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            phone=validated_data.get("phone", ""),
            role="customer",
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer para login por email.

    El tenant se obtiene del request (header X-Tenant-Slug o query param ?tenant=).
    """

    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={"input_type": "password"})


class SetPasswordSerializer(serializers.Serializer):
    """Serializer para establecer contraseña con token"""

    token = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    password2 = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden"})
        return attrs


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Serializer para actualizar el perfil del usuario"""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "phone"]

    def validate_first_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre es requerido")
        return value.strip()

    def validate_last_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El apellido es requerido")
        return value.strip()


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer para cambiar la contraseña"""

    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
    )
    new_password2 = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError({"new_password": "Las contraseñas no coinciden"})
        return attrs


class TenantRegisterSerializer(serializers.Serializer):
    """
    Serializer para registro de nuevos tenants (dueños de negocio).

    Crea un Tenant + Usuario administrador en una sola transacción.
    No requiere tenant previo (endpoint público).
    """

    # Datos del negocio
    business_name = serializers.CharField(max_length=200, required=True)
    industry = serializers.ChoiceField(choices=Tenant.INDUSTRY_CHOICES, default="other")
    country = serializers.ChoiceField(choices=Tenant.COUNTRY_CHOICES, default="Colombia")

    # Datos del administrador
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password], style={"input_type": "password"}
    )
    password2 = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})
    first_name = serializers.CharField(max_length=150, required=False, default="")
    last_name = serializers.CharField(max_length=150, required=False, default="")
    phone = serializers.CharField(max_length=20, required=False, default="", allow_blank=True)

    def validate_email(self, value):
        return value.lower()

    def validate_business_name(self, value):
        slug = value.lower().replace(" ", "-")
        if Tenant.objects.filter(slug__startswith=slug).exists():
            # No bloquear, el slug se generará único automáticamente
            pass
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden"})

        # Verificar que no exista un tenant con este email
        email = attrs.get("email", "").lower()
        if Tenant.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({"email": "Ya existe un negocio registrado con este email"})

        return attrs

    def create(self, validated_data):
        from django.db import transaction
        from django.utils.text import slugify

        validated_data.pop("password2")
        password = validated_data.pop("password")

        business_name = validated_data.pop("business_name")
        industry = validated_data.pop("industry", "other")
        country = validated_data.pop("country", "Colombia")

        email = validated_data.pop("email")
        first_name = validated_data.pop("first_name", "")
        last_name = validated_data.pop("last_name", "")
        phone = validated_data.pop("phone", "")

        with transaction.atomic():
            # Generar slug único
            base_slug = slugify(business_name)
            slug = base_slug
            counter = 1
            while Tenant.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            # Crear Tenant (signals auto-crean Subscription + Modules)
            tenant = Tenant.objects.create(
                name=business_name,
                slug=slug,
                email=email,
                phone=phone,
                industry=industry,
                country=country,
                plan="trial",
            )

            # Crear usuario administrador
            username = email.split("@")[0].lower()
            user = User.objects.create_user(
                tenant=tenant,
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                role="admin",
            )

        return user


class TeamInvitationSerializer(serializers.ModelSerializer):
    """Serializer para leer invitaciones de equipo"""

    invited_by_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = TeamInvitation
        fields = [
            "id",
            "email",
            "role",
            "role_display",
            "status",
            "status_display",
            "invited_by_name",
            "is_valid",
            "expires_at",
            "accepted_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_invited_by_name(self, obj) -> str:
        if obj.invited_by:
            return obj.invited_by.get_full_name() or obj.invited_by.email
        return ""


class CreateTeamInvitationSerializer(serializers.Serializer):
    """Serializer para crear una invitación de equipo"""

    email = serializers.EmailField(required=True)
    role = serializers.ChoiceField(
        choices=TeamInvitation.ROLE_CHOICES,
        default="staff",
    )

    def validate_email(self, value):
        return value.lower()

    def validate(self, attrs):
        request = self.context.get("request")
        tenant = request.tenant
        email = attrs["email"]

        # No invitar a alguien que ya es miembro del tenant
        if User.objects.filter(tenant=tenant, email__iexact=email, is_active=True).exists():
            raise serializers.ValidationError({"email": "Este email ya pertenece a un miembro del equipo"})

        return attrs


class AcceptInvitationSerializer(serializers.Serializer):
    """Serializer para aceptar una invitación (registro simplificado)"""

    first_name = serializers.CharField(max_length=150, required=True)
    last_name = serializers.CharField(max_length=150, required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden"})
        return attrs


class InvitationDetailSerializer(serializers.ModelSerializer):
    """Serializer público para mostrar info de una invitación (sin datos sensibles)"""

    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    tenant_logo = serializers.ImageField(source="tenant.logo", read_only=True)
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    invited_by_name = serializers.SerializerMethodField()
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = TeamInvitation
        fields = [
            "email",
            "role",
            "role_display",
            "tenant_name",
            "tenant_logo",
            "invited_by_name",
            "is_valid",
            "status",
            "expires_at",
        ]
        read_only_fields = fields

    def get_invited_by_name(self, obj) -> str:
        if obj.invited_by:
            return obj.invited_by.get_full_name() or obj.invited_by.email
        return ""


class SocialLoginSerializer(serializers.Serializer):
    """Serializer para social login (Google, Apple, Facebook)."""

    token = serializers.CharField(required=True, help_text="Token del proveedor (id_token o access_token)")
    first_name = serializers.CharField(required=False, default="", help_text="Nombre (opcional, para Apple)")
    last_name = serializers.CharField(required=False, default="", help_text="Apellido (opcional, para Apple)")


class SocialLinkSerializer(serializers.Serializer):
    """Serializer para vincular cuenta social a usuario existente con contraseña."""

    provider = serializers.ChoiceField(choices=["google", "apple", "facebook"], required=True)
    token = serializers.CharField(required=True, help_text="Token del proveedor")
    password = serializers.CharField(required=True, write_only=True, help_text="Contraseña de la cuenta existente")
    first_name = serializers.CharField(required=False, default="")
    last_name = serializers.CharField(required=False, default="")


class AdminLoginSerializer(serializers.Serializer):
    """Serializer para login de superadmin de plataforma."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value: str) -> str:
        return value.strip().lower()


class AdminRegisterSerializer(serializers.Serializer):
    """Serializer para registro de superadmin de plataforma."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_email(self, value: str) -> str:
        normalized = value.strip().lower()
        if User.objects.filter(tenant__isnull=True, email__iexact=normalized).exists():
            raise serializers.ValidationError("A superadmin with this email already exists.")
        return normalized

    def validate_password(self, value: str) -> str:
        django_validate_password(value)
        return value

    def create(self, validated_data: dict) -> User:
        email = validated_data["email"]
        user = User(
            email=email,
            username=email.split("@")[0],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            tenant=None,
            is_superuser=True,
            is_staff=True,
            is_active=True,
            role="admin",
            uid=f"admin:{email}",
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer de salida para superadmins. Allowlist explícito."""

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "is_superuser",
            "is_staff",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields


class AdminUserUpdateSerializer(serializers.Serializer):
    """Serializer para PATCH parcial de un superadmin (solo is_active)."""

    is_active = serializers.BooleanField()


class BannerSerializer(serializers.ModelSerializer):
    """Serializer para Banner (información pública)

    Security: message se sanea con strip_tags para prevenir XSS stored (#137).
    """

    banner_type_display = serializers.CharField(source="get_banner_type_display", read_only=True)
    position_display = serializers.CharField(source="get_position_display", read_only=True)

    def to_representation(self, instance):
        from django.utils.html import strip_tags

        data = super().to_representation(instance)
        if data.get("message"):
            data["message"] = strip_tags(data["message"])
        return data

    class Meta:
        model = Banner
        fields = [
            "id",
            "name",
            "message",
            "link_url",
            "link_text",
            "banner_type",
            "banner_type_display",
            "position",
            "position_display",
            "background_color",
            "text_color",
            "is_dismissible",
            "priority",
            "rotation_interval",
        ]
        read_only_fields = fields
