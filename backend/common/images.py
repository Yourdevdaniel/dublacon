"""Sanitizacao de upload de imagem.

Toda foto enviada por usuario (foto de perfil, capa de projeto, evidencia
de denuncia, print de bug, imagem de portfolio) e reconstruida a partir dos
pixels decodificados e regravada do zero. Isso descarta qualquer metadado
(EXIF, GPS, XMP, comentarios) e qualquer payload escondido no arquivo
original (polyglot, script embutido) porque o arquivo final nunca contem
os bytes originais, so os pixels. Tambem rejeita qualquer arquivo que nao
seja uma imagem de verdade, independente da extensao com que foi enviado.
Audio (teste de voz, portfolio) e conferido pela assinatura do formato.
"""
import io
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.db import models
from PIL import Image

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}


def _is_mp3(header: bytes) -> bool:
    # tag ID3v2 no inicio, ou direto um frame MPEG (11 bits de sync + layer != 00)
    if header.startswith(b"ID3"):
        return True
    return len(header) >= 2 and header[0] == 0xFF and header[1] & 0xE0 == 0xE0 and header[1] & 0x06 != 0


# assinatura (magic bytes) de cada formato de audio aceito, lida do cabecalho
AUDIO_SIGNATURES = {
    "mp3": _is_mp3,
    "wav": lambda h: h[:4] == b"RIFF" and h[8:12] == b"WAVE",
    "ogg": lambda h: h[:4] == b"OggS",
    "m4a": lambda h: h[4:8] == b"ftyp",
}


def is_probably_image(file) -> bool:
    file.seek(0)
    try:
        Image.open(file).verify()
        return True
    except Exception:  # Pillow levanta varios tipos pra arquivo invalido (OSError, SyntaxError, bomba...)
        return False
    finally:
        file.seek(0)


def validate_image_size(file) -> None:
    """Limite checado na validacao do serializer (400), antes do pre_save."""
    if getattr(file, "_committed", False):
        return  # arquivo ja salvo (ex: edicao no admin sem trocar o arquivo)
    if file.size > MAX_IMAGE_SIZE:
        raise ValidationError("Imagem maior que 5MB.")


def validate_file_content(file) -> None:
    """Confere se o conteudo bate com a extensao: imagem tem que abrir no
    Pillow, audio tem que comecar com a assinatura do formato. Extensao sem
    checagem conhecida e recusada, pra um tipo novo nao passar sem conferencia."""
    if getattr(file, "_committed", False):
        return
    extensao = Path(file.name or "").suffix.lower().lstrip(".")
    if extensao in IMAGE_EXTENSIONS:
        validate_image_size(file)
        if not is_probably_image(file):
            raise ValidationError("Arquivo nao e uma imagem valida.")
        return
    confere = AUDIO_SIGNATURES.get(extensao)
    if confere is None:
        raise ValidationError(f"Tipo de arquivo nao suportado: .{extensao}")
    file.seek(0)
    cabecalho = file.read(12)
    file.seek(0)
    if not confere(cabecalho):
        raise ValidationError(f"O conteudo do arquivo nao e um .{extensao} valido.")


def sanitize_image(file) -> InMemoryUploadedFile:
    if file.size > MAX_IMAGE_SIZE:
        raise ValidationError("Imagem maior que 5MB.")
    file.seek(0)
    try:
        image = Image.open(file)
        image.load()
    except OSError as exc:
        raise ValidationError("Arquivo nao e uma imagem valida.") from exc

    image_format = "PNG" if image.mode in ("RGBA", "P", "LA") else "JPEG"
    if image_format == "JPEG" and image.mode != "RGB":
        image = image.convert("RGB")

    buffer = io.BytesIO()
    image.save(buffer, format=image_format)
    buffer.seek(0)

    base_name = file.name.rsplit(".", 1)[0] if file.name else "imagem"
    extension = "jpg" if image_format == "JPEG" else "png"
    return InMemoryUploadedFile(
        buffer,
        None,
        f"{base_name}.{extension}",
        f"image/{image_format.lower()}",
        buffer.getbuffer().nbytes,
        None,
    )


class SanitizedImageField(models.ImageField):
    """ImageField que limita o tamanho e sempre reencoda o arquivo antes de salvar.
    default_validators vale pro serializer (DRF copia os validators do model)
    sem entrar na migration."""

    default_validators = [validate_image_size]

    def pre_save(self, model_instance, add):
        file = getattr(model_instance, self.attname)
        if file and not file._committed:
            sanitized = sanitize_image(file.file)
            file.file = sanitized
            file.name = sanitized.name
        return super().pre_save(model_instance, add)


class SanitizedFileField(models.FileField):
    """FileField generico (imagem ou audio). Valida o conteudo contra a
    extensao (validate_file_content) e reencoda quando e imagem; a lista de
    extensoes permitidas fica no FileExtensionValidator de cada field."""

    default_validators = [validate_file_content]

    def pre_save(self, model_instance, add):
        file = getattr(model_instance, self.attname)
        if file and not file._committed and is_probably_image(file.file):
            sanitized = sanitize_image(file.file)
            file.file = sanitized
            file.name = sanitized.name
        return super().pre_save(model_instance, add)
