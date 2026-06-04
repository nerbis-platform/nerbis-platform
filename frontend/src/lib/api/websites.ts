// src/lib/api/websites.ts

import { apiClient } from './client';
import {
  WebsiteTemplate,
  WebsiteConfig,
  WebsiteStatus,
  OnboardingQuestion,
  OnboardingResponse,
  ChatMessage,
  ChatResponse,
  PaginatedResponse,
  PlatformModule,
  WebsitePage,
  WebsiteSection,
} from '@/types';

// ===================================
// TEMPLATES
// ===================================

/**
 * Obtener todos los templates disponibles
 */
export async function getWebsiteTemplates(): Promise<WebsiteTemplate[]> {
  const { data } = await apiClient.get<PaginatedResponse<WebsiteTemplate>>('/websites/templates/');
  return data.results;
}

/**
 * Obtener template por ID
 */
export async function getWebsiteTemplate(id: number): Promise<WebsiteTemplate> {
  const { data } = await apiClient.get<WebsiteTemplate>(`/websites/templates/${id}/`);
  return data;
}

// ===================================
// WEBSITE CONFIG
// ===================================

/**
 * Obtener la configuración del sitio web del tenant actual
 */
export async function getWebsiteConfig(): Promise<WebsiteConfig | null> {
  const { data } = await apiClient.get<PaginatedResponse<WebsiteConfig>>('/websites/configs/');
  return data.results.length > 0 ? data.results[0] : null;
}

/**
 * Crear configuración de sitio web
 */
export async function createWebsiteConfig(templateId: number): Promise<WebsiteConfig> {
  const { data } = await apiClient.post<WebsiteConfig>('/websites/configs/', {
    template: templateId,
  });
  return data;
}

/**
 * Actualizar configuración de sitio web
 */
export async function updateWebsiteConfig(
  id: number,
  updates: Partial<WebsiteConfig>
): Promise<WebsiteConfig> {
  const { data } = await apiClient.patch<WebsiteConfig>(`/websites/configs/${id}/`, updates);
  return data;
}

// ===================================
// ONBOARDING
// ===================================

/**
 * Iniciar el proceso de onboarding
 */
export async function startOnboarding(templateId: number): Promise<{
  website_config: WebsiteConfig;
  questions: OnboardingQuestion[];
}> {
  const { data } = await apiClient.post('/websites/onboarding/start/', {
    template_id: templateId,
  });
  return data;
}

/**
 * Guardar respuestas del onboarding
 */
export async function saveOnboardingResponses(
  responses: Record<string, string | string[]>
): Promise<{
  saved_count: number;
  responses: OnboardingResponse[];
}> {
  const { data } = await apiClient.post('/websites/onboarding/responses/', { responses });
  return data;
}

/**
 * Obtener estado del onboarding
 */
export async function getOnboardingStatus(): Promise<{
  status: WebsiteStatus;
  message?: string;
  template?: {
    id: number;
    name: string;
    slug: string;
    industry: string;
    industry_display: string;
    description: string;
    preview_image_url?: string;
    preview_url?: string;
    is_premium: boolean;
    sort_order: number;
  };
  responses: Record<string, string | string[]>;
  progress: {
    total_required: number;
    answered_required: number;
    is_complete: boolean;
  };
}> {
  const { data } = await apiClient.get('/websites/onboarding/status/');
  return data;
}

// ===================================
// QUICK-START (Fase 2 — flujo <60s)
// ===================================

export interface QuickStartRequest {
  business_description: string;
  main_services: string;
  business_whatsapp?: string;
  website_sections?: string[];
  brand_tone?: string;
  primary_color?: string;
  secondary_color?: string;
  target_audience?: string;
  unique_selling_point?: string;
  business_email?: string;
  business_phone?: string;
  /**
   * Industry key confirmed by the user via classifyIndustry. When present,
   * the backend resolves the template from this key (overriding the tenant's
   * stored industry). Always resolves to a template — never a 400.
   */
  industry_key?: string;
}

export interface QuickStartResponse {
  content_data: Record<string, unknown>;
  seo_data: Record<string, unknown>;
  theme_data: Record<string, unknown>;
  tokens_used?: number;
  remaining_generations?: number;
  status: string;
  template: {
    slug: string;
    name: string;
  };
}

