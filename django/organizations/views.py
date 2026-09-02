from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from organizations.models import Bank, Recipient, Payer
from organizations.serializers import OrganizationSerializer, CounterpartySerializer, CounterpartyListSerializer, BankSerializer, RecipientSerializer, PayerSerializer
from auth_middleware import AccessTokenAuthentication
from admins.permissions import IsAdmin
from common import get_organization


class OrganizationDetailView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get(self, request):
        org = get_organization(request)
        return Response(OrganizationSerializer(org).data)


class CounterpartyListView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get(self, request):
        org = get_organization(request)
        counterparties = org.counterparties.all()
        return Response(CounterpartyListSerializer(counterparties, many=True).data)

    def post(self, request):
        org = get_organization(request)
        serializer = CounterpartyListSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organization=org)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CounterpartyDetailView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get_object(self, request, pk):
        org = get_organization(request)
        return org.counterparties.get(pk=pk)

    def get(self, request, pk):
        counterparty = self.get_object(request, pk)
        return Response(CounterpartySerializer(counterparty).data)

    def patch(self, request, pk):
        counterparty = self.get_object(request, pk)
        data = {k: v for k, v in request.data.items() if k != 'name'}
        serializer = CounterpartyListSerializer(counterparty, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        counterparty = self.get_object(request, pk)
        counterparty.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BankListView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def post(self, request, counterparty_pk):
        org = get_organization(request)
        counterparty = org.counterparties.get(pk=counterparty_pk)
        serializer = BankSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(counterparty=counterparty)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RecipientListView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get(self, request):
        recipients = Recipient.objects.all()
        return Response(RecipientSerializer(recipients, many=True).data)


class PayerListView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get(self, request):
        org = get_organization(request)
        payers = Payer.objects.filter(organization=org)
        return Response(PayerSerializer(payers, many=True).data)


class BankDetailView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get_object(self, request, pk):
        org = get_organization(request)
        return Bank.objects.get(pk=pk, counterparty__organization=org)

    def patch(self, request, pk):
        bank = self.get_object(request, pk)
        serializer = BankSerializer(bank, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        bank = self.get_object(request, pk)
        bank.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
