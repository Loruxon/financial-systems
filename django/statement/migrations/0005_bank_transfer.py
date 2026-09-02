from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0007_add_payer'),
        ('statement', '0004_receipt_net_amount'),
    ]

    operations = [
        migrations.CreateModel(
            name='BankTransfer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15, verbose_name='Сумма, ₽')),
                ('date', models.DateField(verbose_name='Дата')),
                ('note', models.CharField(blank=True, max_length=255, verbose_name='Примечание')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('from_recipient', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='outgoing_transfers',
                    to='organizations.recipient',
                    verbose_name='Откуда',
                )),
                ('to_recipient', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='incoming_transfers',
                    to='organizations.recipient',
                    verbose_name='Куда',
                )),
            ],
            options={
                'verbose_name': 'Перевод',
                'verbose_name_plural': 'Переводы',
                'db_table': 'bank_transfers',
                'ordering': ['-date', '-created_at'],
            },
        ),
    ]
