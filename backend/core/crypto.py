# backend/core/crypto.py
# Helpers de cifrado simétrico (Fernet) para secretos sensibles como los
# secrets TOTP. La clave se deriva de SECRET_KEY — si SECRET_KEY rota en
# producción, los secretos existentes dejan de poder descifrarse (el flujo
# de recuperación es volver a enrolar el dispositivo 2FA).

import base64
import hashlib

from cryptography.fernet import Fernet
from django.conf import settings


def get_fernet() -> Fernet:
    """
    Deriva una clave Fernet válida (32 bytes base64) desde settings.SECRET_KEY.

    Fernet requiere una clave de exactamente 32 bytes codificada en
    base64 url-safe. Usamos SHA-256 sobre SECRET_KEY para obtener 32
    bytes determinísticos y luego los codificamos.
    """
    digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt(plaintext: str) -> bytes:
    """Cifra un string y devuelve los bytes del token Fernet."""
    return get_fernet().encrypt(plaintext.encode("utf-8"))


def decrypt(ciphertext: bytes) -> str:
    """Descifra bytes cifrados con Fernet y devuelve el string original."""
    # BinaryField puede devolver memoryview en algunas DBs (ej. Postgres).
    if isinstance(ciphertext, memoryview):
        ciphertext = bytes(ciphertext)
    return get_fernet().decrypt(ciphertext).decode("utf-8")
