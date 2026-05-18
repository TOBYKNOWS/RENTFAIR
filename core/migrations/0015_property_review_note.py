from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0014_emailverificationtoken'),
    ]

    operations = [
        migrations.AddField(
            model_name='property',
            name='review_note',
            field=models.TextField(blank=True, help_text='Admin feedback shown to the owner.'),
        ),
    ]
