import re

from django.core.exceptions import ValidationError
from django.core.files.images import get_image_dimensions

RAZAO_3X4 = 3 / 4
TOLERANCIA = 0.05


def validate_foto_3x4(imagem) -> None:
    largura, altura = get_image_dimensions(imagem)
    if not altura or abs((largura / altura) - RAZAO_3X4) > TOLERANCIA:
        raise ValidationError("A foto deve estar no formato 3x4 (proporcao largura:altura de 3:4).")


def _digito_verificador(cpf_parcial: str) -> str:
    peso = len(cpf_parcial) + 1
    soma = sum(int(d) * (peso - i) for i, d in enumerate(cpf_parcial))
    resto = soma % 11
    return "0" if resto < 2 else str(11 - resto)


def validate_cpf(value: str) -> None:
    cpf = re.sub(r"\D", "", value or "")
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        raise ValidationError("CPF invalido.")
    if _digito_verificador(cpf[:9]) != cpf[9] or _digito_verificador(cpf[:10]) != cpf[10]:
        raise ValidationError("CPF invalido.")
