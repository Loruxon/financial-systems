from django.contrib import admin
from rates.models import ExchangeRate


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ['date', 'usd', 'eur', 'cny']
    ordering = ['-date']
