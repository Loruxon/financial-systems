from urllib.parse import quote
from django.utils import timezone
from rest_framework import serializers
from requests.models import Request, Document
from requests.calculators import get_calculator, get_sebes_calculator
from organizations.models import Counterparty, Bank, BankAccount
from rates.views import get_usd_rate_for_date, get_nbk_rate_for_date
from statement.models import Receipt

# Статусы, в которых деньги уже точно поступили плательщику в РФ.
MONEY_RECEIVED_STATUSES = {Request.AWAITING_CLOSING_DOCS, Request.CLOSING_DOCS_REVIEW, Request.CLOSED}


def get_org_receipt(receipt_id, org):
    """Подтверждённое поступление организации по id, либо ValidationError."""
    try:
        return Receipt.objects.select_related('payer', 'recipient').get(
            pk=receipt_id, payer__organization=org, status=Receipt.CONFIRMED,
        )
    except Receipt.DoesNotExist:
        raise serializers.ValidationError({'receipt_id': 'Поступление не найдено'})


def prf_snapshot_from_receipt(receipt):
    """Снимок «Плательщик в РФ» из поступления — организация, ИНН, дата, получатель."""
    return {
        'prf_organization': receipt.payer.name if receipt.payer else '',
        'prf_inn': receipt.payer.inn if receipt.payer else '',
        'prf_date': receipt.date,
        'prf_recipient': receipt.recipient.name if receipt.recipient else '',
    }


def content_disposition(filename):
    """attachment с именем файла — с ASCII-заменителем для старых клиентов и
    RFC 5987 filename* для нормального отображения кириллицы/юникода."""
    ascii_fallback = filename.encode('ascii', 'replace').decode('ascii').replace('?', '_')
    return f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{quote(filename)}"


class AttachmentFileField(serializers.FileField):
    """FileField, отдающий ссылку с Content-Disposition: attachment — presigned-ссылка
    ведёт на чужой домен (S3), а HTML-атрибут download браузеры для cross-origin
    ссылок игнорируют, так что без этого файл открывался бы, а не скачивался."""

    def to_representation(self, value):
        if not value:
            return None
        filename = value.name.rsplit('/', 1)[-1]
        return value.storage.url(
            value.name,
            parameters={'ResponseContentDisposition': content_disposition(filename)},
        )


class RequestListSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    organization_id = serializers.IntegerField(source='organization.id', read_only=True)

    class Meta:
        model = Request
        fields = [
            'id', 'invoice', 'amount', 'currency', 'status', 'created_at',
            'counterparty_name', 'bank_name',
            'execution_costs', 'execution_balance',
            'organization_name', 'organization_id', 'prf_amount',
        ]


class RequestSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    organization_percent_client = serializers.DecimalField(source='organization.percent_client', max_digits=5, decimal_places=2, read_only=True)
    organization_swift_client = serializers.DecimalField(source='organization.swift_client', max_digits=10, decimal_places=2, read_only=True)
    organization_calculator = serializers.CharField(source='organization.get_calculator_display', read_only=True)
    counterparty_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    bank_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    bank_account_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    receipt_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    linked_receipt = serializers.SerializerMethodField()
    swift_document = AttachmentFileField(read_only=True)
    paper_document = AttachmentFileField(read_only=True)

    def get_linked_receipt(self, obj):
        receipt = obj.receipts.first()
        if not receipt:
            return None
        return {
            'id': receipt.id,
            'date': receipt.date.isoformat(),
            'amount': str(receipt.amount),
            'net_amount': str(receipt.net_amount) if receipt.net_amount is not None else None,
        }

    class Meta:
        model = Request
        fields = '__all__'
        read_only_fields = [
            'id', 'organization', 'created_at',
            'counterparty_name', 'counterparty_address',
            'bank_name', 'bank_address', 'bank_swift_code',
            'bank_account', 'bank_account_currencies',
            'execution_costs', 'execution_balance',
            'execution_costs_sebes', 'execution_profit_sebes', 'sebes_min_fee_applied',
            'organization_name', 'organization_percent_client', 'organization_swift_client',
            'organization_calculator',
            'assigned_admin', 'work_scheme', 'admin_note',
            'edit_payment', 'edit_prf', 'edit_documents', 'edit_closing_docs',
            'money_received', 'money_received_at', 'linked_receipt',
        ]

    def update(self, instance, validated_data):
        counterparty_id = validated_data.pop('counterparty_id', None)
        bank_id = validated_data.pop('bank_id', None)
        bank_account_id = validated_data.pop('bank_account_id', None)
        # Отличаем "поле не прислали" (ничего не трогаем) от "прислали null"
        # (явно отвязать поступление) — обычный .pop(..., None) их не различает.
        receipt_id_provided = 'receipt_id' in validated_data
        receipt_id = validated_data.pop('receipt_id', None)

        new_status = validated_data.get('status')
        if new_status in MONEY_RECEIVED_STATUSES and not instance.money_received:
            validated_data['money_received'] = True
            validated_data['money_received_at'] = timezone.now()

        # Замена или очистка файла — сперва удаляем старый объект из S3,
        # чтобы при перезаливе/удалении не оставались "осиротевшие" файлы.
        for field in ('swift_document', 'paper_document'):
            if field in validated_data:
                old_file = getattr(instance, field)
                if old_file:
                    old_file.delete(save=False)

        if counterparty_id is not None:
            try:
                cp = Counterparty.objects.get(pk=counterparty_id, organization=instance.organization)
            except Counterparty.DoesNotExist:
                raise serializers.ValidationError({'counterparty_id': 'Контрагент не найден в вашей организации'})
            instance.counterparty = cp
            instance.counterparty_name = cp.name
            instance.counterparty_address = cp.address

        if bank_id is not None:
            try:
                bank = Bank.objects.get(pk=bank_id, counterparty__organization=instance.organization)
            except Bank.DoesNotExist:
                raise serializers.ValidationError({'bank_id': 'Банк не найден в вашей организации'})
            instance.bank = bank
            instance.bank_name = bank.name
            instance.bank_address = bank.address
            instance.bank_swift_code = bank.swift_code

        if bank_account_id is not None:
            bank_account = BankAccount.objects.get(pk=bank_account_id)
            instance.bank_account = bank_account.account
            instance.bank_account_currencies = bank_account.currencies

        # Клиент сам выбрал поступление в блоке "Плательщик в РФ" — привязываем
        # заявку к нему и подтягиваем снимок плательщика/получателя из него же,
        # чтобы данные не разъезжались с тем, что реально пришло на счёт.
        if receipt_id_provided:
            if receipt_id is None:
                instance.receipts.clear()
            else:
                receipt = get_org_receipt(receipt_id, instance.organization)
                instance.receipts.set([receipt])
                validated_data.update(prf_snapshot_from_receipt(receipt))

        if 'execution_rate' in validated_data and validated_data['execution_rate'] is not None:
            org = instance.organization
            rate = validated_data['execution_rate']
            amount = validated_data.get('amount', instance.amount)
            prf_amount = validated_data.get('prf_amount', instance.prf_amount)
            currency = validated_data.get('currency', instance.currency)
            usd_rate = None
            if currency == 'CNY':
                exec_date = validated_data.get('execution_date', instance.execution_date)
                usd_rate = get_usd_rate_for_date(exec_date) if exec_date else None
                if usd_rate is None:
                    raise serializers.ValidationError({
                        'execution_rate': 'Не удалось получить курс USD на дату исполнения для пересчёта SWIFT (CNY)'
                    })
            calculator = get_calculator(org.calculator)
            result = calculator(amount, rate, org, prf_amount, currency, usd_rate)
            for field, value in result.items():
                if value is not None:
                    validated_data[field] = value

        if 'execution_rate_sebes' in validated_data and validated_data['execution_rate_sebes'] is not None:
            balance = validated_data.get('execution_balance', instance.execution_balance)
            costs = validated_data.get('execution_costs', instance.execution_costs)
            if balance is None or costs is None:
                raise serializers.ValidationError({
                    'execution_rate_sebes': 'Необходимо сначала выполнить клиентский расчёт'
                })
            currency = validated_data.get('currency', instance.currency)
            scheme_currency = (
                instance.work_scheme.currencies.filter(currency=currency).first()
                if instance.work_scheme else None
            )
            if scheme_currency is None:
                raise serializers.ValidationError({
                    'execution_rate_sebes': f'Нужно закрепить за заявкой схему работы с валютой {currency}'
                })
            rate_sebes = validated_data['execution_rate_sebes']
            amount = validated_data.get('amount', instance.amount)
            prf_amount = validated_data.get('prf_amount', instance.prf_amount)
            sebes_calculator = get_sebes_calculator(instance.work_scheme.calculator)
            exec_date_sebes = validated_data.get('execution_date_sebes', instance.execution_date_sebes)
            usd_rate = None
            if currency == 'CNY' and instance.work_scheme.calculator == 'calc_sebes_mongols':
                usd_rate = get_usd_rate_for_date(exec_date_sebes) if exec_date_sebes else None
                if usd_rate is None:
                    raise serializers.ValidationError({
                        'execution_rate_sebes': 'Не удалось получить курс USD на дату исполнения для пересчёта SWIFT (CNY)'
                    })
            kzt_rate = None
            if instance.work_scheme.calculator == 'calc_sebes_alsafi' and currency in ('EUR', 'CNY'):
                kzt_rate = get_nbk_rate_for_date(currency, exec_date_sebes) if exec_date_sebes else None
                if kzt_rate is None:
                    raise serializers.ValidationError({
                        'execution_rate_sebes': f'Не удалось получить курс НБ РК ({currency}) на дату исполнения'
                    })
            result = sebes_calculator(
                amount, rate_sebes, scheme_currency.percent, scheme_currency.swift,
                prf_amount, balance, costs, currency, usd_rate, kzt_rate,
            )
            # Пишем явно (даже None) — иначе при смене схемы с Альсафи на другую
            # здесь остался бы устаревший True/False от прошлого расчёта.
            validated_data['sebes_min_fee_applied'] = result.pop('sebes_min_fee_applied', None)
            for field, value in result.items():
                if value is not None:
                    validated_data[field] = value

        return super().update(instance, validated_data)