/** Respuesta 202 cuando la generacion se encola via Celery */
export interface AsyncGenerationAccepted {
  task_id: string;
  status: 'generating';
}

/** Estado de generacion devuelto por el endpoint de polling */
export interface GenerationStatusResponse {
  status: 'generating' | 'review' | 'onboarding' | 'draft' | 'published';
  task_id: string | null;
  content_data?: Record<string, unknown>;
  seo_data?: Record<string, unknown>;
  theme_data?: Record<string, unknown>;
}

/**
 * Genera un sitio completo con 3 campos (onboarding rapido).
 * Auto-resuelve template por industria del tenant.
 * Devuelve 202 Accepted con task_id (generacion asincrona via Celery).
 */
export async function quickStartGenerate(
  payload: QuickStartRequest
): Promise<AsyncGenerationAccepted> {
  const { data } = await apiClient.post<AsyncGenerationAccepted>(
    '/websites/onboarding/quick-start/',
    payload
  );
  return data;
}

// ===================================
// INDUSTRY CLASSIFICATION (Pipe)
// ===================================

export interface ClassifyIndustryRequest {
  business_description: string;
  selected_modules?: string[];
}

export interface ClassifyIndustryResponse {
  industry_key: string;
  industry_label: string;
  /** Confidence 0..1 returned by the classifier (0 in the mock/no-key path). */
  confidence: number;
  /** True when the classifier proposed a brand-new industry (created on the fly). */
  is_new: boolean;
}

/**
 * Clasifica la industria del negocio a partir de su descripcion y modulos.
 * Nunca falla por industria no soportada: si no hay match, crea/propone una.
 * POST /api/websites/classify-industry/
 */
export async function classifyIndustry(
  businessDescription: string,
  selectedModules?: string[]
): Promise<ClassifyIndustryResponse> {
  const { data } = await apiClient.post<ClassifyIndustryResponse>(
    '/websites/classify-industry/',
    {
      business_description: businessDescription,
      selected_modules: selectedModules ?? [],
    }
  );
  return data;
}

// ===================================
// AI GENERATION
// ===================================

/**
 * Generar contenido con IA.
 * Devuelve 202 Accepted con task_id (generacion asincrona via Celery).
 * Devuelve 409 Conflict si ya hay una generacion en progreso.
 */
export async function generateContent(
  additionalInstructions?: string
): Promise<AsyncGenerationAccepted> {
  const { data } = await apiClient.post<AsyncGenerationAccepted>('/websites/generate/', {
    additional_instructions: additionalInstructions,
  });
  return data;
}

/**
 * Consultar el estado de la generacion asincrona (polling).
 * Cuando status='review', incluye content_data, seo_data, theme_data.
 */
export async function getGenerationStatus(): Promise<GenerationStatusResponse> {
  const { data } = await apiClient.get<GenerationStatusResponse>('/websites/generation-status/');
  return data;
}

// ===================================
// CHAT
// ===================================

/**
 * Obtener historial de chat
 */
export async function getChatHistory(): Promise<ChatMessage[]> {
  const { data } = await apiClient.get<{ messages: ChatMessage[] }>('/websites/chat/');
  return data.messages;
}

/**
 * Enviar mensaje de chat
 */
export async function sendChatMessage(
  message: string,
  sectionId?: string
): Promise<ChatResponse> {
  const { data } = await apiClient.post<ChatResponse>('/websites/chat/', {
    message,
    section_id: sectionId,
  });
  return data;
}

// ===================================
// PUBLISH
// ===================================

/**
 * Publicar sitio web
 */
export async function publishWebsite(
  subdomain?: string,
  customDomain?: string
): Promise<{
  success: boolean;
  public_url: string;
  subdomain: string;
  custom_domain?: string;
  published_at: string;
}> {
  const { data } = await apiClient.post('/websites/publish/', {
    subdomain,
    custom_domain: customDomain,
  });
  return data;
}

/**
 * Obtener preview del sitio
 */
export async function getWebsitePreview(): Promise<{
  content: Record<string, unknown>;
  theme: Record<string, unknown>;
  seo: Record<string, unknown>;
  template: {
    id: number;
    name: string;
    slug: string;
  };
}> {
  const { data } = await apiClient.get('/websites/preview/');
  return data;
}

