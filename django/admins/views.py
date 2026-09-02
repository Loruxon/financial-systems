from decimal import Decimal
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import MultiPartParser
from django.db import transaction
from auth_middleware import AccessTokenAuthentication
from admins.models import AdminUser
from admins.permissions import IsAdmin, require_section
from admins.serializers import (
    AdminRequestListSerializer, AdminRequestSerializer, AdminUserSerializer, AdminPayerSerializer,
    AdminDocumentSerializer, WorkSchemeSerializer,
)
from requests.models import Request, Document
from organizations.models import Organization, Payer, Recipient
from schemes.models import WorkScheme
from statement.models import Receipt, BankTransfer
from statement.views import FROZEN_STATUSES
from outgoing_payments.models import OutgoingPayment


def get_or_create_admin(request):
    auth = request.user.auth
    admin_user, _ = AdminUser.objects.get_or_create(logto_id=auth.sub)
    return admin_user


class AdminPayerListView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        payers = Payer.objects.select_related('organization').all()
        return Response(AdminPayerSerializer(payers, many=True).data)


class AdminUserListView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        admins = AdminUser.objects.all().order_by('name', 'email')
        return Response(AdminUserSerializer(admins, many=True).data)


class AdminWorkSchemeListView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        schemes = WorkScheme.objects.all()
        return Response(WorkSchemeSerializer(schemes, many=True).data)


def _sum_by_organization(queryset, organization_field, amount_field):
    rows = queryset.values(organization_field).annotate(total=Sum(amount_field))
    return {row[organization_field]: row['total'] or Decimal('0') for row in rows}


class AdminOrganizationBalanceListView(APIView):
    """Текущий снимок по каждой организации — те же данные, что и в /statement у клиента,
    только сразу по всем организациям."""
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [require_section('organization_balances')]

    def get(self, request):
        received = _sum_by_organization(
            Receipt.objects.filter(status=Receipt.CONFIRMED),
            'payer__organization', 'amount',
        )
        spent = _sum_by_organization(
            Request.objects.filter(status=Request.CLOSED, prf_amount__isnull=False),
            'organization', 'prf_amount',
        )
        frozen = _sum_by_organization(
            Request.objects.filter(status__in=FROZEN_STATUSES, prf_amount__isnull=False),
            'organization', 'prf_amount',
        )

        rows = []
        for org in Organization.objects.order_by('name'):
            received_v = received.get(org.id, Decimal('0'))
            spent_v = spent.get(org.id, Decimal('0'))
            frozen_v = frozen.get(org.id, Decimal('0'))
            rows.append({
                'organization_id': org.id,
                'organization_name': org.name,
                'balance': str(received_v - frozen_v - spent_v),
                'received': str(received_v),
                'spent': str(spent_v),
                'frozen': str(frozen_v),
            })

        return Response(rows)


class AdminRecipientBalanceListView(APIView):
    """Баланс каждого внутреннего счёта (Recipient — ATL/CIC/...) — карточки
    в шапке админки. Раньше считалось на фронте (useRecipientBalances) из
    четырёх отдельных списков; здесь та же логика, но одним запросом и с
    собственным правом доступа, не завязанным на разделы "Переводы"/
    "Исходящие платежи"/"Поступления"."""
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [require_section('recipient_balances')]

    def get(self, request):
        balances = {
            r.id: {'id': r.id, 'name': r.name, 'total': r.initial_balance}
            for r in Recipient.objects.all()
        }

        for r in Receipt.objects.filter(status=Receipt.CONFIRMED, recipient_id__isnull=False):
            entry = balances.get(r.recipient_id)
            if not entry:
                continue
            net = r.net_amount if r.net_amount is not None else r.amount * Decimal('0.998')
            entry['total'] += net

        for t in BankTransfer.objects.all():
            from_entry = balances.get(t.from_recipient_id)
            if from_entry:
                from_entry['total'] -= t.amount
            to_entry = balances.get(t.to_recipient_id)
            if to_entry:
                to_entry['total'] += t.amount

        # Списываем только реально исполненные платежи — пока платёж
        # "Новый"/"В работе"/"На исполнении", деньги со счёта ещё не ушли.
        executed = OutgoingPayment.objects.filter(
            status=OutgoingPayment.EXECUTED, account_id__isnull=False, amount__isnull=False,
        )
        for op in executed:
            entry = balances.get(op.account_id)
            if entry:
                entry['total'] -= op.amount

        rows = [{'id': b['id'], 'name': b['name'], 'total': str(b['total'])} for b in balances.values()]
        return Response(rows)


