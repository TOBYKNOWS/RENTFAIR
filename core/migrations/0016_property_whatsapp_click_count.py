from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0015_property_review_note'),
    ]

    operations = [
        migrations.AddField(
            model_name='property',
            name='whatsapp_click_count',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
