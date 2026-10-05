from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.views import (
    LoginView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PortfolioItemViewSet,
    RegisterView,
    RoleViewSet,
    UserViewSet,
    VerificationRequestViewSet,
)
from community.views import (
    AnnouncementViewSet,
    BugReportViewSet,
    MessageViewSet,
    NotificationViewSet,
    RatingViewSet,
    ReportViewSet,
)
from projects.views import (
    ApplicationViewSet,
    CommentViewSet,
    EpisodeViewSet,
    ProjectUpdateViewSet,
    ProjectVagaViewSet,
    ProjectViewSet,
)

router = DefaultRouter()
router.register("roles", RoleViewSet, basename="role")
router.register("users", UserViewSet, basename="user")
router.register("portfolio", PortfolioItemViewSet, basename="portfolio")
router.register("projects", ProjectViewSet, basename="project")
router.register("vagas", ProjectVagaViewSet, basename="vaga")
router.register("candidaturas", ApplicationViewSet, basename="application")
router.register("updates", ProjectUpdateViewSet, basename="projectupdate")
router.register("episodios", EpisodeViewSet, basename="episode")
router.register("comentarios", CommentViewSet, basename="comment")
router.register("denuncias", ReportViewSet, basename="report")
router.register("bugs", BugReportViewSet, basename="bugreport")
router.register("mensagens", MessageViewSet, basename="message")
router.register("notificacoes", NotificationViewSet, basename="notification")
router.register("avaliacoes", RatingViewSet, basename="rating")
router.register("avisos", AnnouncementViewSet, basename="announcement")
router.register("verificacao", VerificationRequestViewSet, basename="verification")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/login/", LoginView.as_view(), name="login"),
    path("api/auth/me/", MeView.as_view(), name="me"),
    path("api/auth/senha/esqueci/", PasswordResetRequestView.as_view(), name="senha-esqueci"),
    path("api/auth/senha/redefinir/", PasswordResetConfirmView.as_view(), name="senha-redefinir"),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
