// src/types/index.ts

// ===================================
// TENANT
// ===================================
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  industry_display: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  logo?: string;
  primary_color: string;
  secondary_color: string;
  timezone: string;
  currency: string;
  language: string;
  years_experience: number;
  clients_count: number;
  treatments_count: number;
  average_rating: string;
  hero_image_home?: string;
  hero_image_services?: string;
  is_active: boolean;
  // Feature flags
  has_shop: boolean;
  has_bookings: boolean;
  has_services: boolean;
  has_marketing: boolean;
  has_website: boolean;
  modules_configured: boolean;
  // Website
  website_status: 'not_started' | 'draft' | 'onboarding' | 'generating' | 'review' | 'published' | null;
  // Suscripción
  plan: 'trial' | 'basic' | 'professional' | 'enterprise';
  plan_display: string;
  subscription_status: 'active' | 'trial' | 'expired' | 'inactive';
  days_remaining: number | null;
  is_trial: boolean;
}

// ===================================
// USER
// ===================================
export interface User {
  id: number;
  uid: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  avatar?: string;
  tenant: number;
  tenant_name: string;
  role: 'admin' | 'staff' | 'customer';
  role_display: string;
  is_active: boolean;
  date_joined: string;
  auth_provider?: string;
  has_password?: boolean;
}

export type SocialProvider = 'google' | 'apple' | 'facebook';

// ===================================
// AUTH
// ===================================
export interface LoginCredentials {
  email: string;
  password: string;
  tenant_slug: string;
}

export interface RegisterData {
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  phone?: string;
  tenant_slug: string;
}

export type BusinessIndustry = 'gym' | 'beauty' | 'restaurant' | 'clinic' | 'store' | 'services' | 'other';

export interface RegisterTenantData {
  business_name: string;
  industry?: string;
  country: string;
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  user: User;
  tenant?: Tenant;
  tokens: AuthTokens;
  message?: string;
}

// ===================================
// PRODUCTS
// ===================================
export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  image?: string;
  parent?: number;
  is_active: boolean;
  products_count: number;
}

export interface ProductImage {
  id: number;
  image: string;
  image_url?: string;
  alt_text: string;
  order: number;
}

export interface Inventory {
  id: number;
  product: number;
  sku: string;
  stock: number;
  track_inventory: boolean;
  allow_backorder: boolean;
  low_stock_threshold: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  category: ProductCategory | number;
  category_name?: string;
  price: string;
  compare_at_price?: string;
  is_featured: boolean;
  is_active: boolean;
  main_image?: string;
  images?: ProductImage[];
  inventory?: Inventory;
  average_rating: string;
  reviews_count: number;
  created_at: string; 
}

// ===================================
// PRODUCT ADMIN TYPES
// ===================================

export interface ProductFormData {
  name: string;
  category: number;
  price: string;
  compare_at_price?: string;
  cost_price?: string;
  brand?: string;
  short_description?: string;
  description?: string;
  is_active: boolean;
  is_featured: boolean;
  requires_shipping: boolean;
}

export interface ProductFilters {
  search?: string;
  category?: number;
  is_featured?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
  include_out_of_stock?: boolean;
}

// ===================================
// SERVICES
// ===================================
export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  image?: string;
  icon: string;
  is_active: boolean;
  services_count: number;
}

export interface StaffMember {
  id: number;
  full_name: string;
  email: string;
  position: string;
  bio: string;
  photo?: string;
  specialties: ServiceCategory[];
  is_available: boolean;
  accepts_new_clients: boolean;
  is_featured: boolean;
}

export interface Service {
  id: number;
  name: string;
  slug: string;
  category: ServiceCategory;
  short_description: string;
  description: string;
  duration_minutes: number;
  formatted_duration: string;
  price: string;
  requires_deposit: boolean;
  deposit_amount?: string;
  assigned_staff: StaffMember[];
  image?: string;
  image_url?: string;
  is_featured: boolean;
  is_active: boolean;
  average_rating: string;
  reviews_count: number; 
}

