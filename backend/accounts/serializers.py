from django.contrib.auth import password_validation
from rest_framework import serializers

import re

from .crypto_fields import deterministic_hash
from .models import PortfolioItem, Role, User, VerificationRequest
from .validators import validate_cpf


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "nome"]


class UserMiniSerializer(serializers.ModelSerializer):
    """Representacao leve pra usar embutida em outros serializers (dono de
    projeto, remetente de mensagem, etc.) sem carregar o portfolio inteiro."""

    class Meta:
        model = User
        fields = ["id", "nome", "foto", "verified"]


class PortfolioItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioItem
        fields = ["id", "titulo", "descricao", "link", "arquivo", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        link = attrs.get("link", getattr(self.instance, "link", ""))
        arquivo = attrs.get("arquivo", getattr(self.instance, "arquivo", None))
        if not link and not arquivo:
            raise serializers.ValidationError("Informe um link ou um arquivo.")
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "nome", "cpf", "telefone", "foto", "password"]

    def validate_cpf(self, value):
        validate_cpf(value)
        digitos = re.sub(r"\D", "", value)
        if User.objects.filter(cpf_hash=deterministic_hash(digitos)).exists():
            raise serializers.ValidationError("Ja existe uma conta com esse CPF.")
        return value

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class UserPublicSerializer(serializers.ModelSerializer):
    """Perfil visto por outros usuarios: sem email, cpf ou telefone."""

    roles = RoleSerializer(many=True, read_only=True)
    portfolio = PortfolioItemSerializer(many=True, read_only=True)
    seguidores_count = serializers.IntegerField(source="seguidores.count", read_only=True)
    seguindo_count = serializers.IntegerField(source="seguindo.count", read_only=True)
    sigo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "nome", "foto", "bio", "roles", "portfolio", "date_joined",
            "seguidores_count", "seguindo_count", "sigo", "is_active", "verified",
        ]

    def get_sigo(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.seguidores.filter(follower=request.user).exists()


class MeSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    role_ids = serializers.PrimaryKeyRelatedField(
        source="roles", queryset=Role.objects.all(), many=True, write_only=True, required=False
    )
    portfolio = PortfolioItemSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "nome", "cpf", "telefone", "foto", "bio",
            "roles", "role_ids", "portfolio", "date_joined", "is_staff", "verified",
        ]
        read_only_fields = ["id", "email", "cpf", "date_joined", "is_staff", "verified"]


class VerificationRequestSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)
    cpf_consulta = serializers.SerializerMethodField()

    class Meta:
        model = VerificationRequest
        fields = [
            "id", "user", "tipo", "drt_numero", "drt_uf", "justificativa",
            "documento", "cpf_consulta", "status", "created_at",
        ]
        read_only_fields = ["id", "user", "status", "created_at"]

    def get_cpf_consulta(self, obj):
        """A consulta oficial de DRT exige nome completo, UF, CPF e numero do
        registro -- o CPF do solicitante so aparece pro admin que vai conferir."""
        request = self.context.get("request")
        if request and request.user.is_staff and obj.tipo == "ator":
            return obj.user.cpf
        return None

    def validate(self, attrs):
        if attrs.get("tipo") == "ator":
            numero = attrs.get("drt_numero", "")
            if not numero:
                raise serializers.ValidationError({"drt_numero": "Informe o numero do seu DRT."})
            digitos = re.sub(r"\D", "", numero)
            if digitos:
                # consulta oficial usa 7 digitos, completando com zeros a esquerda
                attrs["drt_numero"] = digitos.zfill(7)
            if not attrs.get("drt_uf"):
                raise serializers.ValidationError({"drt_uf": "Informe a UF onde o registro foi emitido."})
            if not attrs.get("documento"):
                raise serializers.ValidationError({"documento": "Anexe uma foto do documento DRT."})
        return attrs
