from django.db import models
from django.contrib.postgres.fields import ArrayField
from organizations.models import Organization, Counterparty, Bank


def swift_document_path(instance, filename):
    return f'requests/{instance.pk}/swift/{filename}'


def paper_document_path(instance, filename):
    return f'requests/{instance.pk}/paper/{filename}'


class Request(models.Model):
    DRAFT = 'draft'
    NEW = 'new'
    IN_REVIEW = 'in_review'
    SENT_TO_BANK = 'sent_to_bank'
    AWAITING_CLOSING_DOCS = 'awaiting_closing_docs'
    CLOSING_DOCS_REVIEW = 'closing_docs_review'
    CLOSED = 'closed'
    CORRECTION = 'correction'
    CORRECTION_REVIEW = 'correction_review'

    STATUS_CHOICES = [
        (DRAFT, 'Черновик'),
        (NEW, 'Новая'),
        (IN_REVIEW, 'На проверке'),
        (SENT_TO_BANK, 'Отправлена в банк'),
        (AWAITING_CLOSING_DOCS, 'Ожидание закрывающих документов'),
        (CLOSING_DOCS_REVIEW, 'Проверка закрывающих документов'),
        (CLOSED, 'Закрыта'),
        (CORRECTION, 'Исправление'),
        (CORRECTION_REVIEW, 'Проверка исправлений'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='requests',
        verbose_name='Организация'
    )
    counterparty = models.ForeignKey(
        Counterparty,
        on_delete=models.SET_NULL,
        null=True,
        related_name='requests',
        verbose_name='Контрагент'
    )
    bank = models.ForeignKey(
        Bank,
        on_delete=models.SET_NULL,
        null=True,
        related_name='requests',
        verbose_name='Банк'
    )

    # Снимок: Контрагент
    counterparty_name = models.CharField(max_length=255, blank=True, verbose_name='Название контрагента')
    counterparty_address = models.CharField(max_length=500, blank=True, verbose_name='Адрес контрагента')

    # Снимок: Банк
    bank_name = models.CharField(max_length=255, blank=True, verbose_name='Название банка')
    bank_address = models.CharField(max_length=500, blank=True, verbose_name='Адрес банка')
    bank_swift_code = models.CharField(max_length=11, blank=True, verbose_name='SWIFT')
    bank_account = models.CharField(max_length=50, blank=True, verbose_name='Номер счёта')
    bank_account_currencies = ArrayField(models.CharField(max_length=3), default=list, blank=True, verbose_name='Валюты счёта')

    # Платёж
    invoice = models.CharField(max_length=255, blank=True, verbose_name='Инвойс')
    amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Сумма')
    currency = models.CharField(max_length=3, blank=True, verbose_name='Валюта')
    details = models.TextField(blank=True, verbose_name='Детали платежа')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=DRAFT, verbose_name='Статус')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    # Плательщик в РФ
    prf_organization = models.CharField(max_length=255, blank=True, verbose_name='Организация в РФ')
    prf_inn = models.CharField(max_length=12, blank=True, verbose_name='ИНН')
    prf_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Сумма в руб.')
    prf_date = models.DateField(null=True, blank=True, verbose_name='Дата')
    prf_recipient = models.CharField(max_length=255, blank=True, verbose_name='Получатель')
    # Исполнение
    execution_date = models.DateField(null=True, blank=True, verbose_name='Дата исполнения')
    execution_rate = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, verbose_name='Курс')
    execution_costs = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Затраты')
    execution_balance = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Остаток')
    execution_date_sebes = models.DateField(null=True, blank=True, verbose_name='Дата исполнения (себест.)')
    execution_rate_sebes = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, verbose_name='Курс (себест.)')
    execution_costs_sebes = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Затраты себестоимости')
    execution_profit_sebes = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Прибыль')
    # Заполняется только калькулятором calc_sebes_alsafi: сработал ли минимальный
    # порог комиссии в KZT вместо процента. Для остальных калькуляторов — null.
    sebes_min_fee_applied = models.BooleanField(null=True, blank=True, default=None, verbose_name='Применён минимум комиссии (Альсафи)')

    # Видимость блоков для клиента (управляется вручную админом)
    show_swift_download = models.BooleanField(default=False, verbose_name='Показать скачать SWIFT')
    show_paper_download = models.BooleanField(default=False, verbose_name='Показать ордер на заявку')
    show_execution_block = models.BooleanField(default=False, verbose_name='Показать блок исполнения')

    # Файлы, которые загружает администратор — по одному на заявку, перезалив заменяет предыдущий
    swift_document = models.FileField(upload_to=swift_document_path, null=True, blank=True, verbose_name='SWIFT документ')
    paper_document = models.FileField(upload_to=paper_document_path, null=True, blank=True, verbose_name='Ордер на заявку')

    assigned_admin = models.ForeignKey(
        'admins.AdminUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_requests',
        verbose_name='Исполнитель',
    )

    work_scheme = models.ForeignKey(
        'schemes.WorkScheme',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requests',
        verbose_name='Схема работы',
    )

    # Заметка администратора — виден организации в режиме только чтения
    admin_note = models.TextField(blank=True, default='', verbose_name='Заметка администратора')

    # Какие блоки организация может редактировать в статусе "Исправление"
    edit_payment = models.BooleanField(default=False, verbose_name='Разрешено редактировать платёж')
    edit_prf = models.BooleanField(default=False, verbose_name='Разрешено редактировать плательщика в РФ')
    edit_documents = models.BooleanField(default=False, verbose_name='Разрешено редактировать документы')
    edit_closing_docs = models.BooleanField(default=False, verbose_name='Разрешено редактировать закрывающие документы')

    # Деньги поступили плательщику в РФ — фиксируется автоматически при переходе
    # в статус "Ожидание закрывающих документов" (или позже), не сбрасывается назад.
    # money_received_at — это момент, когда это отметили в системе, а не момент
    # фактического поступления денег (который системе неизвестен).
    money_received = models.BooleanField(default=False, verbose_name='Деньги пришли')
    money_received_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата отметки о поступлении денег')

    def __str__(self):
        return f'{self.invoice} ({self.get_status_display()})'

    class Meta:
        db_table = 'requests'
        verbose_name = 'Заявка'
        verbose_name_plural = 'Заявки'
        ordering = ['-created_at']


