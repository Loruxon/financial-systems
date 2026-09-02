from decimal import Decimal
from django.db import models
from django.utils import timezone
from organizations.models import Recipient, Payer


class Receipt(models.Model):
    NEW = 'new'
    CONFIRMED = 'confirmed'
    STATUS_CHOICES = [
        (NEW, 'Новое'),
        (CONFIRMED, 'Подтверждено'),
    ]

    date = models.DateField(verbose_name='Дата')
    amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Сумма, ₽')
    net_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Сумма −0.2%, ₽')
    recipient = models.ForeignKey(
        Recipient,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='receipts',
        verbose_name='Получатель',
    )
    payer = models.ForeignKey(
        Payer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='receipts',
        verbose_name='Плательщик',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=NEW, verbose_name='Статус')
    requests = models.ManyToManyField(
        'requests.Request',
        related_name='receipts',
        blank=True,
        verbose_name='Заявки',
    )
    confirmed_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата подтверждения')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    def save(self, *args, **kwargs):
        self.net_amount = (self.amount * Decimal('0.998')).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)

    def confirm(self):
        self.status = self.CONFIRMED
        self.confirmed_at = timezone.now()
        self.save()

    def unconfirm(self):
        self.status = self.NEW
        self.confirmed_at = None
        self.save()

    def __str__(self):
        return f'{self.date} — {self.amount} ₽'

    class Meta:
        db_table = 'receipts'
        verbose_name = 'Поступление'
        verbose_name_plural = 'Поступления'
        ordering = ['-date', '-created_at']


class BankTransfer(models.Model):
    from_recipient = models.ForeignKey(
        'organizations.Recipient',
        on_delete=models.PROTECT,
        related_name='outgoing_transfers',
        verbose_name='Откуда',
    )
    to_recipient = models.ForeignKey(
        'organizations.Recipient',
        on_delete=models.PROTECT,
        related_name='incoming_transfers',
        verbose_name='Куда',
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Сумма, ₽')
    date = models.DateField(verbose_name='Дата')
    note = models.CharField(max_length=255, blank=True, verbose_name='Примечание')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bank_transfers'
        verbose_name = 'Перевод'
        verbose_name_plural = 'Переводы'
        ordering = ['-date', '-created_at']
