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

/** Computed status for superadmin accounts. */
export type SuperadminStatus = 'active' | 'blocked' | 'deactivated';

/** Internal role within the superadmin surface. */
export type InternalRole = 'owner' | 'admin' | 'support' | 'viewer';

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
  superadmin_status: SuperadminStatus;
  block_reason: string;
  blocked_until: string | null;
  is_owner: boolean;
  internal_role: InternalRole;
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

/** Tenant lifecycle phase computed by the backend (Tenant.onboarding_phase). */
export type AdminTenantPhase =
  | 'onboarding'
  | 'modules_configured'
  | 'website_building'
  | 'website_generated'
  | 'operational'
  | 'suspended';

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
  onboarding_phase: AdminTenantPhase;
  is_deleted: boolean;
  deleted_at: string | null;
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
  has_management: boolean;
  modules_configured: boolean;

  // Onboarding lifecycle
  onboarding_phase: AdminTenantPhase;
  website_status: 'draft' | 'onboarding' | 'generating' | 'review' | 'published' | null;

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

  // Soft delete
  is_deleted: boolean;
  deleted_at: string | null;

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
  has_management?: boolean;
}

/** Query parameters accepted by `GET /api/admin/tenants/`. */
export interface AdminTenantFilters {
  is_active?: boolean;
  plan?: AdminTenantPlan;
  search?: string;
  deleted?: boolean;
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

/**
 * Entry in the tenant phase transition log.
 * Mirrors `AdminTenantPhaseLogSerializer`.
 */
export interface AdminTenantPhaseLogEntry {
  id: number;
  from_phase: AdminTenantPhase;
  to_phase: AdminTenantPhase;
  triggered_by: string;
  note: string;
  created_at: string;
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

// ──────────────────────────────────────────────────────────────────────
// Audit log — superadmin activity tracking (Issue #182)
// ──────────────────────────────────────────────────────────────────────

/**
 * Single entry returned by `GET /api/admin/audit-log/`.
 * Mirrors `AdminAuditLogSerializer`.
 */
export interface AdminAuditLogEntry {
  id: number;
  actor: number | null;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string;
  target_repr: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────────────────────────────
// Platform settings — modules, onboarding questions (Issue #TBD)
// ──────────────────────────────────────────────────────────────────────

/** Compact reference to a module, used in dependency/relation lists. */
export interface AdminModuleRef {
  id: number;
  key: string;
  label: string;
}

/**
 * Platform module returned by `GET /api/admin/settings/modules/`.
 * Mirrors `AdminPlatformModuleSerializer`.
 */
export interface AdminPlatformModule {
  id: number;
  key: string;
  label: string;
  description: string;
  icon: string;
  accent_color: string;
  is_active: boolean;
  sort_order: number;
  dependencies: number[];
  dependencies_detail: AdminModuleRef[];
}

/**
 * Payload accepted by `POST/PATCH /api/admin/settings/modules/`.
 * Mirrors `AdminPlatformModuleCreateUpdateSerializer`.
 */
export interface AdminPlatformModulePayload {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  accent_color?: string;
  is_active?: boolean;
  sort_order?: number;
  dependencies?: number[];
}

/**
 * Onboarding question returned by `GET /api/admin/settings/questions/`.
 * Mirrors `AdminOnboardingQuestionSerializer`.
 */
export interface AdminOnboardingQuestion {
  id: number;
  question_key: string;
  question_text: string;
  question_type: string;
  message: string;
  input_type: string;
  hint: string;
  placeholder: string;
  help_text: string;
  options: Record<string, unknown> | null;
  ai_context: string;
  section: string;
  sort_order: number;
  is_active: boolean;
  is_required: boolean;
  min_length: number | null;
  max_length: number | null;
  template: number | null;
  required_modules: number[];
  required_modules_detail: AdminModuleRef[];
}

/**
 * Payload accepted by `POST/PATCH /api/admin/settings/questions/`.
 * Mirrors `AdminOnboardingQuestionCreateUpdateSerializer`.
 */
export interface AdminOnboardingQuestionPayload {
  question_key: string;
  question_text: string;
  question_type?: string;
  message?: string;
  input_type?: string;
  hint?: string;
  placeholder?: string;
  help_text?: string;
  options?: Record<string, unknown> | null;
  ai_context?: string;
  section?: string;
  sort_order?: number;
  is_active?: boolean;
  is_required?: boolean;
  min_length?: number | null;
  max_length?: number | null;
  template?: number | null;
  required_modules?: number[];
}

// ──────────────────────────────────────────────────────────────────────
// Website pages — platform settings (Issue #214)
// ──────────────────────────────────────────────────────────────────────

/**
 * Website page returned by `GET /api/admin/settings/pages/`.
 * Mirrors `AdminWebsitePageSerializer`.
 */
export interface AdminWebsitePage {
  id: number;
  key: string;
  label: string;
  description: string;
  icon: string;
  is_mandatory: boolean;
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
  auto_include_modules_detail: AdminModuleRef[];
  auto_include_modules: number[];
  created_at: string;
  updated_at: string;
}

/**
 * Payload accepted by `POST/PATCH /api/admin/settings/pages/`.
 * Mirrors `AdminWebsitePageCreateUpdateSerializer`.
 */
export interface AdminWebsitePagePayload {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  is_mandatory?: boolean;
  is_default?: boolean;
  sort_order?: number;
  is_active?: boolean;
  auto_include_modules?: number[];
}

// ──────────────────────────────────────────────────────────────────────
// Website sections — platform settings (Issue #214)
// ──────────────────────────────────────────────────────────────────────

/** Compact reference to a page, used in section relations. */
export interface AdminPageRef {
  id: number;
  key: string;
  label: string;
}

/**
 * Website section returned by `GET /api/admin/settings/sections/`.
 * Mirrors `AdminWebsiteSectionSerializer`.
 */
export interface AdminWebsiteSection {
  id: number;
  key: string;
  label: string;
  description: string;
  page: number | null;
  page_detail: AdminPageRef | null;
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Payload accepted by `POST/PATCH /api/admin/settings/sections/`.
 * Mirrors `AdminWebsiteSectionCreateUpdateSerializer`.
 */
export interface AdminWebsiteSectionPayload {
  key: string;
  label: string;
  description?: string;
  page?: number | null;
  is_default?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// Section Variants
// ──────────────────────────────────────────────────────────────────────

export type VariantMood = 'professional' | 'playful' | 'elegant' | 'bold' | 'minimal';

export interface AdminSectionVariant {
  id: number;
  section: number;
  section_detail: { id: number; key: string; label: string };
  key: string;
  label: string;
  description: string;
  css_class_hint: string;
  preview_url: string;
  tags: string[];
  industries: string[];
  mood: VariantMood;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AdminSectionVariantPayload {
  section: number;
  key: string;
  label: string;
  description?: string;
  css_class_hint?: string;
  preview_url?: string;
  tags?: string[];
  industries?: string[];
  mood?: VariantMood;
  is_default?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

// ──────────────────────────────────────────────────────────────────────
// Prompt Blocks
// ──────────────────────────────────────────────────────────────────────

export type PromptBlockCategory = 'system' | 'business' | 'visual' | 'section' | 'rules';
export type PromptBlockScope = 'global' | 'template' | 'industry';

export interface AdminPromptBlock {
  id: number;
  key: string;
  label: string;
  content: string;
  category: PromptBlockCategory;
  scope: PromptBlockScope;
  template: number | null;
  template_detail: { id: number; name: string; slug: string; industry: string } | null;
  industry: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminPromptBlockPayload {
  key: string;
  label: string;
  content: string;
  category?: PromptBlockCategory;
  scope?: PromptBlockScope;
  template?: number | null;
  industry?: string;
  sort_order?: number;
  is_active?: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// Prompt Preview
// ──────────────────────────────────────────────────────────────────────

export interface AdminPromptPreviewPayload {
  template_id?: number | null;
  industry?: string;
  onboarding_responses?: Record<string, unknown>;
}

export interface AdminPromptPreviewResponse {
  prompt: string;
  template_used: string | null;
  block_count: number;
}

// ──────────────────────────────────────────────────────────────────────
// Industries — global catalog + AI config + AI usage stats (Issue #262)
// ──────────────────────────────────────────────────────────────────────

/** Lifecycle status of an industry. `proposed_by_model` rows await review. */
export type AdminIndustryStatus = 'proposed_by_model' | 'reviewed';

/**
 * Minimal template reference nested in `default_template_detail`.
 * Mirrors `WebsiteTemplateMinimalSerializer`.
 */
export interface AdminTemplateRef {
  id: number;
  name: string;
  slug: string;
  /** Industry FK key of the template (may be null). */
  industry: string | null;
}

/**
 * Industry returned by `GET /api/admin/settings/industries/`.
 * Mirrors `AdminIndustrySerializer`.
 */
export interface AdminIndustry {
  id: number;
  key: string;
  label: string;
  description: string;
  icon: string;
  /** PK of the default template (write field); null when unset. */
  default_template: number | null;
  /** Nested read-only detail of the default template; null when unset. */
  default_template_detail: AdminTemplateRef | null;
  is_active: boolean;
  sort_order: number;
  /** True when the AI proposed this industry during onboarding. Read-only. */
  created_by_ai: boolean;
  /** Read-only — only changes via the promote endpoint. */
  status: AdminIndustryStatus;
  status_display: string;
  created_at: string;
  updated_at: string;
}

/**
 * Payload accepted by `POST/PATCH /api/admin/settings/industries/`.
 * `created_by_ai` and `status` are read-only on the backend.
 */
export interface AdminIndustryPayload {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  default_template?: number | null;
  is_active?: boolean;
  sort_order?: number;
}

/** AI task whose model config can be edited. Natural key — fixed set. */
export type AdminAITask =
  | 'classify_industry'
  | 'web_content'
  | 'chat_edit'
  | 'seo';

/**
 * Per-task AI model configuration returned by
 * `GET /api/admin/settings/ai-models/`. Mirrors `AdminAIModelConfigSerializer`.
 * `temperature` is a DRF DecimalField (serialized as a string).
 */
export interface AdminAIModelConfig {
  id: number;
  task: AdminAITask;
  task_display: string;
  model: string;
  max_tokens: number;
  temperature: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Editable fields of an AI model config. `task` is read-only (natural key,
 * seeded by migration) so it is not part of the payload.
 */
export interface AdminAIModelConfigPayload {
  model?: string;
  max_tokens?: number;
  temperature?: string | number;
  is_active?: boolean;
}

/** Aggregated AI usage row (per generation type or per model). */
export interface AdminAIStatsRow {
  count: number;
  tokens_input: number;
  tokens_output: number;
  /** Decimal serialized as a string. */
  cost_estimated: string;
}

/** Grand totals across all AI generation logs. */
export type AdminAIStatsTotals = AdminAIStatsRow;

export interface AdminAIStatsByGenerationType extends AdminAIStatsRow {
  generation_type: string;
}

export interface AdminAIStatsByModel extends AdminAIStatsRow {
  model_used: string;
}

/** Per-tenant AI usage breakdown row. */
export interface AdminAIStatsByTenant extends AdminAIStatsRow {
  /** Tenant PK is a UUID string. */
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_slug: string | null;
  successful: number;
  failed: number;
}

/**
 * AI usage statistics returned by `GET /api/admin/settings/ai-stats/`.
 * Mirrors `AdminAIStatsView` response shape.
 */
export interface AdminAIStats {
  totals: AdminAIStatsTotals;
  by_generation_type: AdminAIStatsByGenerationType[];
  by_model: AdminAIStatsByModel[];
  by_tenant: AdminAIStatsByTenant[];
}

/**
 * Detailed AI generation log row returned by
 * `GET /api/admin/settings/ai-logs/`. Mirrors `AdminAIGenerationLogSerializer`.
 */
export interface AdminAIGenerationLog {
  id: number;
  created_at: string;
  /** Tenant PK is a UUID string. */
  tenant: string | null;
  tenant_name: string | null;
  tenant_slug: string | null;
  website_config: number | null;
  generation_type: string;
  generation_type_display: string;
  section_id: string | null;
  model_used: string;
  tokens_input: number;
  tokens_output: number;
  total_tokens: number;
  /** Decimal serialized as a string. */
  cost_estimated: string;
  is_successful: boolean;
  error_message: string | null;
  is_billable: boolean;
  prompt_summary: string | null;
  full_prompt: string | null;
  raw_response: string | null;
  onboarding_snapshot: Record<string, unknown> | null;
}

/** Paginated DRF response for AI generation logs. */
export interface AdminAIGenerationLogPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminAIGenerationLog[];
}

/** Optional filters for `adminListAILogs`. */
export interface AdminAILogsParams {
  tenant?: number | string;
  generation_type?: string;
  model_used?: string;
  is_successful?: boolean;
  page?: number;
  page_size?: number;
}
