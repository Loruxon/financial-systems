from urllib.parse import quote
from rest_framework import serializers
from organizations.models import Recipient
from outgoing_payments.models import OutgoingPayment, OutgoingPaymentDocument


def content_disposition(filename):
    """attachment с именем файла — с ASCII-заменителем для старых клиентов и
    RFC 5987 filename* для нормального отображения кириллицы/юникода."""
    ascii_fallback = filename.encode('ascii', 'replace').decode('ascii').replace('?', '_')
    return f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{quote(filename)}"


class OutgoingPaymentSerializer(serializers.ModelSerializer):
    account_id = serializers.PrimaryKeyRelatedField(
        source='account', queryset=Recipient.objects.all(), required=False, allow_null=True,
    )
    account_name = serializers.SerializerMethodField()
    request_invoices = serializers.SerializerMethodField()

    class Meta:
        model = OutgoingPayment
        fields = [
            'id', 'invoice', 'status', 'amount', 'supplier_name',
            'account_id', 'account_name', 'requests', 'request_invoices',
            'created_at',
        ]
        read_only_fields = ['id', 'requests', 'request_invoices', 'created_at']

    def get_account_name(self, obj):
        return obj.account.name if obj.account else None

    def get_request_invoices(self, obj):
        return [{'id': r.id, 'invoice': r.invoice} for r in obj.requests.all()]


class OutgoingPaymentDocumentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)
    url = serializers.SerializerMethodField()

    class Meta:
        model = OutgoingPaymentDocument
        fields = ['id', 'file', 'url', 'original_name', 'size', 'content_type', 'uploaded_at']
        read_only_fields = ['id', 'original_name', 'size', 'content_type', 'uploaded_at']

    def get_url(self, obj):
        if not obj.file:
            return None
        # Presigned-ссылка на чужой домен (S3) — HTML-атрибут download браузеры
        # для неё игнорируют, поэтому просим сам S3 отдать файл с заголовком
        # Content-Disposition: attachment, чтобы реально скачивался, а не открывался.
        return obj.file.storage.url(
            obj.file.name,
            parameters={'ResponseContentDisposition': content_disposition(obj.original_name)},
        )

    def create(self, validated_data):
        upload = validated_data.pop('file')
        return OutgoingPaymentDocument.objects.create(
            file=upload,
            original_name=upload.name,
            size=upload.size,
            content_type=upload.content_type or '',
            **validated_data,
        )
