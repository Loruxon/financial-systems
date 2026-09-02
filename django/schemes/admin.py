from django.contrib import admin
from schemes.models import WorkScheme, SchemeCurrency


class SchemeCurrencyInline(admin.TabularInline):
    model = SchemeCurrency
    extra = 0
    min_num = 3
    max_num = 3


@admin.register(WorkScheme)
class WorkSchemeAdmin(admin.ModelAdmin):
    list_display = ['name', 'calculator']
    search_fields = ['name']
    inlines = [SchemeCurrencyInline]
