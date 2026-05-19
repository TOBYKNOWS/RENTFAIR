from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0016_property_whatsapp_click_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='property',
            name='verification_document_url',
            field=models.URLField(blank=True),
        ),
    ]
