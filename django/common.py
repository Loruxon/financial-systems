from rest_framework.exceptions import NotFound
from organizations.models import Organization


def get_organization(request):
    org_id = getattr(request.user.auth, 'organization_id', None)
    if not org_id:
        raise NotFound('Organization context required')
    try:
        return Organization.objects.get(logto_organization_id=org_id)
    except Organization.DoesNotExist:
        raise NotFound('Organization not found')
