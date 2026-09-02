from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('requests', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='request',
            name='show_payment_block',
            field=models.BooleanField(default=False, verbose_name='Показать блок оплаты'),
        ),
        migrations.AddField(
            model_name='request',
            name='show_swift_download',
            field=models.BooleanField(default=False, verbose_name='Показать скачать SWIFT'),
        ),
        migrations.AddField(
            model_name='request',
            name='show_paper_download',
            field=models.BooleanField(default=False, verbose_name='Показать скачать бумажку'),
        ),
        migrations.AddField(
            model_name='request',
            name='show_execution_block',
            field=models.BooleanField(default=False, verbose_name='Показать блок исполнения'),
        ),
    ]
