from django.db import models

# Разделы админки, доступ к которым можно ограничивать по отдельности.
# Ключи должны совпадать с тем, что фронтенд ждёт в /api/me/ (admin_sections)
# и с секциями в react/src/components/app-sidebar.tsx.
SECTION_REQUESTS = 'requests'
SECTION_PAYMENT_CONFIRMATIONS = 'payment_confirmations'
SECTION_TRANSFERS = 'transfers'
SECTION_INCOMING_PAYMENTS = 'incoming_payments'
SECTION_OUTGOING_PAYMENTS = 'outgoing_payments'
SECTION_ORGANIZATION_BALANCES = 'organization_balances'

SECTION_CHOICES = [
    (SECTION_REQUESTS, 'Заявки'),
    (SECTION_PAYMENT_CONFIRMATIONS, 'Подтверждение поступлений'),
    (SECTION_TRANSFERS, 'Переводы'),
    (SECTION_INCOMING_PAYMENTS, 'Поступления'),
    (SECTION_OUTGOING_PAYMENTS, 'Исходящие платежи'),
    (SECTION_ORGANIZATION_BALANCES, 'Балансы организаций'),
]
ALL_SECTIONS = [key for key, _ in SECTION_CHOICES]


class AdminUser(models.Model):
    logto_id = models.CharField(max_length=255, unique=True, verbose_name='Logto ID')
    name = models.CharField(max_length=255, blank=True, verbose_name='Имя')
    email = models.EmailField(blank=True, verbose_name='Email')
    full_access = models.BooleanField(
        default=True,
        verbose_name='Полный доступ',
        help_text='Видит все разделы админки. Если выключено — только разделы ниже.',
    )
    allowed_sections = models.JSONField(
        default=list, blank=True, verbose_name='Доступные разделы',
        help_text='Учитывается только если выключен полный доступ.',
    )

    def visible_sections(self):
        return ALL_SECTIONS if self.full_access else [s for s in self.allowed_sections if s in ALL_SECTIONS]

    def __str__(self):
        return self.name or self.email or self.logto_id

    class Meta:
        db_table = 'admin_users'
        verbose_name = 'Администратор'
        verbose_name_plural = 'Администраторы'