// ===================================
// BOOKINGS
// ===================================
export interface BusinessHours {
  id: number;
  day_of_week: number;
  day_name: string;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

export interface Appointment {
  id: number;
  customer: User;
  staff_member: StaffMember;
  service: Service;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'expired' | 'no_show';
  status_display: string;
  expires_at?: string | null;
  is_expired?: boolean;
  notes: string;
  internal_notes?: string;
  cancellation_reason?: string;
  is_paid: boolean;
  can_cancel: boolean;
  is_upcoming: boolean;
  created_at: string;
}

export interface StaffStats {
  today_count: number;
  pending_count: number;
  confirmed_count: number;
  completed_today: number;
  upcoming_count: number;
}

export interface StaffProfile extends StaffMember {
  services: Service[];
}

export interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  staff_member: StaffMember;
  is_available: boolean;
}

// ===================================
// COUPONS
// ===================================
export interface Coupon {
  id: number;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping';
  discount_value: string;
  discount_display: string;
  minimum_purchase: string;
  maximum_discount?: string;
  valid_from: string;
  valid_until: string;
  first_purchase_only: boolean;
  is_valid: boolean;
}

export interface AppliedCoupon {
  code: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping';
  discount_value: string;
  discount_display: string;
  discount_amount: string;
}

export interface CouponValidationResponse {
  valid: boolean;
  coupon: Coupon;
  discount_amount: number;
  message: string;
}

export interface CouponApplyResponse {
  success: boolean;
  message: string;
  coupon: AppliedCoupon;
  cart_subtotal: number;
  discount_amount: number;
  cart_total: number;
}

// ===================================
// CART
// ===================================
export interface CartItem {
  id: number;
  item_type: 'product' | 'service';
  item_data: Product | Service;
  quantity: number;
  unit_price: string;
  total_price: string;
  appointment?: Appointment;
}

export interface Cart {
  id: number;
  user: number;
  items: CartItem[];
  items_count: number;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total: string;
  coupon?: AppliedCoupon | null;
  created_at: string;
}

// ===================================
// ORDERS
// ===================================
export interface OrderItem {
  id: number;
  product: Product;
  product_name: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

export interface OrderServiceItem {
  id: number;
  service: Service;
  service_name: string;
  service_duration: number;
  price: string;
  staff_member_name: string;
  appointment_datetime: string;
}

export interface Payment {
  id: number;
  payment_method: string;
  amount: string;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  status_display: string;
  stripe_payment_intent_id: string;
  processed_at?: string;
  created_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer: User;
  status: 'pending' | 'processing' | 'paid' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  status_display: string;
  subtotal: string;
  tax_amount: string;
  total: string;
  billing_name: string;
  billing_email: string;
  product_items: OrderItem[];
  service_items: OrderServiceItem[];
  payments: Payment[];
  created_at: string;
  paid_at?: string;
}

// ===================================
// API RESPONSES
// ===================================
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// ===================================
// REVIEWS
// ===================================
export interface ReviewImage {
  id: number;
  image: string;
  image_url?: string;
}

export interface ReviewResponse {
  id: number;
  response_text: string;
  created_at: string;
}

export interface Review {
  id: number;
  user_name: string;
  user_avatar?: string;
  product?: number;
  product_name?: string;
  service?: number;
  service_name?: string;
  rating: number;
  title?: string;
  comment: string;
  images: ReviewImage[];
  is_verified_purchase: boolean;
  helpful_count: number;
  has_voted_helpful?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  business_response?: string;
  business_response_at?: string;
  created_at: string;
}

export interface CanReviewResponse {
  can_review: boolean;
  has_purchased: boolean;
  reason?: string;
  message?: string;
  existing_review?: Review;
}

// ===================================
// BANNERS
// ===================================
export interface Banner {
  id: number;
  name: string;
  message: string;
  link_url?: string;
  link_text?: string;
  banner_type: 'info' | 'promo' | 'warning' | 'announcement';
  banner_type_display: string;
  position: 'top' | 'bottom';
  position_display: string;
  background_color: string;
  text_color: string;
  is_dismissible: boolean;
  priority: number;
  rotation_interval: number;
}

// ===================================
// SUBSCRIPTIONS (NERBIS SERVICES)
// ===================================

export interface SubscriptionCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image?: string;
  is_active: boolean;
  order: number;
  plans_count: number;
  created_at: string;
  updated_at: string;
}

