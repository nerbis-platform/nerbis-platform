# backend/core/forms.py

from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.utils.translation import gettext_lazy as _


class SuperadminAuthenticationForm(AuthenticationForm):
    """
    Formulario de autenticación para Django Admin — solo superadmins NERBIS.

    Login simple con email + password. Solo superusuarios (is_superuser=True)
    pueden acceder. Los tenant admins usan el frontend Next.js (/dashboard/).
    """

    # Redefinir username para que sea email
    username = forms.EmailField(
        label=_("Email"),
        max_length=254,
        widget=forms.EmailInput(
            attrs={
                "autofocus": True,
                "autocomplete": "email",
                "placeholder": "tu@email.com",
            }
        ),
    )

    password = forms.CharField(
        label=_("Contraseña"),
        strip=False,
        widget=forms.PasswordInput(
            attrs={
                "autocomplete": "current-password",
                "placeholder": "••••••••",
            }
        ),
    )

    field_order = ["username", "password"]

    error_messages = {
        "invalid_login": _("Credenciales inválidas. Verifica tu email y contraseña."),
        "inactive": _("Esta cuenta está inactiva."),
        "not_superuser": _("Acceso restringido a administradores de plataforma."),
    }

    def clean(self):
        """Validar credenciales y verificar que es superusuario."""
        email = self.cleaned_data.get("username")
        password = self.cleaned_data.get("password")

        if email and password:
            from core.models import User

            try:
                user = User.objects.get(tenant__isnull=True, email=email)
            except User.DoesNotExist:
                raise forms.ValidationError(
                    self.error_messages["invalid_login"],
                    code="invalid_login",
                )

            if not user.check_password(password):
                raise forms.ValidationError(
                    self.error_messages["invalid_login"],
                    code="invalid_login",
                )

            if not user.is_superuser:
                raise forms.ValidationError(
                    self.error_messages["not_superuser"],
                    code="not_superuser",
                )

            if not user.is_active:
                raise forms.ValidationError(
                    self.error_messages["inactive"],
                    code="inactive",
                )

            self.user_cache = user

        return self.cleaned_data

    def get_user(self):
        """Retornar el usuario autenticado."""
        return getattr(self, "user_cache", None)

    def confirm_login_allowed(self, user):
        """Solo superusuarios activos pueden acceder."""
        if not user.is_active:
            raise forms.ValidationError(
                self.error_messages["inactive"],
                code="inactive",
            )
        if not user.is_superuser:
            raise forms.ValidationError(
                self.error_messages["not_superuser"],
                code="not_superuser",
            )