def document_path(instance, filename):
    return f'requests/{instance.request_id}/{instance.section}/{filename}'


class Document(models.Model):
    SECTION_PAYMENT = 'payment'
    SECTION_CLOSING = 'closing'
    SECTION_CHOICES = [
        (SECTION_PAYMENT, 'Документы'),
        (SECTION_CLOSING, 'Закрывающие документы'),
    ]

    TYPE_INVOICE = 'invoice'
    TYPE_REQUEST = 'request'
    TYPE_GTD = 'gtd'
    TYPE_TRANSPORT = 'transport'
    TYPE_OTHER = 'other'
    DOC_TYPE_CHOICES = [
        (TYPE_INVOICE, 'Инвойс'),
        (TYPE_REQUEST, 'Заявка'),
        (TYPE_GTD, 'ГТД'),
        (TYPE_TRANSPORT, 'Транспортные'),
        (TYPE_OTHER, 'Другое'),
    ]

    request = models.ForeignKey(
        Request,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name='Заявка',
    )
    section = models.CharField(max_length=10, choices=SECTION_CHOICES, verbose_name='Блок')
    file = models.FileField(upload_to=document_path, verbose_name='Файл')
    original_name = models.CharField(max_length=255, verbose_name='Исходное имя файла')
    size = models.PositiveIntegerField(verbose_name='Размер, байт')
    content_type = models.CharField(max_length=100, blank=True, verbose_name='MIME-тип')
    doc_type = models.CharField(max_length=20, choices=DOC_TYPE_CHOICES, default=TYPE_OTHER, verbose_name='Тип документа')
    uploaded_by_admin = models.BooleanField(default=False, verbose_name='Загружено администратором')
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата загрузки')

    def __str__(self):
        return self.original_name

    class Meta:
        db_table = 'documents'
        verbose_name = 'Документ'
        verbose_name_plural = 'Документы'
        ordering = ['-uploaded_at']
