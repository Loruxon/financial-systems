from django.db import models
from django.contrib.postgres.fields import ArrayField
from requests.calculators import CALCULATOR_CHOICES


class Organization(models.Model):
    logto_organization_id = models.CharField(max_length=255, unique=True, verbose_name='Организация (Logto ID)')
    name = models.CharField(max_length=255, verbose_name='Название организации')
    percent_client = models.DecimalField(max_digits=5, decimal_places=2, default=3.00, verbose_name='Процент клиента (%)')
    swift_client = models.DecimalField(max_digits=10, decimal_places=2, default=100.00, verbose_name='SWIFT клиента')
    calculator = models.CharField(max_length=50, choices=CALCULATOR_CHOICES, default='calc_1', verbose_name='Калькулятор')

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'organizations'
        verbose_name = 'Организация'
        verbose_name_plural = 'Организации'


class Counterparty(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='counterparties',
        verbose_name='Организация'
    )
    name = models.CharField(max_length=255, verbose_name='Название')
    address = models.CharField(max_length=500, verbose_name='Адрес')

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'counterparties'
        verbose_name = 'Контрагент'
        verbose_name_plural = 'Контрагенты'


class Bank(models.Model):
    MONO = 'mono'
    MULTI = 'multi'
    TYPE_CHOICES = [(MONO, 'Моновалютный'), (MULTI, 'Мультивалютный')]

    counterparty = models.ForeignKey(
        Counterparty,
        on_delete=models.CASCADE,
        related_name='banks',
        verbose_name='Контрагент'
    )
    name = models.CharField(max_length=255, verbose_name='Название')
    address = models.CharField(max_length=500, verbose_name='Адрес')
    swift_code = models.CharField(max_length=11, verbose_name='SWIFT')
    bank_type = models.CharField(max_length=5, choices=TYPE_CHOICES, default=MONO, verbose_name='Тип')
    active = models.BooleanField(default=True, verbose_name='Активен')

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'banks'
        verbose_name = 'Банк'
        verbose_name_plural = 'Банки'


class Recipient(models.Model):
    name = models.CharField(max_length=255, verbose_name='Название')
    initial_balance = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        verbose_name='Входящий остаток, ₽',
    )

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'recipients'
        verbose_name = 'Получатель'
        verbose_name_plural = 'Получатели'
        ordering = ['name']


class Payer(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='payers',
        verbose_name='Организация',
    )
    name = models.CharField(max_length=255, verbose_name='Название')
    inn = models.CharField(max_length=12, verbose_name='ИНН')

    def __str__(self):
        return f'{self.name} ({self.inn})'

    class Meta:
        db_table = 'payers'
        verbose_name = 'Плательщик'
        verbose_name_plural = 'Плательщики'
        ordering = ['name']


class BankAccount(models.Model):
    bank = models.ForeignKey(
        Bank,
        on_delete=models.CASCADE,
        related_name='accounts',
        verbose_name='Банк'
    )
    account = models.CharField(max_length=50, verbose_name='Номер счёта')
    currencies = ArrayField(models.CharField(max_length=3), verbose_name='Валюты')

    def __str__(self):
        return self.account

    class Meta:
        db_table = 'bank_accounts'
        verbose_name = 'Счёт'
        verbose_name_plural = 'Счета'
