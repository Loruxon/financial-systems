from django.contrib import admin
from admins.models import AdminUser


@admin.register(AdminUser)
class AdminUserAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'logto_id']
    search_fields = ['name', 'email', 'logto_id']
