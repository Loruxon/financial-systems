from django.contrib import admin
from requests.models import Request, Document


class DocumentInline(admin.TabularInline):
    model = Document
    extra = 0
    fields = ['file', 'original_name', 'section', 'doc_type', 'size', 'uploaded_by_admin', 'uploaded_at']
    readonly_fields = ['original_name', 'size', 'uploaded_at']


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'status', 'counterparty_name', 'bank_name', 'amount', 'currency', 'created_at']
    list_filter = ['status', 'currency', 'organization']
    readonly_fields = [
        'organization', 'counterparty', 'bank', 'created_at',
        'counterparty_name', 'counterparty_address',
        'bank_name', 'bank_address', 'bank_swift_code',
        'bank_account', 'bank_account_currencies',
    ]
    inlines = [DocumentInline]


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['original_name', 'request', 'section', 'doc_type', 'uploaded_by_admin', 'uploaded_at']
    list_filter = ['section', 'doc_type', 'uploaded_by_admin']
    readonly_fields = ['request', 'file', 'original_name', 'size', 'content_type', 'uploaded_at']
