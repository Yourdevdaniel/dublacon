from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models

from accounts.models import Role
from common.images import SanitizedFileField, SanitizedImageField

User = settings.AUTH_USER_MODEL


class Project(models.Model):
    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        ABERTO = "aberto", "Aberto"
        EM_PRODUCAO = "em_producao", "Em producao"
        CONCLUIDO = "concluido", "Concluido"
        CANCELADO = "cancelado", "Cancelado"

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projetos")
    nome = models.CharField(max_length=150)
    descricao = models.TextField()
    categoria = models.CharField(max_length=50, blank=True)
    capa = SanitizedImageField(upload_to="capas_projeto/", blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RASCUNHO)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome


class ProjectVaga(models.Model):
    """Uma vaga especifica dentro de um projeto (ex: Dublador - Personagem X)."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="vagas")
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="vagas")
    titulo = models.CharField(max_length=150)
    descricao = models.TextField(blank=True)
    quantidade = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def vagas_preenchidas(self) -> int:
        return self.candidaturas.filter(status=Application.Status.ACEITA).count()

    @property
    def aberta(self) -> bool:
        return self.vagas_preenchidas < self.quantidade

    def __str__(self):
        return f"{self.titulo} ({self.project.nome})"


class Application(models.Model):
    """Candidatura de um usuario a uma vaga."""

    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        ACEITA = "aceita", "Aceita"
        RECUSADA = "recusada", "Recusada"

    vaga = models.ForeignKey(ProjectVaga, on_delete=models.CASCADE, related_name="candidaturas")
    applicant = models.ForeignKey(User, on_delete=models.CASCADE, related_name="candidaturas")
    mensagem = models.TextField(blank=True)
    audio = SanitizedFileField(
        upload_to="testes_voz/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(["mp3", "wav", "ogg", "m4a"])],
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["vaga", "applicant"], name="uma_candidatura_por_vaga")
        ]

    def __str__(self):
        return f"{self.applicant} -> {self.vaga}"


class ProjectUpdate(models.Model):
    """Post tipo blog/Reddit. Com project = atualizacao que so o dono publica;
    sem project = postagem normal que qualquer usuario faz no feed."""

    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.CASCADE, related_name="updates")
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="updates")
    conteudo = models.TextField()
    foto = SanitizedImageField(upload_to="updates_projeto/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        origem = self.project.nome if self.project else self.author.nome
        return f"Post de {origem} em {self.created_at:%d/%m/%Y}"


class Like(models.Model):
    update = models.ForeignKey(ProjectUpdate, on_delete=models.CASCADE, related_name="curtidas")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="curtidas")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["update", "user"], name="uma_curtida_por_usuario_por_post")
        ]

    def __str__(self):
        return f"{self.user} curtiu {self.update_id}"


class Episode(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="episodios")
    numero = models.PositiveIntegerField()
    titulo = models.CharField(max_length=150, blank=True)
    link = models.URLField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["numero"]
        constraints = [
            models.UniqueConstraint(fields=["project", "numero"], name="numero_unico_por_projeto")
        ]

    def __str__(self):
        return f"Ep {self.numero} - {self.project.nome}"


class Comment(models.Model):
    update = models.ForeignKey(ProjectUpdate, on_delete=models.CASCADE, related_name="comentarios")
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comentarios")
    conteudo = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comentario de {self.author} em {self.update_id}"
