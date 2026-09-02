from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('requests', '0002_request_visibility_flags'),
    ]

    operations = [
        migrations.AddField(
            model_name='request',
            name='allow_edit',
            field=models.BooleanField(default=False, verbose_name='Разрешить редактирование'),
        ),
        migrations.AddField(
            model_name='request',
            name='allow_add_documents',
            field=models.BooleanField(default=False, verbose_name='Разрешить добавление документов'),
        ),
        migrations.AddField(
            model_name='request',
            name='allow_gtd_upload',
            field=models.BooleanField(default=False, verbose_name='Разрешить загрузку ГТД'),
        ),
    ]
