from django.db import models
from requests.calculators import SEBES_CALCULATOR_CHOICES


class WorkScheme(models.Model):
    name = models.CharField(max_length=255, unique=True, verbose_name='Название схемы')
    calculator = models.CharField(
        max_length=50, choices=SEBES_CALCULATOR_CHOICES, default='calc_sebes_mongols',
        verbose_name='Калькулятор себестоимости',
    )

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'work_schemes'
        verbose_name = 'Схема работы'
        verbose_name_plural = 'Схемы работы'
        ordering = ['name']


class SchemeCurrency(models.Model):
    EUR = 'EUR'
    USD = 'USD'
    CNY = 'CNY'
    CURRENCY_CHOICES = [(EUR, 'EUR'), (USD, 'USD'), (CNY, 'CNY')]

    scheme = models.ForeignKey(
        WorkScheme,
        on_delete=models.CASCADE,
        related_name='currencies',
        verbose_name='Схема',
    )
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, verbose_name='Валюта')
    percent = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='Процент (%)')
    swift = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='SWIFT')

    def __str__(self):
        return f'{self.scheme.name} | {self.currency}'

    class Meta:
        db_table = 'scheme_currencies'
        verbose_name = 'Валюта схемы'
        verbose_name_plural = 'Валюты схемы'
        constraints = [
            models.UniqueConstraint(fields=['scheme', 'currency'], name='unique_scheme_currency'),
        ]
        ordering = ['scheme', 'currency']
