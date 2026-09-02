from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from auth_middleware import AccessTokenAuthentication
from organizations.models import Organization


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'status': 'ok'})


class MeView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get(self, request):
        logto_org_id = request.user.auth.organization_id
        try:
            org = Organization.objects.get(logto_organization_id=logto_org_id)
            org_data = {'id': org.id, 'name': org.name, 'percent_client': str(org.percent_client)}
        except Organization.DoesNotExist:
            org_data = None

        return Response({
            'auth': request.user.auth.to_dict(),
            'organization': org_data,
        })
