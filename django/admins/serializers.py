from rest_framework import serializers
from admins.models import AdminUser
from requests.models import Request
from requests.serializers import RequestSerializer, DocumentSerializer, AttachmentFileField
from organizations.models import Payer
from schemes.models import WorkScheme, SchemeCurrency


class AdminPayerSerializer(serializers.ModelSerializer):
    organization_id = serializers.IntegerField(source='organization.id', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Payer
        fields = ['id', 'name', 'inn', 'organization_id', 'organization_name']


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminUser
        fields = ['id', 'name', 'email']


class SchemeCurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = SchemeCurrency
        fields = ['currency', 'percent', 'swift']


class WorkSchemeSerializer(serializers.ModelSerializer):
    currencies = SchemeCurrencySerializer(many=True, read_only=True)

    class Meta:
        model = WorkScheme
        fields = ['id', 'name', 'calculator', 'currencies']


class AdminRequestListSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    organization_id = serializers.IntegerField(source='organization.id', read_only=True)
    assigned_admin = AdminUserSerializer(read_only=True)
    work_scheme_name = serializers.SerializerMethodField()

    class Meta:
        model = Request
        fields = [
            'id', 'invoice', 'amount', 'currency', 'status', 'created_at',
            'counterparty_name', 'bank_name',
            'execution_costs', 'execution_balance', 'execution_profit_sebes',
            'organization_name', 'organization_id', 'prf_amount',
            'assigned_admin', 'work_scheme_name',
        ]

    def get_work_scheme_name(self, obj):
        return obj.work_scheme.name if obj.work_scheme else None



# Поля, которые организация видит только для чтения, а администратор может
# менять — доступны для записи исключительно через AdminRequestSerializer.
# (swift_document/paper_document сюда не входят — они управляются отдельными
# явными полями ниже, т.к. их представление на чтение отличается от записи.)
ADMIN_ONLY_WRITABLE_FIELDS = {
    'admin_note',
    'edit_payment', 'edit_prf', 'edit_documents', 'edit_closing_docs',
}


class AdminRequestSerializer(RequestSerializer):
    assigned_admin = AdminUserSerializer(read_only=True)
    work_scheme = WorkSchemeSerializer(read_only=True)
    swift_document = AttachmentFileField(required=False, allow_null=True)
    paper_document = AttachmentFileField(required=False, allow_null=True)

    class Meta(RequestSerializer.Meta):
        read_only_fields = [
            f for f in RequestSerializer.Meta.read_only_fields
            if f not in ADMIN_ONLY_WRITABLE_FIELDS
        ]


class AdminDocumentSerializer(DocumentSerializer):
    class Meta(DocumentSerializer.Meta):
        read_only_fields = [f for f in DocumentSerializer.Meta.read_only_fields if f != 'doc_type']
