from django.contrib import admin
from statement.models import Receipt, BankTransfer


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ['date', 'amount', 'recipient', 'payer', 'status', 'confirmed_at']
    list_filter = ['status', 'recipient', 'payer__organization']
    search_fields = ['recipient__name', 'payer__name', 'payer__organization__name']
    date_hierarchy = 'date'
    ordering = ['-date']


@admin.register(BankTransfer)
class BankTransferAdmin(admin.ModelAdmin):
    list_display = ['date', 'from_recipient', 'to_recipient', 'amount', 'note', 'created_at']
    list_filter = ['from_recipient', 'to_recipient']
    search_fields = ['from_recipient__name', 'to_recipient__name', 'note']
    date_hierarchy = 'date'
    ordering = ['-date']
