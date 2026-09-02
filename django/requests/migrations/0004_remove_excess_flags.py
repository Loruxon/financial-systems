from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('requests', '0003_request_access_flags'),
    ]

    operations = [
        migrations.RemoveField(model_name='request', name='allow_edit'),
        migrations.RemoveField(model_name='request', name='allow_add_documents'),
        migrations.RemoveField(model_name='request', name='allow_gtd_upload'),
        migrations.RemoveField(model_name='request', name='show_payment_block'),
    ]
