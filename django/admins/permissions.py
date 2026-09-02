from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        auth = getattr(request.user, 'auth', None)
        return auth is not None and auth.is_admin
