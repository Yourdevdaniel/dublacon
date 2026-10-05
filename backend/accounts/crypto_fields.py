"""Campo de model que criptografa o valor em repouso (Fernet/AES-128) e o
decifra ao ler. Usado para o CPF: dado pessoal sensivel pela LGPD que nao
pode vazar em texto puro se o banco for comprometido.
"""
import hashlib
import hmac

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import models


def deterministic_hash(value: str) -> str:
    """Hash HMAC-SHA256 estavel do valor, usado para indice unico/busca.

    Fernet cifra com IV aleatorio (mesmo CPF gera ciphertexts diferentes),
    entao unique=True no campo cifrado nao funciona. Este hash e o que
    carrega a restricao de unicidade; o campo cifrado carrega o valor
    legivel para exibicao.
    """
    key = getattr(settings, "FIELD_ENCRYPTION_KEY", None)
    if not key:
        raise ImproperlyConfigured(
            "FIELD_ENCRYPTION_KEY nao configurada (defina no .env)."
        )
    key_bytes = key if isinstance(key, bytes) else key.encode()
    return hmac.new(key_bytes, value.encode(), hashlib.sha256).hexdigest()


def _fernet() -> Fernet:
    key = getattr(settings, "FIELD_ENCRYPTION_KEY", None)
    if not key:
        raise ImproperlyConfigured(
            "FIELD_ENCRYPTION_KEY nao configurada (defina no .env)."
        )
    return Fernet(key)


class EncryptedCharField(models.CharField):
    """CharField cujo valor e armazenado cifrado no banco.

    max_length e o tamanho do texto legivel; a coluna real (max_length + 100)
    precisa ser maior porque o texto cifrado e mais longo que o original.
    """

    def __init__(self, *args, **kwargs):
        self.plain_max_length = kwargs.get("max_length", 255)
        kwargs["max_length"] = self.plain_max_length + 100
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        kwargs["max_length"] = self.plain_max_length
        return name, path, args, kwargs

    def get_prep_value(self, value):
        if value is None or value == "":
            return value
        return _fernet().encrypt(str(value).encode()).decode()

    def from_db_value(self, value, expression, connection):
        if value is None or value == "":
            return value
        try:
            return _fernet().decrypt(value.encode()).decode()
        except InvalidToken:
            return value
