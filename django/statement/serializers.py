from decimal import Decimal
from urllib.parse import quote
from rest_framework import serializers
from statement.models import Receipt, BankTransfer, TransferDocument


def content_disposition(filename):
    """attachment с именем файла — с ASCII-заменителем для старых клиентов и
    RFC 5987 filename* для нормального отображения кириллицы/юникода."""
    ascii_fallback = filename.encode('ascii', 'replace').decode('ascii').replace('?', '_')
    return f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{quote(filename)}"


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
    payer_name = serializers.CharField(source='payer.name', read_only=True, default=None)
    payer_inn = serializers.CharField(source='payer.inn', read_only=True, default=None)
    receipts = serializers.PrimaryKeyRelatedField(many=True, queryset=Receipt.objects.all(), required=False)
    receipt_summaries = serializers.SerializerMethodField()

    class Meta:
        model = BankTransfer
        fields = [
            'id', 'from_recipient', 'from_recipient_name',
            'to_recipient', 'to_recipient_name',
            'amount', 'date', 'status',
            'payer', 'payer_name', 'payer_inn',
            'receipts', 'receipt_summaries',
            'note', 'created_at',
        ]
        read_only_fields = ['created_at']

    def get_receipt_summaries(self, obj):
        return [{'id': r.id, 'date': r.date.isoformat(), 'amount': str(r.amount)} for r in obj.receipts.all()]


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


class TransferDocumentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)
    url = serializers.SerializerMethodField()

    class Meta:
        model = TransferDocument
        fields = ['id', 'file', 'url', 'original_name', 'size', 'content_type', 'uploaded_at']
        read_only_fields = ['id', 'original_name', 'size', 'content_type', 'uploaded_at']

    def get_url(self, obj):
        if not obj.file:
            return None
        return obj.file.storage.url(
            obj.file.name,
            parameters={'ResponseContentDisposition': content_disposition(obj.original_name)},
        )

    def create(self, validated_data):
        upload = validated_data.pop('file')
        return TransferDocument.objects.create(
            file=upload,
            original_name=upload.name,
            size=upload.size,
            content_type=upload.content_type or '',
            **validated_data,
        )