/**
 * Obtener HTML renderizado del sitio para el preview iframe
 */
export async function getPreviewRenderHtml(pageId?: string): Promise<string> {
  const params = pageId ? { page: pageId } : {};
  const { data } = await apiClient.get('/websites/preview/render/', {
    responseType: 'text',
    params,
  });
  return data as unknown as string;
}

// ===================================
// SEO AI SUGGESTIONS
// ===================================

/**
 * Generar sugerencias SEO con IA basadas en keywords
 */
export async function suggestSeo(
  keywords: string[],
  businessName: string,
  currentTitle: string,
  currentDescription: string
): Promise<{
  title: string;
  description: string;
  extra_keywords: string[];
}> {
  const { data } = await apiClient.post('/websites/suggest-seo/', {
    keywords,
    business_name: businessName,
    current_title: currentTitle,
    current_description: currentDescription,
  });
  return data;
}

// ===================================
// SECTION MANAGEMENT
// ===================================

/**
 * Reordenar secciones del sitio
 */
export async function reorderSections(order: string[]): Promise<{ message: string; order: string[] }> {
  const { data } = await apiClient.post('/websites/sections/reorder/', { order });
  return data;
}

/**
 * Agregar sección al sitio
 */
export async function addSection(
  sectionId: string,
  initialContent?: Record<string, unknown>,
  variant?: string,
): Promise<{
  message: string;
  section: Record<string, unknown>;
}> {
  const payload: Record<string, unknown> = { section_id: sectionId };
  if (initialContent) payload.initial_content = initialContent;
  if (variant) payload.variant = variant;
  const { data } = await apiClient.post('/websites/sections/add/', payload);
  return data;
}

/**
 * Eliminar sección del sitio
 */
export async function removeSection(sectionId: string): Promise<{ message: string }> {
  const { data } = await apiClient.post('/websites/sections/remove/', { section_id: sectionId });
  return data;
}

/**
 * Duplicar sección del sitio con todo su contenido
 */
export async function duplicateSection(sectionId: string): Promise<{
  message: string;
  new_section_id: string;
  section: Record<string, unknown>;
}> {
  const { data } = await apiClient.post('/websites/sections/duplicate/', { section_id: sectionId });
  return data;
}

/**
 * Cambiar variante visual de una sección
 */
export async function updateSectionVariant(
  sectionId: string,
  variant: string
): Promise<{ message: string; section_id: string; variant: string }> {
  const { data } = await apiClient.post('/websites/sections/variant/', {
    section_id: sectionId,
    variant,
  });
  return data;
}

/**
 * Subir imagen para el website builder (OG image, favicon, etc)
 */
export async function uploadWebsiteMedia(
  file: File,
  purpose: 'og_image' | 'favicon' | 'general'
): Promise<{ url: string; path: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', purpose);
  const { data } = await apiClient.post<{ url: string; path: string }>(
    '/websites/upload-media/',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

/**
 * Actualizar theme_data del sitio
 */
export async function updateThemeData(
  configId: number,
  themeData: Record<string, string>
): Promise<WebsiteConfig> {
  const { data } = await apiClient.patch<WebsiteConfig>(`/websites/configs/${configId}/`, {
    theme_data: themeData,
  });
  return data;
}

// ===================================
// PLATFORM MODULES
// ===================================

export async function getPlatformModules(): Promise<PlatformModule[]> {
  const { data } = await apiClient.get<PlatformModule[]>('/modules/');
  return data;
}

// ===================================
// ONBOARDING CONFIG
// ===================================

export async function getOnboardingQuestions(): Promise<OnboardingQuestion[]> {
  const { data } = await apiClient.get<OnboardingQuestion[]>('/websites/onboarding/questions/');
  return data;
}

export async function getOnboardingPages(): Promise<WebsitePage[]> {
  const { data } = await apiClient.get<WebsitePage[]>('/websites/onboarding/pages/');
  return data;
}

export async function getWebsiteSections(): Promise<WebsiteSection[]> {
  const { data } = await apiClient.get<WebsiteSection[]>('/websites/onboarding/sections/');
  return data;
}
