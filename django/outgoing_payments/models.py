from django.db import models
from organizations.models import Recipient


def outgoing_payment_document_path(instance, filename):
    return f'outgoing-payments/{instance.outgoing_payment_id}/{filename}'


class OutgoingPayment(models.Model):
    NEW = 'new'
    IN_WORK = 'in_work'
    IN_PROGRESS = 'in_progress'
    EXECUTED = 'executed'
    STATUS_CHOICES = [
        (NEW, 'Новый'),
        (IN_WORK, 'В работе'),
        (IN_PROGRESS, 'На исполнении'),
        (EXECUTED, 'Исполнен'),
    ]

    invoice = models.CharField(max_length=255, blank=True, verbose_name='Инвойс')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=NEW, verbose_name='Статус')
    amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Сумма, ₽')
    supplier_name = models.CharField(max_length=255, blank=True, verbose_name='Наименование поставщика')
    account = models.ForeignKey(
        Recipient,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outgoing_payments',
        verbose_name='Счёт списания',
    )
    requests = models.ManyToManyField(
        'requests.Request',
        related_name='outgoing_payments',
        blank=True,
        verbose_name='Заявки',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    def __str__(self):
        return self.invoice or f'Исходящий платёж #{self.pk}'

    class Meta:
        db_table = 'outgoing_payments'
        verbose_name = 'Исходящий платёж'
        verbose_name_plural = 'Исходящие платежи'
        ordering = ['-created_at']


class OutgoingPaymentDocument(models.Model):
    outgoing_payment = models.ForeignKey(
        OutgoingPayment,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name='Платёж',
    )
    file = models.FileField(upload_to=outgoing_payment_document_path, verbose_name='Файл')
    original_name = models.CharField(max_length=255, verbose_name='Исходное имя файла')
    size = models.PositiveIntegerField(verbose_name='Размер, байт')
    content_type = models.CharField(max_length=100, blank=True, verbose_name='MIME-тип')
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата загрузки')

    def __str__(self):
        return self.original_name

    class Meta:
        db_table = 'outgoing_payment_documents'
        verbose_name = 'Документ исходящего платежа'
        verbose_name_plural = 'Документы исходящих платежей'
        ordering = ['-uploaded_at']