class RequestDraftSerializer(serializers.Serializer):
    def create(self, validated_data):
        return Request.objects.create(
            organization=validated_data['organization'],
            status=Request.DRAFT,
        )


class RequestSubmitSerializer(serializers.Serializer):
    counterparty_id = serializers.IntegerField()
    bank_id = serializers.IntegerField()
    bank_account_id = serializers.IntegerField()
    invoice = serializers.CharField(max_length=255)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    currency = serializers.CharField(max_length=3)
    details = serializers.CharField()
    prf_organization = serializers.CharField(max_length=255, required=False, allow_blank=True)
    prf_inn = serializers.CharField(max_length=12, required=False, allow_blank=True)
    prf_amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    prf_date = serializers.DateField(required=False, allow_null=True)
    prf_recipient = serializers.CharField(max_length=255, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=Request.STATUS_CHOICES, required=False, default=Request.NEW)
    receipt_id = serializers.IntegerField(required=False, allow_null=True)

    def create(self, validated_data):
        org = validated_data.pop('organization')
        counterparty = Counterparty.objects.get(pk=validated_data.pop('counterparty_id'), organization=org)
        bank = Bank.objects.get(pk=validated_data.pop('bank_id'), counterparty__organization=org)
        bank_account = BankAccount.objects.get(pk=validated_data.pop('bank_account_id'), bank=bank)

        receipt_id = validated_data.pop('receipt_id', None)
        receipt = get_org_receipt(receipt_id, org) if receipt_id is not None else None
        if receipt is not None:
            validated_data.update(prf_snapshot_from_receipt(receipt))

        instance = Request.objects.create(
            organization=org,
            counterparty=counterparty,
            bank=bank,
            counterparty_name=counterparty.name,
            counterparty_address=counterparty.address,
            bank_name=bank.name,
            bank_address=bank.address,
            bank_swift_code=bank.swift_code,
            bank_account=bank_account.account,
            bank_account_currencies=bank_account.currencies,
            **validated_data,
        )
        if receipt is not None:
            instance.receipts.set([receipt])
        return instance


class DocumentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)
    url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'section', 'file', 'url', 'original_name', 'size',
            'content_type', 'doc_type', 'uploaded_by_admin', 'uploaded_at',
        ]
        read_only_fields = [
            'id', 'original_name', 'size', 'content_type',
            'uploaded_by_admin', 'uploaded_at', 'doc_type',
        ]

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
        return Document.objects.create(
            file=upload,
            original_name=upload.name,
            size=upload.size,
            content_type=upload.content_type or '',
            **validated_data,
        )
