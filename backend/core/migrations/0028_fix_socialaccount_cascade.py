# Corrige las reglas de eliminación CASCADE en las claves foráneas de core_socialaccount.
# La migración original creó las FK con NO ACTION (comportamiento por defecto de Django
# a nivel de base de datos). Esto causaba IntegrityError al eliminar un Usuario o Tenant
# que tuviera cuentas sociales vinculadas.
# Ver: https://github.com/nerbis-platform/nerbis-platform/issues/53

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0027_social_account"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                # Corregir FK de usuario: NO ACTION -> CASCADE
                "ALTER TABLE core_socialaccount "
                "DROP CONSTRAINT IF EXISTS core_socialaccount_user_id_4da0b336_fk_core_user_id;",
                "ALTER TABLE core_socialaccount "
                "ADD CONSTRAINT core_socialaccount_user_id_4da0b336_fk_core_user_id "
                "FOREIGN KEY (user_id) REFERENCES core_user(id) "
                "ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;",
                # Corregir FK de tenant: NO ACTION -> CASCADE
                "ALTER TABLE core_socialaccount "
                "DROP CONSTRAINT IF EXISTS core_socialaccount_tenant_id_52e8c00a_fk_core_tenant_id;",
                "ALTER TABLE core_socialaccount "
                "ADD CONSTRAINT core_socialaccount_tenant_id_52e8c00a_fk_core_tenant_id "
                "FOREIGN KEY (tenant_id) REFERENCES core_tenant(id) "
                "ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;",
            ],
            reverse_sql=[
                # Reverso: restaurar NO ACTION (comportamiento por defecto de Django)
                "ALTER TABLE core_socialaccount "
                "DROP CONSTRAINT IF EXISTS core_socialaccount_user_id_4da0b336_fk_core_user_id;",
                "ALTER TABLE core_socialaccount "
                "ADD CONSTRAINT core_socialaccount_user_id_4da0b336_fk_core_user_id "
                "FOREIGN KEY (user_id) REFERENCES core_user(id) "
                "DEFERRABLE INITIALLY DEFERRED;",
                "ALTER TABLE core_socialaccount "
                "DROP CONSTRAINT IF EXISTS core_socialaccount_tenant_id_52e8c00a_fk_core_tenant_id;",
                "ALTER TABLE core_socialaccount "
                "ADD CONSTRAINT core_socialaccount_tenant_id_52e8c00a_fk_core_tenant_id "
                "FOREIGN KEY (tenant_id) REFERENCES core_tenant(id) "
                "DEFERRABLE INITIALLY DEFERRED;",
            ],
        ),
    ]
