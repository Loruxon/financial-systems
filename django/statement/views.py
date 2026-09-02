from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework import status
from django.db import transaction
from django.db.models import Sum
from auth_middleware import AccessTokenAuthentication
from admins.permissions import IsAdmin
from common import get_organization
from requests.models import Request
from statement.models import Receipt, BankTransfer
from statement.serializers import (
    ReceiptSerializer, ReceiptCreateSerializer,
    ReceiptConfirmSerializer, ReceiptListSerializer,
    BankTransferSerializer,
)

FROZEN_STATUSES = [
    Request.NEW, Request.IN_REVIEW, Request.SENT_TO_BANK,
    Request.AWAITING_CLOSING_DOCS, Request.CLOSING_DOCS_REVIEW,
    Request.CORRECTION, Request.CORRECTION_REVIEW,
]

SELECT = ('recipient', 'payer__organization')


class ReceiptListView(APIView):
    """Подтверждённые поступления организации — для выбора при создании заявки
    (блок «Плательщик в РФ»), без прав администратора."""
    authentication_classes = [AccessTokenAuthentication]

    def get(self, request):
        org = get_organization(request)
        qs = Receipt.objects.filter(
            payer__organization=org,
            status=Receipt.CONFIRMED,
        ).select_related(*SELECT).prefetch_related('requests')
        return Response(ReceiptListSerializer(qs, many=True).data)


class AdminIncomingPaymentListView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = Receipt.objects.select_related(*SELECT).prefetch_related('requests').all()
        return Response(ReceiptListSerializer(qs, many=True).data)

    def post(self, request):
        serializer = ReceiptCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        receipt = serializer.save()
        receipt = Receipt.objects.select_related(*SELECT).get(pk=receipt.pk)
        return Response(ReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)


class AdminIncomingPaymentBulkCreateView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = ReceiptCreateSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            receipts = serializer.save()
        pks = [r.pk for r in receipts]
        receipts = Receipt.objects.select_related(*SELECT).filter(pk__in=pks)
        return Response(ReceiptSerializer(receipts, many=True).data, status=status.HTTP_201_CREATED)


class AdminIncomingPaymentDetailView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [IsAdmin]

    def get_object(self, pk):
        try:
            return Receipt.objects.select_related(*SELECT).prefetch_related('requests').get(pk=pk)
        except Receipt.DoesNotExist:
            raise NotFound('Receipt not found')

    def get(self, request, pk):
        return Response(ReceiptSerializer(self.get_object(pk)).data)

    def patch(self, request, pk):
        receipt = self.get_object(pk)

        if 'confirm' in request.data:
            with transaction.atomic():
                if request.data['confirm']:
                    receipt.confirm()
                else:
                    receipt.unconfirm()
                    receipt.requests.clear()
        elif 'request_ids' in request.data:
            request_ids = request.data.get('request_ids', [])
            with transaction.atomic():
                if request_ids:
                    qs = Request.objects.filter(pk__in=request_ids)
                    if qs.count() != len(request_ids):
                        raise ValidationError({'request_ids': 'One or more requests not found'})
                    receipt.requests.set(qs)
                else:
                    receipt.requests.clear()
        else:
            serializer = ReceiptCreateSerializer(receipt, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            receipt = serializer.save()

        receipt = Receipt.objects.select_related(*SELECT).prefetch_related('requests').get(pk=receipt.pk)
        return Response(ReceiptSerializer(receipt).data)

    def delete(self, request, pk):
        self.get_object(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminBankTransferListView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = BankTransfer.objects.select_related('from_recipient', 'to_recipient').all()
        return Response(BankTransferSerializer(qs, many=True).data)

    def post(self, request):
        serializer = BankTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transfer = serializer.save()
        transfer = BankTransfer.objects.select_related('from_recipient', 'to_recipient').get(pk=transfer.pk)
        return Response(BankTransferSerializer(transfer).data, status=status.HTTP_201_CREATED)


class AdminBankTransferDetailView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        try:
            BankTransfer.objects.get(pk=pk).delete()
        except BankTransfer.DoesNotExist:
            raise NotFound()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StatementListView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get(self, request):
        org = get_organization(request)

        receipts = Receipt.objects.filter(
            payer__organization=org,
            status=Receipt.CONFIRMED,
        ).select_related('payer', 'recipient').prefetch_related('requests').distinct()

        closed_requests = Request.objects.filter(
            organization=org,
            status=Request.CLOSED,
            prf_amount__isnull=False,
        )

        transactions = []

        for r in receipts:
            transactions.append({
                'id': r.id,
                'date': r.date.isoformat(),
                'type': 'credit',
                'payer_name': r.payer.name if r.payer else None,
                'recipient_name': r.recipient.name if r.recipient else None,
                # Одно поступление может быть привязано сразу к нескольким заявкам
                # (клиент сам разбивает его при создании заявки, либо привязывает админ).
                'requests': [
                    {'id': req.id, 'invoice': req.invoice, 'counterparty_name': req.counterparty_name or None}
                    for req in r.requests.all()
                ],
                'amount': str(r.amount),
            })

        # Списание не имеет ни плательщика, ни получателя — это не перевод
        # между счетами, а закрытие заявки. Раньше это условно "втискивали"
        # в recipient_name, из-за чего в UI заявка выглядела как получатель.
        # Теперь у неё свои поля, а payer_name/recipient_name честно пустые.
        for req in closed_requests:
            date = req.prf_date or req.created_at.date()
            transactions.append({
                'id': req.id,
                'date': date.isoformat(),
                'type': 'debit',
                'payer_name': None,
                'recipient_name': None,
                'requests': [
                    {'id': req.id, 'invoice': req.invoice, 'counterparty_name': req.counterparty_name or None},
                ],
                'amount': str(req.prf_amount),
            })

        transactions.sort(key=lambda x: x['date'])

        return Response(transactions)


class BalanceDetailView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get(self, request):
        org = get_organization(request)

        received = Receipt.objects.filter(
            payer__organization=org,
            status=Receipt.CONFIRMED,
        ).distinct().aggregate(total=Sum('amount'))['total'] or Decimal('0')

        frozen = Request.objects.filter(
            organization=org,
            status__in=FROZEN_STATUSES,
            prf_amount__isnull=False,
        ).aggregate(total=Sum('prf_amount'))['total'] or Decimal('0')

        spent = Request.objects.filter(
            organization=org,
            status=Request.CLOSED,
            prf_amount__isnull=False,
        ).aggregate(total=Sum('prf_amount'))['total'] or Decimal('0')

        return Response({
            'received': str(received),
            'frozen': str(frozen),
            'spent': str(spent),
            'available': str(received - frozen - spent),
        })
