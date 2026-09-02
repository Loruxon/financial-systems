from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0007_add_payer'),
    ]

    operations = [
        migrations.AddField(
            model_name='recipient',
            name='initial_balance',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=15, verbose_name='Входящий остаток, ₽'),
        ),
    ]
