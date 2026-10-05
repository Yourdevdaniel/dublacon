from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsOwnerOrReadOnly(BasePermission):
    """Leitura livre; escrita so pra quem e dono do objeto (obj.owner)."""

    owner_field = "owner"

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return getattr(obj, self.owner_field, None) == request.user


class IsAuthorOrReadOnly(IsOwnerOrReadOnly):
    owner_field = "author"


class IsStaffOrOwner(BasePermission):
    """Pra filas de moderacao: admin ve tudo, dono do registro ve o que e dele."""

    owner_field = "reporter"

    def has_object_permission(self, request, view, obj):
        return request.user.is_staff or getattr(obj, self.owner_field, None) == request.user
