from django.contrib.contenttypes.models import ContentType
from django.db.models import Avg, Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from common.throttles import EscritaThrottle

from .models import Announcement, BugReport, Message, Notification, Rating, Report, ReportEvidence, notify
from .serializers import (
    TARGET_MODELS,
    AnnouncementSerializer,
    BugReportSerializer,
    MessageSerializer,
    NotificationSerializer,
    RatingSerializer,
    ReportSerializer,
)


class AnnouncementViewSet(viewsets.ModelViewSet):
    """Leitura publica dos avisos ativos; criar/desativar/excluir e so admin."""

    serializer_class = AnnouncementSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = Announcement.objects.all()
        if self.request.user.is_staff:
            return qs
        return qs.filter(ativo=True)

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = Report.objects.select_related("reporter", "reported_user").prefetch_related("evidencias")
        if self.request.user.is_staff:
            return qs
        return qs.filter(reporter=self.request.user)

    def get_permissions(self):
        if self.action == "partial_update":
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def perform_create(self, serializer):
        report = serializer.save(reporter=self.request.user)
        for foto in self.request.FILES.getlist("evidencias"):
            ReportEvidence.objects.create(report=report, foto=foto)


class BugReportViewSet(viewsets.ModelViewSet):
    serializer_class = BugReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = BugReport.objects.select_related("reporter")
        if self.request.user.is_staff:
            return qs
        return qs.filter(reporter=self.request.user)

    def get_permissions(self):
        if self.action == "partial_update":
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]
    throttle_classes = [EscritaThrottle]
    throttle_scope = "escrita"

    def get_queryset(self):
        user = self.request.user
        qs = Message.objects.filter(Q(sender=user) | Q(recipient=user))
        other_id = self.request.query_params.get("with")
        if other_id:
            qs = qs.filter(Q(sender_id=other_id) | Q(recipient_id=other_id))
        return qs

    def perform_create(self, serializer):
        message = serializer.save(sender=self.request.user)
        notify(message.recipient, Notification.Verb.NOVA_MENSAGEM, target=message)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # abrir a thread marca como lidas as mensagens recebidas dela
        other_id = request.query_params.get("with")
        if other_id:
            Message.objects.filter(recipient=request.user, sender_id=other_id, read=False).update(read=True)
        return response


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=["post"])
    def marcar_lida(self, request, pk=None):
        notification = self.get_object()
        notification.read = True
        notification.save(update_fields=["read"])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["get"])
    def nao_lidas(self, request):
        return Response({
            "notificacoes": self.get_queryset().filter(read=False).count(),
            "mensagens": Message.objects.filter(recipient=request.user, read=False).count(),
        })


class RatingViewSet(viewsets.ModelViewSet):
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = Rating.objects.select_related("rater", "target_content_type")
        target_type = self.request.query_params.get("target_type")
        target_id = self.request.query_params.get("target_id")
        if target_type in TARGET_MODELS and target_id:
            content_type = ContentType.objects.get_for_model(TARGET_MODELS[target_type])
            qs = qs.filter(target_content_type=content_type, target_object_id=target_id)
        return qs

    def perform_create(self, serializer):
        rating = serializer.save(rater=self.request.user)
        target = rating.target
        target_owner = getattr(target, "owner", target)
        if target_owner != self.request.user:
            notify(target_owner, Notification.Verb.NOVA_AVALIACAO, target=rating)

    @action(detail=False, methods=["get"])
    def media(self, request):
        target_type = request.query_params.get("target_type")
        target_id = request.query_params.get("target_id")
        if target_type not in TARGET_MODELS or not target_id:
            return Response({"detail": "Informe target_type e target_id."}, status=400)
        content_type = ContentType.objects.get_for_model(TARGET_MODELS[target_type])
        aprovadas = Rating.objects.filter(
            target_content_type=content_type, target_object_id=target_id, status=Rating.Status.APROVADA
        )
        return Response({"media": aprovadas.aggregate(media=Avg("score"))["media"], "total": aprovadas.count()})
