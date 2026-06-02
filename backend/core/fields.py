"""Campos de modelo con encriptación transparente."""

import logging

from django.db import models

from core.crypto import decrypt, encrypt

logger = logging.getLogger(__name__)


class EncryptedCharField(models.BinaryField):
    """CharField que almacena datos cifrados con Fernet.

    Encripta al guardar, desencripta al leer. Transparente para el código
    que usa el modelo.
    """

    description = "Campo de texto encriptado con Fernet"

    def __init__(self, *args, max_length: int = 500, **kwargs):
        # max_length es para validación de formularios, no para la DB
        self._max_length = max_length
        kwargs.setdefault("editable", True)
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        if self._max_length != 500:
            kwargs["max_length"] = self._max_length
        if kwargs.get("editable") is True:
            del kwargs["editable"]
        return name, path, args, kwargs

    def get_prep_value(self, value):
        if value is None or value == "":
            return None
        if isinstance(value, bytes):
            # Ya está encriptado
            return value
        return encrypt(value)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return ""
        if isinstance(value, memoryview):
            value = bytes(value)
        try:
            return decrypt(value)
        except Exception:
            # Fallback: si el valor no está encriptado (datos legacy)
            logger.warning("No se pudo desencriptar valor, retornando como texto plano")
            if isinstance(value, bytes):
                return value.decode("utf-8", errors="replace")
            return str(value)

    def value_to_string(self, obj):
        value = self.value_from_object(obj)
        return value or ""
