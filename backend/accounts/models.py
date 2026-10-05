import re

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models

from common.images import SanitizedFileField, SanitizedImageField
from .crypto_fields import EncryptedCharField, deterministic_hash
from .validators import validate_cpf, validate_foto_3x4

PORTFOLIO_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "mp3", "wav", "ogg"]


class Role(models.Model):
    """Catalogo de papeis: Dublador, Animador, Roteirista, etc."""

    nome = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.nome


class UserManager(BaseUserManager):
    def create_user(self, email, nome, cpf, password=None, **extra_fields):
        if not email:
            raise ValueError("Email e obrigatorio.")
        user = self.model(email=self.normalize_email(email), nome=nome, cpf=cpf, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nome, cpf, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, nome, cpf, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Conta de qualquer usuario amador: quem cria projeto e quem se
    candidata usam o mesmo login, sem papel de "dono" separado.
    is_staff marca o admin do site (fila de denuncias/bugs), reaproveitando
    o esquema de permissao do proprio Django em vez de um segundo login.
    """

    email = models.EmailField(unique=True)
    nome = models.CharField(max_length=150)
    cpf = EncryptedCharField(max_length=14, validators=[validate_cpf])
    cpf_hash = models.CharField(max_length=64, unique=True, editable=False)
    telefone = models.CharField(max_length=20, blank=True)
    foto = SanitizedImageField(
        upload_to="fotos_perfil/", blank=True, null=True, validators=[validate_foto_3x4]
    )
    bio = models.TextField(blank=True)
    roles = models.ManyToManyField(Role, blank=True, related_name="usuarios")

    class Verified(models.TextChoices):
        INFLUENCER = "influencer", "Influencer verificado"
        ATOR = "ator", "Ator profissional (DRT)"

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    verified = models.CharField(max_length=20, blank=True, choices=Verified.choices)
    # camada secundaria de banimento: bloqueia novos cadastros vindos desse IP
    registration_ip = models.GenericIPAddressField(null=True, blank=True, editable=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nome", "cpf"]

    def save(self, *args, **kwargs):
        if self.cpf:
            digitos = re.sub(r"\D", "", self.cpf)
            self.cpf_hash = deterministic_hash(digitos)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nome


class VerificationRequest(models.Model):
    """Pedido de selo. DRT nao tem API publica de validacao -- o admin
    confere o numero e o documento manualmente e aprova/recusa."""

    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        APROVADA = "aprovada", "Aprovada"
        RECUSADA = "recusada", "Recusada"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="pedidos_verificacao")
    tipo = models.CharField(max_length=20, choices=User.Verified.choices)
    drt_numero = models.CharField(max_length=30, blank=True)
    drt_uf = models.CharField(max_length=2, blank=True)
    justificativa = models.TextField(blank=True)
    documento = SanitizedImageField(upload_to="verificacao/", blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Verificacao {self.tipo} de {self.user}"


class BannedIP(models.Model):
    """Bloqueia NOVOS CADASTROS desse IP (nunca leitura do site).
    Camada fraca por natureza (IP dinamico, CGNAT, VPN) -- o ban forte e a
    conta desativada + CPF unico, que impede recadastro."""

    ip = models.GenericIPAddressField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.ip


class PortfolioItem(models.Model):
    """Peca de portfolio: um link externo (ex: SoundCloud, YouTube, ArtStation)
    e/ou um arquivo hospedado no proprio site. Pelo menos um dos dois."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="portfolio")
    titulo = models.CharField(max_length=150)
    descricao = models.TextField(blank=True)
    link = models.URLField(blank=True)
    arquivo = SanitizedFileField(
        upload_to="portfolio/",
        blank=True,
        validators=[FileExtensionValidator(PORTFOLIO_EXTENSIONS)],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if not self.link and not self.arquivo:
            raise ValidationError("Informe um link ou um arquivo.")

    def __str__(self):
        return f"{self.titulo} ({self.user})"
