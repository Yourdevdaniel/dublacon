from rest_framework.permissions import SAFE_METHODS
from rest_framework.throttling import ScopedRateThrottle


class EscritaThrottle(ScopedRateThrottle):
    """Limita so escrita (POST/PATCH/DELETE) — leitura passa livre, senao o
    proprio polling do frontend estouraria o limite."""

    def allow_request(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return super().allow_request(request, view)
