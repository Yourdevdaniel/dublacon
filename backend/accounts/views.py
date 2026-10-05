from rest_framework import filters, generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError
from rest_framework.throttling import ScopedRateThrottle

from common.permissions import IsOwnerOrReadOnly
from community.models import Follow, Notification, notify
from .models import BannedIP, PortfolioItem, Role, User, VerificationRequest
from .serializers import (
    MeSerializer,
    VerificationRequestSerializer,
    PortfolioItemSerializer,
    RegisterSerializer,
    RoleSerializer,
    UserMiniSerializer,
    UserPublicSerializer,
)


class IsPortfolioOwnerOrReadOnly(IsOwnerOrReadOnly):
    owner_field = "user"


def client_ip(request):
    # atras de proxy/CDN o IP real vem no X-Forwarded-For; direto, no REMOTE_ADDR
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    return xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR")


class LoginView(ObtainAuthToken):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "registro"

    def perform_create(self, serializer):
        ip = client_ip(self.request)
        if ip and BannedIP.objects.filter(ip=ip).exists():
            raise PermissionDenied("Cadastro bloqueado.")
        user = serializer.save()
        if ip:
            user.registration_ip = ip
            user.save(update_fields=["registration_ip"])


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "senha"

    def post(self, request):
        email = request.data.get("email", "")
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL}/redefinir-senha?uid={uid}&token={token}"
            send_mail(
                "Redefinir senha — DublaCon",
                f"Olá, {user.nome}!\n\nPra redefinir sua senha, acesse:\n{link}\n\n"
                "Se não foi você que pediu, é só ignorar esse email.",
                None,
                [user.email],
            )
        # resposta identica exista ou nao a conta, pra nao vazar emails cadastrados
        return Response({"detail": "Se esse email tiver conta, enviamos o link de redefinição."})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "senha"

    def post(self, request):
        try:
            user = User.objects.get(pk=urlsafe_base64_decode(request.data.get("uid", "")).decode())
        except (User.DoesNotExist, ValueError):
            user = None
        if not user or not default_token_generator.check_token(user, request.data.get("token", "")):
            return Response({"detail": "Link inválido ou expirado. Peça um novo."}, status=400)
        password = request.data.get("password", "")
        try:
            password_validation.validate_password(password, user)
        except ValidationError as e:
            return Response({"detail": " ".join(e.messages)}, status=400)
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"detail": "Senha redefinida! Já dá pra entrar com a nova."})


class MeView(APIView):
    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        serializer = MeSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    # leitura publica: a descoberta (sem login) filtra projetos por papel
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.AllowAny]


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["nome"]

    def get_queryset(self):
        # admin ve contas banidas (pra poder desbanir); os demais, so ativas
        qs = User.objects.all() if self.request.user.is_staff else User.objects.filter(is_active=True)
        return qs.prefetch_related("roles", "portfolio")

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def banir(self, request, pk=None):
        """Toggle: bane (is_active=False) ou desbane. Com banir_ip=true,
        tambem bloqueia novos cadastros do IP de registro."""
        alvo = self.get_object()
        if alvo.is_staff:
            return Response({"detail": "Nao da pra banir um admin."}, status=400)
        alvo.is_active = not alvo.is_active
        alvo.save(update_fields=["is_active"])
        if not alvo.is_active and request.data.get("banir_ip") and alvo.registration_ip:
            BannedIP.objects.get_or_create(ip=alvo.registration_ip)
        return Response({"id": alvo.id, "is_active": alvo.is_active})

    @action(detail=True, methods=["post"])
    def seguir(self, request, pk=None):
        """Toggle: segue se nao segue, deixa de seguir se ja segue."""
        alvo = self.get_object()
        if alvo == request.user:
            return Response({"detail": "Voce nao pode seguir a si mesmo."}, status=400)
        follow, created = Follow.objects.get_or_create(follower=request.user, followed=alvo)
        if created:
            notify(alvo, Notification.Verb.NOVO_SEGUIDOR, target=follow)
        else:
            follow.delete()
        return Response(self.get_serializer(alvo).data)

    @action(detail=True, methods=["get"])
    def seguidores(self, request, pk=None):
        users = User.objects.filter(seguindo__followed=self.get_object())
        return Response(UserMiniSerializer(users, many=True).data)

    @action(detail=True, methods=["get"])
    def seguindo(self, request, pk=None):
        users = User.objects.filter(seguidores__follower=self.get_object())
        return Response(UserMiniSerializer(users, many=True).data)


class VerificationRequestViewSet(viewsets.ModelViewSet):
    serializer_class = VerificationRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = VerificationRequest.objects.select_related("user")
        if self.request.user.is_staff:
            return qs
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        if self.request.user.verified:
            raise DRFValidationError("Sua conta ja e verificada.")
        if VerificationRequest.objects.filter(user=self.request.user, status=VerificationRequest.Status.PENDENTE).exists():
            raise DRFValidationError("Voce ja tem um pedido em analise.")
        serializer.save(user=self.request.user)

    def _decidir(self, pk, status, verified):
        pedido = self.get_object()
        pedido.status = status
        pedido.save(update_fields=["status"])
        pedido.user.verified = verified
        pedido.user.save(update_fields=["verified"])
        notify(pedido.user, Notification.Verb.VERIFICACAO_ATUALIZADA, target=pedido)
        return Response(self.get_serializer(pedido).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def aprovar(self, request, pk=None):
        pedido = self.get_object()
        return self._decidir(pk, VerificationRequest.Status.APROVADA, pedido.tipo)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def recusar(self, request, pk=None):
        return self._decidir(pk, VerificationRequest.Status.RECUSADA, "")


class PortfolioItemViewSet(viewsets.ModelViewSet):
    serializer_class = PortfolioItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsPortfolioOwnerOrReadOnly]

    def get_queryset(self):
        qs = PortfolioItem.objects.all().order_by("-created_at")
        user_id = self.request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
