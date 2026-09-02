from django.db import models


class ExchangeRate(models.Model):
    date = models.DateField(unique=True, verbose_name='Дата')
    usd = models.DecimalField(max_digits=10, decimal_places=4, verbose_name='Курс USD')
    eur = models.DecimalField(max_digits=10, decimal_places=4, verbose_name='Курс EUR')
    cny = models.DecimalField(max_digits=10, decimal_places=4, verbose_name='Курс CNY')

    class Meta:
        db_table = 'exchange_rates'
        ordering = ['-date']
        verbose_name = 'Курс валют'
        verbose_name_plural = 'Курсы валют'

    def __str__(self):
        return f'{self.date} | USD {self.usd} | EUR {self.eur} | CNY {self.cny}'