class AdminRequestListView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = Request.objects.select_related('organization', 'assigned_admin', 'work_scheme').all()
        return Response(AdminRequestListSerializer(qs, many=True).data)


class AdminRequestDetailView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [require_section('requests')]

    def get_object(self, pk):
        try:
            return Request.objects.select_related(
                'organization', 'assigned_admin', 'work_scheme'
            ).prefetch_related('work_scheme__currencies').get(pk=pk)
        except Request.DoesNotExist:
            raise NotFound('Request not found')

    def get(self, request, pk):
        instance = self.get_object(pk)
        return Response(AdminRequestSerializer(instance).data)

    def patch(self, request, pk):
        with transaction.atomic():
            try:
                instance = Request.objects.select_for_update(of=('self',)).select_related(
                    'organization', 'assigned_admin'
                ).get(pk=pk)
            except Request.DoesNotExist:
                raise NotFound('Request not found')

            serializer = AdminRequestSerializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()

            if 'execution_date' in request.data and instance.execution_date and instance.execution_date_sebes is None:
                instance.execution_date_sebes = instance.execution_date
                instance.save(update_fields=['execution_date_sebes'])

            assigned_admin_id = request.data.get('assigned_admin_id')
            if assigned_admin_id is not None:
                try:
                    instance.assigned_admin = AdminUser.objects.get(pk=assigned_admin_id)
                    instance.save(update_fields=['assigned_admin'])
                except AdminUser.DoesNotExist:
                    raise ValidationError({'assigned_admin_id': 'Администратор не найден'})
            elif instance.assigned_admin is None:
                instance.assigned_admin = get_or_create_admin(request)
                instance.save(update_fields=['assigned_admin'])

            if 'work_scheme_id' in request.data:
                work_scheme_id = request.data.get('work_scheme_id')
                if work_scheme_id is None:
                    instance.work_scheme = None
                else:
                    try:
                        instance.work_scheme = WorkScheme.objects.get(pk=work_scheme_id)
                    except WorkScheme.DoesNotExist:
                        raise ValidationError({'work_scheme_id': 'Схема не найдена'})
                instance.save(update_fields=['work_scheme'])

        return Response(AdminRequestSerializer(instance).data)


class AdminDocumentListView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [require_section('requests')]
    parser_classes = [MultiPartParser]

    def get_request_instance(self, pk):
        try:
            return Request.objects.get(pk=pk)
        except Request.DoesNotExist:
            raise NotFound('Request not found')

    def get(self, request, pk):
        req = self.get_request_instance(pk)
        qs = req.documents.all()
        section = request.query_params.get('section')
        if section:
            qs = qs.filter(section=section)
        return Response(AdminDocumentSerializer(qs, many=True, context={'request': request}).data)

    def post(self, request, pk):
        req = self.get_request_instance(pk)
        section = request.data.get('section')
        if section not in (Document.SECTION_PAYMENT, Document.SECTION_CLOSING):
            raise ValidationError({'section': 'Некорректный блок'})

        serializer = AdminDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc = serializer.save(request=req, uploaded_by_admin=True)
        return Response(AdminDocumentSerializer(doc, context={'request': request}).data, status=status.HTTP_201_CREATED)


class AdminDocumentDetailView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [require_section('requests')]

    def get_object(self, pk):
        try:
            return Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            raise NotFound('Document not found')

    def patch(self, request, pk):
        doc = self.get_object(pk)
        serializer = AdminDocumentSerializer(doc, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        doc = self.get_object(pk)
        doc.file.delete(save=False)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
