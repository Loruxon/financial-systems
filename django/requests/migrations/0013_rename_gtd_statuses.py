from django.db import migrations

OLD_TO_NEW = {
    'awaiting_gtd': 'awaiting_closing_docs',
    'gtd_review': 'closing_docs_review',
}


def rename_forward(apps, schema_editor):
    Request = apps.get_model('requests', 'Request')
    for old, new in OLD_TO_NEW.items():
        Request.objects.filter(status=old).update(status=new)


def rename_backward(apps, schema_editor):
    Request = apps.get_model('requests', 'Request')
    for old, new in OLD_TO_NEW.items():
        Request.objects.filter(status=new).update(status=old)


class Migration(migrations.Migration):

    dependencies = [
        ('requests', '0012_alter_request_status'),
    ]

    operations = [
        migrations.RunPython(rename_forward, rename_backward),
    ]
