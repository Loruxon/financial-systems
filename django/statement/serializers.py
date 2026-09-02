from decimal import Decimal
from rest_framework import serializers
from statement.models import Receipt, BankTransfer


class ReceiptBaseSerializer(serializers.ModelSerializer):
    recipient_name = serializers.CharField(source='recipient.name', read_only=True, default=None)
    payer_name = serializers.CharField(source='payer.name', read_only=True, default=None)
    payer_inn = serializers.CharField(source='payer.inn', read_only=True, default=None)
    organization_id = serializers.IntegerField(source='payer.organization.id', read_only=True, default=None)
    organization_name = serializers.CharField(source='payer.organization.name', read_only=True, default=None)
    request_invoices = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()

    def get_request_invoices(self, obj):
        return [{'id': r.id, 'invoice': r.invoice} for r in obj.requests.all()]

    def get_remaining_amount(self, obj):
        used = sum((r.prf_amount for r in obj.requests.all() if r.prf_amount is not None), Decimal('0'))
        return str(obj.amount - used)

    class Meta:
        model = Receipt
        fields = []


class ReceiptSerializer(ReceiptBaseSerializer):
    class Meta(ReceiptBaseSerializer.Meta):
        fields = [
            'id', 'date', 'amount', 'net_amount',
            'recipient', 'recipient_name',
            'payer', 'payer_name', 'payer_inn',
            'organization_id', 'organization_name',
            'status', 'requests', 'request_invoices', 'remaining_amount',
            'confirmed_at', 'created_at',
        ]
        read_only_fields = ['net_amount', 'status', 'requests', 'request_invoices', 'confirmed_at', 'created_at']


class ReceiptCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = ['date', 'amount', 'recipient', 'payer']


class ReceiptConfirmSerializer(serializers.Serializer):
    request_ids = serializers.ListField(child=serializers.IntegerField(), required=False)


class BankTransferSerializer(serializers.ModelSerializer):
    from_recipient_name = serializers.CharField(source='from_recipient.name', read_only=True)
    to_recipient_name = serializers.CharField(source='to_recipient.name', read_only=True)

    class Meta:
        model = BankTransfer
        fields = [
            'id', 'from_recipient', 'from_recipient_name',
            'to_recipient', 'to_recipient_name',
            'amount', 'date', 'note', 'created_at',
        ]
        read_only_fields = ['created_at']


class ReceiptListSerializer(ReceiptBaseSerializer):
    class Meta(ReceiptBaseSerializer.Meta):
        fields = [
            'id', 'date', 'amount', 'net_amount',
            'recipient', 'recipient_name',
            'payer', 'payer_name', 'payer_inn',
            'organization_id', 'organization_name',
            'status', 'requests', 'request_invoices', 'remaining_amount',
            'confirmed_at', 'created_at',
        ]
