from rest_framework import serializers

from accounts.models import Role
from accounts.serializers import RoleSerializer, UserMiniSerializer
from .models import Application, Comment, Episode, Like, Project, ProjectUpdate, ProjectVaga


class ProjectSerializer(serializers.ModelSerializer):
    owner = UserMiniSerializer(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "owner", "nome", "descricao", "categoria", "capa", "status", "created_at",
        ]
        read_only_fields = ["id", "owner", "created_at"]


class ProjectVagaSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(source="role", queryset=Role.objects.all(), write_only=True)
    vagas_preenchidas = serializers.ReadOnlyField()
    aberta = serializers.ReadOnlyField()

    class Meta:
        model = ProjectVaga
        fields = [
            "id", "project", "role", "role_id", "titulo", "descricao",
            "quantidade", "vagas_preenchidas", "aberta", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class VagaMiniSerializer(serializers.ModelSerializer):
    project_nome = serializers.CharField(source="project.nome", read_only=True)

    class Meta:
        model = ProjectVaga
        fields = ["id", "titulo", "project", "project_nome"]


class ApplicationSerializer(serializers.ModelSerializer):
    applicant = UserMiniSerializer(read_only=True)
    vaga_detail = VagaMiniSerializer(source="vaga", read_only=True)

    class Meta:
        model = Application
        fields = ["id", "vaga", "vaga_detail", "applicant", "mensagem", "audio", "status", "created_at"]
        read_only_fields = ["id", "applicant", "status", "created_at"]

    def validate(self, attrs):
        request = self.context["request"]
        vaga = attrs.get("vaga", getattr(self.instance, "vaga", None))
        if self.instance is None and Application.objects.filter(vaga=vaga, applicant=request.user).exists():
            raise serializers.ValidationError("Voce ja se candidatou a essa vaga.")
        return attrs


class ProjectUpdateSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)
    project_nome = serializers.SerializerMethodField()
    curtidas_count = serializers.SerializerMethodField()
    comentarios_count = serializers.IntegerField(source="comentarios.count", read_only=True)
    curti = serializers.SerializerMethodField()

    class Meta:
        model = ProjectUpdate
        fields = [
            "id", "project", "project_nome", "author", "conteudo", "foto",
            "curtidas_count", "comentarios_count", "curti", "created_at",
        ]
        read_only_fields = ["id", "author", "created_at"]

    def get_project_nome(self, obj):
        return obj.project.nome if obj.project else None

    def get_curtidas_count(self, obj):
        return obj.curtidas.count()

    def get_curti(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.curtidas.filter(user=request.user).exists()


class EpisodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Episode
        fields = ["id", "project", "numero", "titulo", "link", "created_at"]
        read_only_fields = ["id", "created_at"]


class CommentSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "update", "author", "conteudo", "created_at"]
        read_only_fields = ["id", "author", "created_at"]
