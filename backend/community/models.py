from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from common.images import SanitizedImageField

User = settings.AUTH_USER_MODEL


class Report(models.Model):
    """Denuncia de um usuario contra outro."""

    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        EM_ANALISE = "em_analise", "Em analise"
        RESOLVIDA = "resolvida", "Resolvida"

    class Reason(models.TextChoices):
        ASSEDIO = "assedio", "Assedio"
        CONTEUDO_IMPROPRIO = "conteudo_improprio", "Conteudo improprio"
        SPAM = "spam", "Spam"
        OUTRO = "outro", "Outro"

    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name="denuncias_feitas")
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="denuncias_recebidas")
    reason = models.CharField(max_length=30, choices=Reason.choices)
    descricao = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Denuncia de {self.reporter} contra {self.reported_user}"


class ReportEvidence(models.Model):
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name="evidencias")
    foto = SanitizedImageField(upload_to="denuncias/")


class BugReport(models.Model):
    """Reporte de erro no site, cai na fila do admin (is_staff)."""

    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        RESOLVIDO = "resolvido", "Resolvido"

    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bugs_reportados")
    descricao = models.TextField()
    screenshot = SanitizedImageField(upload_to="bug_reports/", blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Bug de {self.reporter} em {self.created_at:%d/%m/%Y}"


class Message(models.Model):
    """Mensagem direta 1:1. A thread entre dois usuarios e so a query
    filtrada pelo par (sender, recipient) ordenada por data."""

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="mensagens_enviadas")
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="mensagens_recebidas")
    conteudo = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender} -> {self.recipient}"


class Announcement(models.Model):
    """Aviso do site publicado pelo admin, exibido como banner pra todos."""

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="avisos")
    mensagem = models.TextField()
    ativo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.mensagem[:60]


class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="seguindo")
    followed = models.ForeignKey(User, on_delete=models.CASCADE, related_name="seguidores")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["follower", "followed"], name="segue_uma_vez")
        ]

    def __str__(self):
        # vira o target_repr da notificacao "novo seguidor" -- so o nome de quem seguiu
        return self.follower.nome


class Notification(models.Model):
    """Notificacao generica (candidatura aceita/recusada, nova mensagem,
    comentario, avaliacao, denuncia atualizada...) apontando pro objeto
    relacionado via contenttypes, sem precisar de uma tabela por tipo."""

    class Verb(models.TextChoices):
        CANDIDATURA_ACEITA = "candidatura_aceita", "Candidatura aceita"
        CANDIDATURA_RECUSADA = "candidatura_recusada", "Candidatura recusada"
        NOVA_MENSAGEM = "nova_mensagem", "Nova mensagem"
        NOVO_COMENTARIO = "novo_comentario", "Novo comentario"
        NOVA_AVALIACAO = "nova_avaliacao", "Nova avaliacao"
        DENUNCIA_ATUALIZADA = "denuncia_atualizada", "Denuncia atualizada"
        NOVO_SEGUIDOR = "novo_seguidor", "Novo seguidor"
        VERIFICACAO_ATUALIZADA = "verificacao_atualizada", "Verificacao atualizada"

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notificacoes")
    verb = models.CharField(max_length=30, choices=Verb.choices)
    target_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    target_object_id = models.PositiveIntegerField(null=True, blank=True)
    target = GenericForeignKey("target_content_type", "target_object_id")
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_verb_display()} para {self.recipient}"


def notify(recipient, verb, target=None):
    """Ponto unico de criacao de notificacao, chamado direto de cada view
    que dispara o evento (candidatura mudou de status, mensagem/comentario/
    avaliacao criados) -- cada evento so acontece em um lugar, entao um
    signal para isso seria indirecao sem ganho."""
    Notification.objects.create(recipient=recipient, verb=verb, target=target)


class Rating(models.Model):
    """Avaliacao de reputacao, tanto de Project quanto de User (mesmo
    modelo pros dois porque a regra 'nota baixa exige motivo -> revisao do
    admin' e identica nos dois casos). Reputacao exibida = media calculada
    na hora (Avg('score')), nao um campo cacheado, pra nunca dessincronizar."""

    class Status(models.TextChoices):
        APROVADA = "aprovada", "Aprovada"
        EM_REVISAO = "em_revisao", "Em revisao"

    NOTA_BAIXA_LIMITE = 2

    rater = models.ForeignKey(User, on_delete=models.CASCADE, related_name="avaliacoes_feitas")
    target_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    target_object_id = models.PositiveIntegerField()
    target = GenericForeignKey("target_content_type", "target_object_id")
    score = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APROVADA)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["rater", "target_content_type", "target_object_id"],
                name="uma_avaliacao_por_alvo",
            )
        ]

    def clean(self):
        if self.score <= self.NOTA_BAIXA_LIMITE and not self.reason:
            raise ValidationError("Nota baixa exige um motivo.")

    def save(self, *args, **kwargs):
        if self.score <= self.NOTA_BAIXA_LIMITE and self.reason:
            self.status = self.Status.EM_REVISAO
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.rater} avaliou {self.target} com {self.score}"
