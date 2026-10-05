from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from accounts.models import User
from accounts.serializers import UserMiniSerializer
from common.images import validate_image_size
from projects.models import Project
from .models import Announcement, BugReport, Message, Notification, Rating, Report, ReportEvidence

TARGET_MODELS = {"project": Project, "user": User}


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ["id", "mensagem", "ativo", "created_at"]
        read_only_fields = ["id", "created_at"]


class ReportEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportEvidence
        fields = ["id", "foto"]


class ReportSerializer(serializers.ModelSerializer):
    reporter = UserMiniSerializer(read_only=True)
    reported_user = UserMiniSerializer(read_only=True)
    reported_user_id = serializers.PrimaryKeyRelatedField(
        source="reported_user", queryset=User.objects.all(), write_only=True
    )
    evidencias = ReportEvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = Report
        fields = [
            "id", "reporter", "reported_user", "reported_user_id", "reason",
            "descricao", "status", "evidencias", "created_at",
        ]
        read_only_fields = ["id", "reporter", "reported_user", "evidencias", "created_at"]

    def get_fields(self):
        # so o admin muda o status (a view ja restringe o PATCH a admin)
        fields = super().get_fields()
        request = self.context.get("request")
        if not (request and request.user.is_staff):
            fields["status"].read_only = True
        return fields

    def validate(self, attrs):
        # as evidencias chegam soltas em request.FILES e sao gravadas na view;
        # validar aqui faz arquivo invalido ou grande demais virar 400 antes
        # de a denuncia existir (no pre_save viraria 500)
        request = self.context.get("request")
        campo = serializers.ImageField(validators=[validate_image_size])
        for foto in request.FILES.getlist("evidencias") if request else []:
            try:
                campo.run_validation(foto)
            except serializers.ValidationError as exc:
                raise serializers.ValidationError({"evidencias": exc.detail}) from exc
        return attrs


class BugReportSerializer(serializers.ModelSerializer):
    reporter = UserMiniSerializer(read_only=True)

    class Meta:
        model = BugReport
        fields = ["id", "reporter", "descricao", "screenshot", "status", "created_at"]
        read_only_fields = ["id", "reporter", "status", "created_at"]


class MessageSerializer(serializers.ModelSerializer):
    sender = UserMiniSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "sender", "recipient", "conteudo", "read", "created_at"]
        read_only_fields = ["id", "sender", "read", "created_at"]


class NotificationSerializer(serializers.ModelSerializer):
    target_repr = serializers.SerializerMethodField()
    link = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "verb", "target_repr", "link", "read", "created_at"]

    def get_target_repr(self, obj):
        return str(obj.target) if obj.target else None

    def get_link(self, obj):
        """Rota do frontend pro alvo da notificacao. Comparacao por nome de
        classe pra nao importar projects aqui (projects ja importa community)."""
        t = obj.target
        if t is None:
            return None
        tipo = type(t).__name__
        if tipo == "Application":
            return f"/projetos/{t.vaga.project_id}"
        if tipo == "Message":
            return f"/mensagens/{t.sender_id}"
        if tipo == "Comment":
            return f"/posts/{t.update_id}"
        if tipo == "Follow":
            return f"/usuarios/{t.follower_id}"
        if tipo == "Rating":
            alvo = t.target
            if alvo is None:
                return None
            return f"/projetos/{alvo.id}" if type(alvo).__name__ == "Project" else f"/usuarios/{alvo.id}"
        return None


class RatingSerializer(serializers.ModelSerializer):
    rater = UserMiniSerializer(read_only=True)
    target_type = serializers.ChoiceField(choices=[], write_only=True)
    target_id = serializers.IntegerField(write_only=True)
    target_repr = serializers.SerializerMethodField()

    class Meta:
        model = Rating
        fields = [
            "id", "rater", "target_type", "target_id", "target_repr",
            "score", "reason", "status", "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["target_type"].choices = list(TARGET_MODELS)

    def get_target_repr(self, obj):
        return str(obj.target) if obj.target else None

    def validate(self, attrs):
        request = self.context["request"]
        if self.instance is None:
            target_type = attrs.pop("target_type")
            target_id = attrs.pop("target_id")
            model = TARGET_MODELS[target_type]
            if not model.objects.filter(pk=target_id).exists():
                raise serializers.ValidationError("Alvo da avaliacao nao encontrado.")
            content_type = ContentType.objects.get_for_model(model)
            if Rating.objects.filter(rater=request.user, target_content_type=content_type, target_object_id=target_id).exists():
                raise serializers.ValidationError("Voce ja avaliou isso.")
            attrs["target_content_type"] = content_type
            attrs["target_object_id"] = target_id

        score = attrs.get("score")
        reason = attrs.get("reason", "")
        if score is not None and score <= Rating.NOTA_BAIXA_LIMITE and not reason:
            raise serializers.ValidationError({"reason": "Nota baixa exige um motivo."})
        return attrs
