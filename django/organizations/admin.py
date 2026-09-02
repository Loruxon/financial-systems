from django.contrib import admin
from organizations.models import Organization, Counterparty, Bank, BankAccount, Recipient, Payer


class BankAccountInline(admin.TabularInline):
    model = BankAccount
    extra = 0


class BankInline(admin.TabularInline):
    model = Bank
    extra = 0
    show_change_link = True


class CounterpartyInline(admin.TabularInline):
    model = Counterparty
    extra = 0
    show_change_link = True


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'logto_organization_id', 'percent_client', 'swift_client']
    inlines = [CounterpartyInline]


@admin.register(Counterparty)
class CounterpartyAdmin(admin.ModelAdmin):
    list_display = ['name', 'address', 'organization']
    list_filter = ['organization']
    inlines = [BankInline]


@admin.register(Bank)
class BankAdmin(admin.ModelAdmin):
    list_display = ['name', 'swift_code', 'bank_type', 'active', 'counterparty']
    list_filter = ['bank_type', 'active', 'counterparty__organization']
    inlines = [BankAccountInline]


@admin.register(Recipient)
class RecipientAdmin(admin.ModelAdmin):
    list_display = ['name', 'initial_balance']
    search_fields = ['name']


@admin.register(Payer)
class PayerAdmin(admin.ModelAdmin):
    list_display = ['name', 'inn', 'organization']
    list_filter = ['organization']
    search_fields = ['name', 'inn']
