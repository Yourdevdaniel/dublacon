from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from common.permissions import IsAuthorOrReadOnly, IsOwnerOrReadOnly
from common.throttles import EscritaThrottle
from community.models import Notification, notify
from .models import Application, Comment, Episode, Like, Project, ProjectUpdate, ProjectVaga
from .serializers import (
    ApplicationSerializer,
    CommentSerializer,
    EpisodeSerializer,
    ProjectSerializer,
    ProjectUpdateSerializer,
    ProjectVagaSerializer,
)


class PaginaPadrao(PageNumberPagination):
    """So nos endpoints que crescem sem limite (projetos e posts).
    Resposta vira {count, next, previous, results}."""

    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 50


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    pagination_class = PaginaPadrao

    def get_queryset(self):
        qs = Project.objects.select_related("owner").order_by("-created_at")
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        owner_id = self.request.query_params.get("owner")
        if owner_id:
            qs = qs.filter(owner_id=owner_id)
        categoria = self.request.query_params.get("categoria")
        if categoria:
            qs = qs.filter(categoria__iexact=categoria)
        role_id = self.request.query_params.get("role")
        if role_id:
            qs = qs.filter(vagas__role_id=role_id).distinct()
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["get"])
    def elenco(self, request, pk=None):
        """Quem esta em cada vaga preenchida do projeto."""
        project = self.get_object()
        aceitas = (
            Application.objects.filter(vaga__project=project, status=Application.Status.ACEITA)
            .select_related("vaga", "vaga__role", "applicant")
        )
        data = [
            {
                "vaga_id": app.vaga_id,
                "vaga": app.vaga.titulo,
                "role": app.vaga.role.nome,
                "usuario": {"id": app.applicant_id, "nome": app.applicant.nome},
            }
            for app in aceitas
        ]
        return Response(data)


class ProjectVagaViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectVagaSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = ProjectVaga.objects.select_related("project", "role")
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def _checar_dono(self, project):
        if project.owner != self.request.user:
            raise PermissionDenied("So o dono do projeto pode gerenciar vagas.")

    def perform_create(self, serializer):
        self._checar_dono(serializer.validated_data["project"])
        serializer.save()

    def perform_update(self, serializer):
        self._checar_dono(serializer.instance.project)
        serializer.save()

    def perform_destroy(self, instance):
        self._checar_dono(instance.project)
        instance.delete()


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = Application.objects.select_related("vaga", "vaga__project", "applicant")
        vaga_id = self.request.query_params.get("vaga")
        if vaga_id:
            qs = qs.filter(vaga_id=vaga_id)
        return qs.filter(Q(applicant=user) | Q(vaga__project__owner=user)).distinct()

    def perform_create(self, serializer):
        serializer.save(applicant=self.request.user)

    def _mudar_status(self, request, pk, novo_status, verb):
        application = self.get_object()
        if application.vaga.project.owner != request.user:
            raise PermissionDenied("So o dono do projeto decide a candidatura.")
        application.status = novo_status
        application.save(update_fields=["status"])
        notify(application.applicant, verb, target=application)
        return Response(self.get_serializer(application).data)

    @action(detail=True, methods=["post"])
    def aceitar(self, request, pk=None):
        return self._mudar_status(request, pk, Application.Status.ACEITA, Notification.Verb.CANDIDATURA_ACEITA)

    @action(detail=True, methods=["post"])
    def recusar(self, request, pk=None):
        return self._mudar_status(request, pk, Application.Status.RECUSADA, Notification.Verb.CANDIDATURA_RECUSADA)


class ProjectUpdateViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectUpdateSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    pagination_class = PaginaPadrao
    throttle_classes = [EscritaThrottle]
    throttle_scope = "escrita"

    def get_queryset(self):
        qs = ProjectUpdate.objects.select_related("project", "author")
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        if self.request.query_params.get("seguindo") and self.request.user.is_authenticated:
            qs = qs.filter(author__seguidores__follower=self.request.user)
        return qs

    def perform_create(self, serializer):
        project = serializer.validated_data.get("project")
        if project and project.owner != self.request.user:
            raise PermissionDenied("So o dono do projeto pode postar atualizacoes.")
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def curtir(self, request, pk=None):
        update = self.get_object()
        like, created = Like.objects.get_or_create(update=update, user=request.user)
        if not created:
            like.delete()
        serializer = self.get_serializer(update)
        return Response(serializer.data)


class EpisodeViewSet(viewsets.ModelViewSet):
    serializer_class = EpisodeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Episode.objects.select_related("project")
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def _checar_dono(self, project):
        if project.owner != self.request.user:
            raise PermissionDenied("So o dono do projeto pode gerenciar episodios.")

    def perform_create(self, serializer):
        self._checar_dono(serializer.validated_data["project"])
        serializer.save()

    def perform_update(self, serializer):
        self._checar_dono(serializer.instance.project)
        serializer.save()

    def perform_destroy(self, instance):
        self._checar_dono(instance.project)
        instance.delete()


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    throttle_classes = [EscritaThrottle]
    throttle_scope = "escrita"

    def get_queryset(self):
        qs = Comment.objects.select_related("update", "author")
        update_id = self.request.query_params.get("update")
        if update_id:
            qs = qs.filter(update_id=update_id)
        return qs

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        if comment.author_id != comment.update.author_id:
            notify(comment.update.author, Notification.Verb.NOVO_COMENTARIO, target=comment)