export type BillingPeriod = 'once' | 'monthly' | 'quarterly' | 'biannual' | 'annual';

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  description: string;
  full_description?: string;
  features: string[];
  category?: number | SubscriptionCategory;
  category_name?: string;
  price: string;
  formatted_price: string;
  billing_period: BillingPeriod;
  image?: string;
  is_active: boolean;
  is_featured: boolean;
  is_available: boolean;
  max_contracts?: number;
  active_contracts_count?: number;
  order: number;
  created_at?: string;
  updated_at?: string;
}

export type ContractStatus = 'pending' | 'active' | 'suspended' | 'cancelled' | 'expired';

export interface SubscriptionContract {
  id: number;
  service_plan: number;
  service_plan_name: string;
  service_plan_slug: string;
  customer: number;
  customer_name: string;
  order?: number;
  status: ContractStatus;
  start_date: string;
  end_date?: string;
  next_billing_date?: string;
  price_paid: string;
  notes: string;
  is_active: boolean;
  is_expired: boolean;
  days_remaining?: number;
  created_at: string;
  updated_at: string;
}

// ===================================
// WEBSITE BUILDER
// ===================================

export type WebsiteIndustry = 'restaurant' | 'retail' | 'beauty' | 'health' | 'fitness' | 'professional' | 'education' | 'automotive' | 'real_estate' | 'events' | 'pet' | 'tech' | 'creative' | 'consulting' | 'generic';
export type WebsiteStatus = 'not_started' | 'draft' | 'onboarding' | 'generating' | 'review' | 'published';
export type QuestionType = 'text' | 'textarea' | 'choice' | 'multi_choice' | 'color' | 'image' | 'number' | 'url';
export type QuestionSection = 'basic' | 'branding' | 'content' | 'contact';

export interface WebsiteTemplate {
  id: number;
  name: string;
  slug: string;
  industry: WebsiteIndustry;
  industry_display: string;
  description: string;
  preview_image_url?: string;
  preview_url?: string;
  structure_schema: Record<string, unknown>;
  default_theme: Record<string, unknown>;
  is_active: boolean;
  is_premium: boolean;
  sort_order: number;
  questions_count?: number;
  questions?: OnboardingQuestion[];
}

export interface OnboardingQuestion {
  id: number;
  template?: number;
  question_key: string;
  question_text: string;
  question_type: QuestionType;
  options?: string[];
  placeholder?: string;
  help_text?: string;
  ai_context?: string;
  is_required: boolean;
  min_length?: number;
  max_length?: number;
  section: QuestionSection;
  sort_order: number;
  is_active: boolean;
}

export interface OnboardingResponse {
  id: number;
  website_config: number;
  question: number;
  question_key: string;
  question_text: string;
  response_value: string | string[];
  created_at: string;
  updated_at: string;
}

export interface SitePage {
  id: string;
  slug: string;
  name: string;
  order: number;
  sections: string[];
  content: Record<string, unknown>;
  seo: Record<string, unknown>;
}

export interface PagesData {
  global: {
    sections: string[];
    content: Record<string, unknown>;
  };
  pages: SitePage[];
}

export interface WebsiteConfig {
  id: number;
  tenant: number;
  template: number;
  template_name: string;
  template_industry?: string;
  status: WebsiteStatus;
  status_display: string;
  subdomain?: string;
  custom_domain?: string;
  content_data: Record<string, unknown>;
  theme_data: Record<string, unknown>;
  media_data: Record<string, unknown>;
  seo_data: Record<string, unknown>;
  pages_data: PagesData;
  ai_generations_count: number;
  remaining_generations: number;
  last_generation_at?: string;
  published_at?: string;
  public_url: string;
  is_published: boolean;
  has_unpublished_changes: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  section_id?: string;
  changes_made?: Record<string, unknown>;
  tokens_used: number;
  created_at: string;
}

export interface GenerateContentRequest {
  template_id: number;
  additional_instructions?: string;
}

export interface GenerateContentResponse {
  content_data: Record<string, unknown>;
  seo_data: Record<string, unknown>;
  tokens_used: number;
  remaining_generations: number;
  is_billable: boolean;
  status: string;
}

export interface ChatRequest {
  message: string;
  section_id?: string;
}

export interface ChatResponse {
  message: string;
  updated_content?: Record<string, unknown>;
  section_id?: string;
  tokens_used: number;
  remaining_generations: number;
}
