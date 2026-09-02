from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('admins', '0001_initial'),
        ('requests', '0008_add_sebes_rate_date_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='request',
            name='assigned_admin',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='assigned_requests',
                to='admins.adminuser',
                verbose_name='Исполнитель',
            ),
        ),
    ]
