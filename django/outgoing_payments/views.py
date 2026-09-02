from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import MultiPartParser
from auth_middleware import AccessTokenAuthentication
from admins.permissions import require_section
from organizations.models import Recipient
from requests.models import Request
from outgoing_payments.models import OutgoingPayment, OutgoingPaymentDocument
from outgoing_payments.serializers import OutgoingPaymentSerializer, OutgoingPaymentDocumentSerializer

# Счёт списания по умолчанию для нового платежа, если явно не указан другой.
DEFAULT_ACCOUNT_NAME = 'CIC'


class OutgoingPaymentListView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [require_section('outgoing_payments')]

    def get(self, request):
        qs = OutgoingPayment.objects.select_related('account').prefetch_related('requests').all()
        return Response(OutgoingPaymentSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data.copy() if request.data else {}
        if not data.get('account_id'):
            default_account = Recipient.objects.filter(name=DEFAULT_ACCOUNT_NAME).first()
            if default_account:
                data['account_id'] = default_account.id
        serializer = OutgoingPaymentSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(OutgoingPaymentSerializer(instance).data, status=status.HTTP_201_CREATED)


class OutgoingPaymentDetailView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [require_section('outgoing_payments')]

    def get_object(self, pk):
        try:
            return OutgoingPayment.objects.select_related('account').prefetch_related('requests').get(pk=pk)
        except OutgoingPayment.DoesNotExist:
            raise NotFound('Outgoing payment not found')

    def get(self, request, pk):
        return Response(OutgoingPaymentSerializer(self.get_object(pk)).data)

    def patch(self, request, pk):
        instance = self.get_object(pk)

        if 'request_ids' in request.data:
            request_ids = request.data.get('request_ids', [])
            if request_ids:
                qs = Request.objects.filter(pk__in=request_ids)
                if qs.count() != len(request_ids):
                    raise ValidationError({'request_ids': 'One or more requests not found'})
                instance.requests.set(qs)
            else:
                instance.requests.clear()
        else:
            serializer = OutgoingPaymentSerializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()

        instance = OutgoingPayment.objects.select_related('account').prefetch_related('requests').get(pk=instance.pk)
        return Response(OutgoingPaymentSerializer(instance).data)

    def delete(self, request, pk):
        self.get_object(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OutgoingPaymentDocumentListView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [require_section('outgoing_payments')]
    parser_classes = [MultiPartParser]

    def get_payment(self, pk):
        try:
            return OutgoingPayment.objects.get(pk=pk)
        except OutgoingPayment.DoesNotExist:
            raise NotFound('Outgoing payment not found')

    def get(self, request, pk):
        payment = self.get_payment(pk)
        return Response(OutgoingPaymentDocumentSerializer(payment.documents.all(), many=True).data)

    def post(self, request, pk):
        payment = self.get_payment(pk)
        serializer = OutgoingPaymentDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc = serializer.save(outgoing_payment=payment)
        return Response(OutgoingPaymentDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class OutgoingPaymentDocumentDetailView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    permission_classes = [require_section('outgoing_payments')]

    def get_object(self, pk):
        try:
            return OutgoingPaymentDocument.objects.get(pk=pk)
        except OutgoingPaymentDocument.DoesNotExist:
            raise NotFound('Document not found')

    def delete(self, request, pk):
        doc = self.get_object(pk)
        doc.file.delete(save=False)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
