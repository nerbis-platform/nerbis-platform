# backend/core/tests/test_cascade_delete.py
# Regression test for https://github.com/nerbis-platform/nerbis-platform/issues/53
# Verifies that deleting a User or Tenant with linked SocialAccounts
# does not raise IntegrityError.

from core.models import SocialAccount, User
from core.test_base import TenantAwareTestCase


class SocialAccountCascadeDeleteTest(TenantAwareTestCase):
    """Test: eliminar usuario/tenant con social accounts no produce IntegrityError."""

    def test_delete_user_cascades_to_social_account(self):
        """Al eliminar un usuario, sus social accounts se eliminan automáticamente."""
        user = User.objects.create_user(
            email="social@test.com",
            password="Social123!",
            username="social_user",
            tenant=self.tenant,
            role="customer",
        )
        SocialAccount.objects.create(
            tenant=self.tenant,
            user=user,
            provider="google",
            provider_uid="google-uid-123",
            email="social@gmail.com",
            extra_data={"name": "Social User"},
        )
        user_id = user.id
        self.assertEqual(SocialAccount.objects.filter(user_id=user_id).count(), 1)

        # Esto causaba IntegrityError antes del fix
        user.delete()

        self.assertEqual(SocialAccount.objects.filter(user_id=user_id).count(), 0)

    def test_delete_tenant_cascades_to_social_accounts(self):
        """Al eliminar un tenant, todos sus social accounts se eliminan."""
        tenant_2, admin_2 = self.create_second_tenant()
        SocialAccount.objects.create(
            tenant=tenant_2,
            user=admin_2,
            provider="google",
            provider_uid="google-uid-456",
            email="admin@gmail.com",
            extra_data={},
        )
        tenant_2_id = tenant_2.id
        self.assertEqual(SocialAccount.objects.filter(tenant_id=tenant_2_id).count(), 1)

        # Esto causaba IntegrityError antes del fix
        tenant_2.delete()

        self.assertEqual(SocialAccount.objects.filter(tenant_id=tenant_2_id).count(), 0)
