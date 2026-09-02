from django.db import migrations, models
import django.contrib.postgres.fields


class Migration(migrations.Migration):

    dependencies = [
        ('requests', '0004_remove_excess_flags'),
    ]

    operations = [
        migrations.AlterField(model_name='request', name='counterparty_name', field=models.CharField(blank=True, max_length=255, verbose_name='Название контрагента')),
        migrations.AlterField(model_name='request', name='counterparty_address', field=models.CharField(blank=True, max_length=500, verbose_name='Адрес контрагента')),
        migrations.AlterField(model_name='request', name='bank_name', field=models.CharField(blank=True, max_length=255, verbose_name='Название банка')),
        migrations.AlterField(model_name='request', name='bank_address', field=models.CharField(blank=True, max_length=500, verbose_name='Адрес банка')),
        migrations.AlterField(model_name='request', name='bank_swift_code', field=models.CharField(blank=True, max_length=11, verbose_name='SWIFT')),
        migrations.AlterField(model_name='request', name='bank_account', field=models.CharField(blank=True, max_length=50, verbose_name='Номер счёта')),
        migrations.AlterField(model_name='request', name='bank_account_currencies', field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=3), blank=True, default=list, verbose_name='Валюты счёта', size=None)),
        migrations.AlterField(model_name='request', name='invoice', field=models.CharField(blank=True, max_length=255, verbose_name='Инвойс')),
        migrations.AlterField(model_name='request', name='amount', field=models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True, verbose_name='Сумма')),
        migrations.AlterField(model_name='request', name='currency', field=models.CharField(blank=True, max_length=3, verbose_name='Валюта')),
        migrations.AlterField(model_name='request', name='details', field=models.TextField(blank=True, verbose_name='Детали платежа')),
    ]
