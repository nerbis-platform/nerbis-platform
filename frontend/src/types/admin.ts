// src/types/admin.ts
//
// Platform superadmin types. Deliberately DO NOT include `tenant`,
// `tenant_slug`, or `role` fields at the top level (for AdminUser) — the
// admin surface is fully isolated from the tenant surface.
//
// The additional types below (AdminTenant*, AdminTenantUser, AdminUserDetail,
// ...) describe the cross-tenant management surface exposed under
// `/api/admin/tenants/*` and `/api/admin/users/*`. They intentionally
// mirror the exact field names returned by the backend serializers in
// `backend/core/admin_tenant_serializers.py` so the wire contract is
// re-checkable at compile time.

export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface AdminLoginResponse {
  access: string;
  refresh: string;
  user: AdminUser;
}

export interface AdminPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ──────────────────────────────────────────────────────────────────────
// Tenant management — cross-tenant surface (Issue #110)
// ──────────────────────────────────────────────────────────────────────

/** Subscription status computed by the backend (Tenant.subscription_status). */
export type AdminSubscriptionStatus =
  | 'active'
  | 'trial'
  | 'expired'
  | 'inactive';

/** Plans supported by the platform. */
export type AdminTenantPlan = 'trial' | 'basic' | 'professional' | 'enterprise';

/** Roles supported for tenant users. */
export type AdminTenantUserRole = 'admin' | 'staff' | 'customer';

/** Social auth providers that can be linked to a tenant user. */
export type AdminSocialProvider = 'google' | 'apple' | 'facebook';

/**
 * Summary row returned by `GET /api/admin/tenants/`.
 * Mirrors `AdminTenantListSerializer`.
 */
export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  email: string;
  plan: AdminTenantPlan;
  is_active: boolean;
  subscription_status: AdminSubscriptionStatus;
  /** Null when there is no subscription_ends_at set on the tenant. */
  days_remaining: number | null;
  user_count: number;
  created_at: string;
  /**
   * Optional because the backend serializer does not explicitly expose
   * `subscription_ends_at` in the LIST response (it only appears in DETAIL),
   * but it is included in the spec for this interface so list UIs can
   * rely on a single shape if the backend is extended later.
   */
  subscription_ends_at?: string | null;
}

/**
 * Full tenant payload returned by `GET /api/admin/tenants/<uuid>/`.
 * Mirrors `AdminTenantDetailSerializer`. Includes feature flags,
 * branding, regional config and computed counts.
 */
export interface AdminTenantDetail {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;

  // Address
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;

  // Classification / status
  industry: string;
  plan: AdminTenantPlan;
  is_active: boolean;

  // Subscription (read-only summary)
  subscription_ends_at: string | null;
  subscription_status: AdminSubscriptionStatus;
  days_remaining: number | null;

  // Feature flags
  has_website: boolean;
  has_shop: boolean;
  has_bookings: boolean;
  has_services: boolean;
  has_marketing: boolean;
  modules_configured: boolean;

  // Branding
  logo: string | null;
  primary_color: string;
  secondary_color: string;

  // Regional config
  timezone: string;
  currency: string;
  language: string;

  // Computed counts
  user_count: number;
  admin_count: number;

  // Metadata
  created_at: string;
  updated_at: string;

  /**
   * Convenience alias for the industry machine key. The backend exposes
   * `industry` as the canonical field; `industry_name` is an optional
   * human-readable label the UI may resolve locally via a lookup table.
   * Declared here so UI code can populate it after fetch without casting.
   */
  industry_name?: string;
}

/**
 * Allowlist payload accepted by `PATCH /api/admin/tenants/<uuid>/`.
 * Mirrors `AdminTenantUpdateSerializer`.
 */
export interface AdminTenantUpdatePayload {
  // Business data (Issue #148)
  name?: string;
  email?: string;
  phone?: string;
  industry?: string;

  // Status & subscription
  is_active?: boolean;
  plan?: AdminTenantPlan;
  subscription_ends_at?: string | null;
  has_website?: boolean;
  has_shop?: boolean;
  has_bookings?: boolean;
  has_services?: boolean;
  has_marketing?: boolean;
}

/** Query parameters accepted by `GET /api/admin/tenants/`. */
export interface AdminTenantFilters {
  is_active?: boolean;
  plan?: AdminTenantPlan;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?:
    | 'name'
    | '-name'
    | 'created_at'
    | '-created_at'
    | 'plan'
    | '-plan';
}

// ──────────────────────────────────────────────────────────────────────
// Tenant users + user detail — cross-tenant surface (Issue #110)
// ──────────────────────────────────────────────────────────────────────

/**
 * Summary row returned by `GET /api/admin/tenants/<uuid>/users/`.
 * Mirrors `AdminTenantUserSerializer`.
 */
export interface AdminTenantUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: AdminTenantUserRole;
  is_active: boolean;
  is_guest: boolean;
  last_login: string | null;
  date_joined: string;
}

/**
 * Social account summary returned nested in `AdminUserDetail`.
 * Mirrors `AdminSocialAccountSerializer`.
 *
 * Note: the backend exposes `provider_uid` (not `provider_id`) and a full
 * `extra_data` object. We model both so TS callers see the exact wire
 * contract, but UI code should treat `extra_data` as opaque.
 */
export interface AdminSocialAccount {
  id: number;
  provider: AdminSocialProvider;
  provider_uid: string;
  email: string;
  extra_data: Record<string, unknown>;
  connected_at: string;
}

/**
 * Passkey (WebAuthn credential) summary returned nested in
 * `AdminUserDetail`. Mirrors `AdminPasskeySerializer`.
 */
export interface AdminPasskey {
  id: number;
  name: string;
  last_used: string | null;
  created_at: string;
}

/**
 * Full user payload returned by `GET /api/admin/users/<int>/`.
 * Mirrors `AdminUserDetailSerializer`. Includes auth-method breakdown
 * (social accounts, passkeys, TOTP status).
 */
export interface AdminUserDetail {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: AdminTenantUserRole;
  is_active: boolean;
  is_guest: boolean;

  // Tenant info (nullable because superadmins have tenant_id === null,
  // though superadmins are NOT reachable via this endpoint by design —
  // we keep null possible to match the serializer contract strictly).
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_slug: string | null;

  // Auth methods
  social_accounts: AdminSocialAccount[];
  passkeys: AdminPasskey[];
  totp_enabled: boolean;
  totp_confirmed_at: string | null;

  // Metadata
  last_login: string | null;
  date_joined: string;
  created_at: string;
  updated_at: string;
}

/**
 * Allowlist payload accepted by `PATCH /api/admin/users/<int>/`.
 * Mirrors `AdminUserUpdateSerializer`.
 */
export interface AdminUserUpdatePayload {
  is_active?: boolean;
  role?: AdminTenantUserRole;
}

/** Query parameters accepted by `GET /api/admin/tenants/<uuid>/users/`. */
export interface AdminUserFilters {
  role?: AdminTenantUserRole;
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?:
    | 'last_login'
    | '-last_login'
    | 'date_joined'
    | '-date_joined'
    | 'email'
    | '-email';
}
