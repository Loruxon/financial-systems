from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('requests', '0005_nullable_draft_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='request',
            name='prf_received',
            field=models.BooleanField(default=False, verbose_name='Деньги поступили'),
        ),
    ]
