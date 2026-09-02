from django.contrib import admin
from outgoing_payments.models import OutgoingPayment, OutgoingPaymentDocument


class OutgoingPaymentDocumentInline(admin.TabularInline):
    model = OutgoingPaymentDocument
    extra = 0


@admin.register(OutgoingPayment)
class OutgoingPaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'supplier_name', 'amount', 'account', 'status', 'created_at']
    list_filter = ['status', 'account']
    search_fields = ['invoice', 'supplier_name']
    inlines = [OutgoingPaymentDocumentInline]
