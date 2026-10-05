from django.db import migrations

ROLES = ["Dublador", "Animador", "Desenhista", "Roteirista", "Outros"]


def seed_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    for nome in ROLES:
        Role.objects.get_or_create(nome=nome)


def remove_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Role.objects.filter(nome__in=ROLES).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_alter_user_foto_portfolioitem"),
    ]

    operations = [
        migrations.RunPython(seed_roles, remove_roles),
    ]
