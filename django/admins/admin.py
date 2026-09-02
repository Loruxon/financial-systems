from django import forms
from django.contrib import admin
from admins.models import AdminUser, SECTION_CHOICES


class AdminUserForm(forms.ModelForm):
    allowed_sections = forms.MultipleChoiceField(
        choices=SECTION_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        required=False,
        label='Доступные разделы',
        help_text='Учитывается только если выключен полный доступ.',
    )

    class Meta:
        model = AdminUser
        fields = ['name', 'email', 'logto_id', 'full_access', 'allowed_sections']


@admin.register(AdminUser)
class AdminUserAdmin(admin.ModelAdmin):
    form = AdminUserForm
    list_display = ['name', 'email', 'logto_id', 'full_access']
    list_filter = ['full_access']
    search_fields = ['name', 'email', 'logto_id']
