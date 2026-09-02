from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='AdminUser',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('logto_id', models.CharField(max_length=255, unique=True, verbose_name='Logto ID')),
                ('name', models.CharField(blank=True, max_length=255, verbose_name='Имя')),
                ('email', models.EmailField(blank=True, verbose_name='Email')),
            ],
            options={
                'verbose_name': 'Администратор',
                'verbose_name_plural': 'Администраторы',
                'db_table': 'admin_users',
            },
        ),
    ]
