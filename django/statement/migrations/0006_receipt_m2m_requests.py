from django.db import migrations, models


def migrate_request_data(apps, schema_editor):
    Receipt = apps.get_model('statement', 'Receipt')
    for receipt in Receipt.objects.filter(request__isnull=False).select_related('request'):
        receipt.requests.add(receipt.request)


class Migration(migrations.Migration):

    dependencies = [
        ('requests', '0011_alter_request_status'),
        ('statement', '0005_bank_transfer'),
    ]

    operations = [
        migrations.AddField(
            model_name='receipt',
            name='requests',
            field=models.ManyToManyField(
                blank=True,
                related_name='receipts_m2m',
                to='requests.request',
                verbose_name='Заявки',
            ),
        ),
        migrations.RunPython(migrate_request_data, migrations.RunPython.noop),
        migrations.RemoveField(model_name='receipt', name='request'),
        migrations.RemoveField(model_name='receipt', name='counterparty'),
        migrations.AlterField(
            model_name='receipt',
            name='requests',
            field=models.ManyToManyField(
                blank=True,
                related_name='receipts',
                to='requests.request',
                verbose_name='Заявки',
            ),
        ),
    ]
