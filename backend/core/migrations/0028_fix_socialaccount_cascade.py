# Fix CASCADE delete rules on core_socialaccount foreign keys.
# The original migration created the FKs with NO ACTION (Django default when
# on_delete is not CASCADE at the DB level). This caused IntegrityError when
# deleting a User or Tenant that had linked social accounts.
# See: https://github.com/nerbis-platform/nerbis-platform/issues/53

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0027_social_account"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                # Fix user FK: NO ACTION -> CASCADE
                "ALTER TABLE core_socialaccount "
                "DROP CONSTRAINT IF EXISTS core_socialaccount_user_id_4da0b336_fk_core_user_id;",
                "ALTER TABLE core_socialaccount "
                "ADD CONSTRAINT core_socialaccount_user_id_4da0b336_fk_core_user_id "
                "FOREIGN KEY (user_id) REFERENCES core_user(id) "
                "ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;",
                # Fix tenant FK: NO ACTION -> CASCADE
                "ALTER TABLE core_socialaccount "
                "DROP CONSTRAINT IF EXISTS core_socialaccount_tenant_id_52e8c00a_fk_core_tenant_id;",
                "ALTER TABLE core_socialaccount "
                "ADD CONSTRAINT core_socialaccount_tenant_id_52e8c00a_fk_core_tenant_id "
                "FOREIGN KEY (tenant_id) REFERENCES core_tenant(id) "
                "ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;",
            ],
            reverse_sql=[
                # Reverse: restore NO ACTION (Django default)
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
