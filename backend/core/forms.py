# backend/core/forms.py

from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _


class TenantAuthenticationForm(AuthenticationForm):
    """
    Formulario de autenticación personalizado para Django Admin multi-tenant.

    Añade un campo 'tenant' para que el usuario especifique a qué cliente pertenece.
    - Para admins de tenant: usar el slug del tenant (ej: 'gc-belleza')
    - Para superusuarios de plataforma: usar 'admin' (no documentado públicamente)
    """

    tenant_slug = forms.CharField(
        label=_("Cliente"),
        max_length=100,
        required=True,
        widget=forms.TextInput(attrs={
            'autofocus': True,
            'placeholder': 'ej: gc-belleza',
        }),
        help_text=_("Slug del tenant (ej: gc-belleza)"),
    )

    # Redefinir username para que sea email
    username = forms.EmailField(
        label=_("Email"),
        max_length=254,
        widget=forms.EmailInput(attrs={
            'autocomplete': 'email',
            'placeholder': 'tu@email.com',
        }),
    )

    password = forms.CharField(
        label=_("Contraseña"),
        strip=False,
        widget=forms.PasswordInput(attrs={
            'autocomplete': 'current-password',
            'placeholder': '••••••••',
        }),
    )

    # Definir el orden de los campos
    field_order = ['tenant_slug', 'username', 'password']

    error_messages = {
        'invalid_login': _(
            "Por favor, ingresa un email y contraseña válidos para una cuenta de staff. "
            "Verifica que el cliente sea correcto."
        ),
        'inactive': _("Esta cuenta está inactiva."),
        'tenant_not_found': _("El cliente especificado no existe o está inactivo."),
        'user_not_found': _("No se encontró un usuario con este email en el cliente especificado."),
    }

    def clean(self):
        """
        Validar las credenciales con el tenant especificado.
        """
        tenant_slug = self.cleaned_data.get('tenant_slug')
        email = self.cleaned_data.get('username')  # En el form se llama username por compatibilidad
        password = self.cleaned_data.get('password')

        if tenant_slug and email and password:
            # Importar aquí para evitar imports circulares
            from core.models import Tenant, User

            # Verificar si es login de administrador de plataforma (superuser)
            if tenant_slug.lower() == 'admin':
                # Buscar superusuario sin tenant
                try:
                    user = User.objects.get(tenant__isnull=True, email=email)
                    if not user.is_superuser:
                        raise forms.ValidationError(
                            "Credenciales inválidas.",
                            code='not_superuser',
                        )
                    # Verificar contraseña
                    if user.check_password(password) and user.is_active:
                        self.user_cache = user
                    else:
                        raise forms.ValidationError(
                            self.error_messages['invalid_login'],
                            code='invalid_login',
                        )
                except User.DoesNotExist:
                    raise forms.ValidationError(
                        self.error_messages['user_not_found'],
                        code='user_not_found',
                    )
            else:
                # Login de tenant normal
                try:
                    tenant = Tenant.objects.get(slug=tenant_slug, is_active=True)
                except Tenant.DoesNotExist:
                    raise forms.ValidationError(
                        self.error_messages['tenant_not_found'],
                        code='tenant_not_found',
                    )

                # Buscar usuario en el tenant
                try:
                    user = User.objects.get(tenant=tenant, email=email)
                except User.DoesNotExist:
                    raise forms.ValidationError(
                        self.error_messages['user_not_found'],
                        code='user_not_found',
                    )

                # Verificar que tiene acceso al admin (is_staff=True o role='admin')
                if not user.is_staff and user.role != 'admin':
                    raise forms.ValidationError(
                        "Este usuario no tiene permisos para acceder al panel de administración.",
                        code='no_staff',
                    )

                # Verificar contraseña
                if user.check_password(password):
                    if user.is_active:
                        self.user_cache = user
                    else:
                        raise forms.ValidationError(
                            self.error_messages['inactive'],
                            code='inactive',
                        )
                else:
                    raise forms.ValidationError(
                        self.error_messages['invalid_login'],
                        code='invalid_login',
                    )

        return self.cleaned_data

    def get_user(self):
        """Retornar el usuario autenticado."""
        return getattr(self, 'user_cache', None)

    def confirm_login_allowed(self, user):
        """
        Verificar que el usuario puede iniciar sesión.
        Staff o admins de tenant pueden acceder al admin.
        """
        if not user.is_active:
            raise forms.ValidationError(
                self.error_messages['inactive'],
                code='inactive',
            )

        # Permitir acceso a staff o usuarios con rol 'admin'
        has_admin_access = user.is_staff or (hasattr(user, 'role') and user.role == 'admin')
        if not has_admin_access:
            raise forms.ValidationError(
                "Este usuario no tiene permisos para acceder al panel de administración.",
                code='no_staff',
            )