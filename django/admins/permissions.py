from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        auth = getattr(request.user, 'auth', None)
        return auth is not None and auth.is_admin


def require_section(*sections):
    """Доступ только для админов, у которых открыт хотя бы один из
    перечисленных разделов (полный доступ — открыты все разделы)."""
    class SectionPermission(BasePermission):
        def has_permission(self, request, view):
            if not IsAdmin().has_permission(request, view):
                return False
            from admins.models import AdminUser
            admin_user, _ = AdminUser.objects.get_or_create(logto_id=request.user.auth.sub)
            visible = set(admin_user.visible_sections())
            return bool(visible.intersection(sections))

    return SectionPermission
