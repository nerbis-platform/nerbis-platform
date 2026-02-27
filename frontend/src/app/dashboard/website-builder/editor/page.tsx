'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Globe,
  Send,
  MessageSquare,
  Check,
  Loader2,
  Palette,
  FileText,
  Eye,
  ArrowLeft,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import {
  getWebsiteConfig,
  updateWebsiteConfig,
  sendChatMessage,
  getChatHistory,
  publishWebsite,
  getOnboardingStatus,
  getPreviewRenderHtml,
  reorderSections,
  addSection,
  removeSection,
  updateThemeData,
  updateSectionVariant,
  suggestSeo,
  uploadWebsiteMedia,
} from '@/lib/api/websites';
import type { WebsiteConfig, ChatResponse } from '@/types';

import LivePreview from '@/components/website-builder/LivePreview';
import DesignPanel from '@/components/website-builder/DesignPanel';
import ContentPanel from '@/components/website-builder/ContentPanel';
import SectionManager from '@/components/website-builder/SectionManager';
import SettingsPanel, { type SiteSettings, type SeoSuggestion } from '@/components/website-builder/SettingsPanel';
import { useTenantContact, useTenant } from '@/contexts/TenantContext';

// ─── Types ───────────────────────────────────────────────────
interface SectionContent {
  title?: string;
  subtitle?: string;
  content?: string;
  cta_text?: string;
  cta_link?: string;
  highlights?: string[];
  items?: Record<string, unknown>[];
  phone?: string;
  email?: string;
  address?: string;
  whatsapp?: string;
  hours?: string;
  [key: string]: unknown;
}

interface ChatMsg {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  section_id?: string;
  created_at?: string;
}

interface ThemeData {
  primary_color: string;
  secondary_color: string;
  font_heading: string;
  font_body: string;
  style: string;
  spacing: string;
  button_style: string;
  animation: string;
  shadow: string;
  color_mode: string;
  bg_color: string;
}

type ActiveTab = 'design' | 'content' | 'settings';

const DEFAULT_THEME: ThemeData = {
  primary_color: '#3b82f6',
  secondary_color: '#10b981',
  font_heading: 'Poppins',
  font_body: 'Inter',
  style: 'modern',
  spacing: 'normal',
  button_style: 'rounded',
  animation: 'fade',
  shadow: 'subtle',
  color_mode: 'light',
  bg_color: '#FFFFFF',
};

const TOP_BAR_HEIGHT = 48;

// ─── Main page ───────────────────────────────────────────────
export default function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNavBack = searchParams.get('nav') === '1';
  const queryClient = useQueryClient();
  const tenantContact = useTenantContact();
  const tenantData = useTenant();
  const hasWhiteLabel = tenantData?.subscription?.is_subscribed ?? false;

  // State
  const [activeTab, setActiveTab] = useState<ActiveTab>('design');
  const [activeSection, setActiveSection] = useState<string>('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [localTheme, setLocalTheme] = useState<ThemeData | null>(null);
  const [localSettings, setLocalSettings] = useState<SiteSettings | null>(null);
  const savedSettingsRef = useRef<SiteSettings | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Queries ─────────────────────────────────────────────
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: getOnboardingStatus,
  });

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['websiteConfig'],
    queryFn: getWebsiteConfig,
    enabled: !!statusData && !['not_started', 'draft'].includes(statusData.status),
  });

  const { data: chatHistory } = useQuery({
    queryKey: ['chatHistory'],
    queryFn: getChatHistory,
    enabled: !!config,
  });

  const {
    data: previewHtml,
    isLoading: previewLoading,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ['previewRender'],
    queryFn: getPreviewRenderHtml,
    enabled: !!config,
  });

  // Redirect if not ready for editor
  // Skip redirect if: user navigated via stepper (?nav=1) OR config already loaded
  useEffect(() => {
    if (statusLoading || !statusData) return;
    if (isNavBack || config) return;
    const { status } = statusData;
    if (status === 'not_started' || status === 'draft') {
      router.push('/dashboard/website-builder');
    } else if (status === 'onboarding') {
      router.push('/dashboard/website-builder/onboarding');
    } else if (status === 'generating') {
      router.push('/dashboard/website-builder/generate');
    }
  }, [statusData, statusLoading, router, isNavBack, config]);

  // Set initial active section
  useEffect(() => {
    if (config?.content_data && !activeSection) {
      const contentSections = Object.keys(config.content_data).filter((k) => k !== '_section_order');
      if (contentSections.length > 0) {
        setActiveSection(contentSections[0]);
      }
    }
  }, [config, activeSection]);

  // Initialize local theme from config
  useEffect(() => {
    if (config && !localTheme) {
      const merged = {
        ...DEFAULT_THEME,
        ...(config.template as { default_theme?: ThemeData })?.default_theme,
        ...(config.theme_data as unknown as ThemeData),
      };
      setLocalTheme(merged);
    }
  }, [config, localTheme]);

  // Initialize local settings from config
  useEffect(() => {
    if (config && !localSettings) {
      const seo = (config.seo_data || {}) as Record<string, unknown>;
      const media = (config.media_data || {}) as Record<string, unknown>;
      const initial: SiteSettings = {
        meta_title: (seo.meta_title as string) || '',
        meta_description: (seo.meta_description as string) || '',
        keywords: (seo.keywords as string[]) || [],
        favicon_url: (media.favicon_url as string) || '',
        og_image_url: (media.og_image_url as string) || (seo.og_image_url as string) || '',
        og_title: (seo.og_title as string) || '',
        og_description: (seo.og_description as string) || '',
        og_inherit_seo: seo.og_inherit_seo !== false,
        social_links: (seo.social_links as SiteSettings['social_links']) || {},
        google_analytics_id: (seo.google_analytics_id as string) || '',
        gtm_id: (seo.gtm_id as string) || '',
        facebook_pixel_id: (seo.facebook_pixel_id as string) || '',
        hotjar_id: (seo.hotjar_id as string) || '',
        custom_head_code: (seo.custom_head_code as string) || '',
        custom_body_code: (seo.custom_body_code as string) || '',
        cookie_banner_enabled: !!seo.cookie_banner_enabled,
        cookie_banner_position: (seo.cookie_banner_position as SiteSettings['cookie_banner_position']) || 'bottom-bar',
        cookie_banner_text: (seo.cookie_banner_text as string) || 'Este sitio usa cookies para mejorar tu experiencia.',
        cookie_accept_label: (seo.cookie_accept_label as string) || 'Aceptar',
        cookie_decline_label: (seo.cookie_decline_label as string) || 'Rechazar',
        // Noindex
        hide_from_search: !!seo.hide_from_search,
        // Verification
        google_site_verification: (seo.google_site_verification as string) || '',
        bing_site_verification: (seo.bing_site_verification as string) || '',
        // Site access
        site_access_mode: (seo.site_access_mode as SiteSettings['site_access_mode']) || 'public',
        site_password: (seo.site_password as string) || '',
        coming_soon_message: (seo.coming_soon_message as string) || '',
        coming_soon_launch_date: (seo.coming_soon_launch_date as string) || '',
        // WhatsApp float
        whatsapp_float_enabled: !!seo.whatsapp_float_enabled,
        whatsapp_float_number: (seo.whatsapp_float_number as string) || '',
        whatsapp_float_message: (seo.whatsapp_float_message as string) || '',
        whatsapp_float_position: (seo.whatsapp_float_position as SiteSettings['whatsapp_float_position']) || 'bottom-right',
        // Schema
        schema_enabled: !!seo.schema_enabled,
        schema_business_type: (seo.schema_business_type as string) || 'LocalBusiness',
      };
      setLocalSettings(initial);
      savedSettingsRef.current = initial;
    }
  }, [config, localSettings]);

  // Load chat history
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      setChatMessages(
        chatHistory.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          section_id: m.section_id,
          created_at: m.created_at,
        }))
      );
    }
  }, [chatHistory]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ─── Mutations ───────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async ({ sectionKey, content }: { sectionKey: string; content: SectionContent }) => {
      if (!config) throw new Error('No config');
      const updatedContent = { ...config.content_data, [sectionKey]: content };
      return updateWebsiteConfig(config.id, { content_data: updatedContent } as Partial<WebsiteConfig>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
      setEditingSection(null);
      refetchPreview();
    },
  });

  const themeMutation = useMutation({
    mutationFn: async (theme: ThemeData) => {
      if (!config) throw new Error('No config');
      return updateThemeData(config.id, theme as unknown as Record<string, string>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
      refetchPreview();
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) => reorderSections(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
      refetchPreview();
    },
  });

  const addSectionMutation = useMutation({
    mutationFn: (sectionId: string) => addSection(sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
      refetchPreview();
    },
  });

  const removeSectionMutation = useMutation({
    mutationFn: (sectionId: string) => removeSection(sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
      refetchPreview();
    },
  });

  const variantMutation = useMutation({
    mutationFn: ({ sectionId, variant }: { sectionId: string; variant: string }) =>
      updateSectionVariant(sectionId, variant),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
      refetchPreview();
    },
  });

  const chatMutation = useMutation({
    mutationFn: ({ message, sectionId }: { message: string; sectionId?: string }) =>
      sendChatMessage(message, sectionId),
    onSuccess: (data: ChatResponse) => {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message, section_id: data.section_id },
      ]);
      if (data.updated_content && data.section_id) {
        queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
        refetchPreview();
      }
    },
  });

  const settingsMutation = useMutation({
    mutationFn: async (s: SiteSettings) => {
      if (!config) throw new Error('No config');
      const seoData = {
        meta_title: s.meta_title,
        meta_description: s.meta_description,
        keywords: s.keywords,
        social_links: s.social_links,
        og_image_url: s.og_image_url,
        og_title: s.og_title || '',
        og_description: s.og_description || '',
        og_inherit_seo: s.og_inherit_seo !== false,
        google_analytics_id: s.google_analytics_id,
        gtm_id: s.gtm_id || '',
        facebook_pixel_id: s.facebook_pixel_id || '',
        hotjar_id: s.hotjar_id || '',
        custom_head_code: s.custom_head_code || '',
        custom_body_code: s.custom_body_code || '',
        cookie_banner_enabled: !!s.cookie_banner_enabled,
        cookie_banner_position: s.cookie_banner_position || 'bottom-bar',
        cookie_banner_text: s.cookie_banner_text || '',
        cookie_accept_label: s.cookie_accept_label || '',
        cookie_decline_label: s.cookie_decline_label || '',
        // Noindex
        hide_from_search: !!s.hide_from_search,
        // Verification
        google_site_verification: s.google_site_verification || '',
        bing_site_verification: s.bing_site_verification || '',
        // Site access
        site_access_mode: s.site_access_mode || 'public',
        site_password: s.site_password || '',
        coming_soon_message: s.coming_soon_message || '',
        coming_soon_launch_date: s.coming_soon_launch_date || '',
        // WhatsApp float
        whatsapp_float_enabled: !!s.whatsapp_float_enabled,
        whatsapp_float_number: s.whatsapp_float_number || '',
        whatsapp_float_message: s.whatsapp_float_message || '',
        whatsapp_float_position: s.whatsapp_float_position || 'bottom-right',
        // Schema
        schema_enabled: !!s.schema_enabled,
        schema_business_type: s.schema_business_type || 'LocalBusiness',
      };
      const mediaData = {
        ...(config.media_data || {}),
        favicon_url: s.favicon_url,
        og_image_url: s.og_image_url,
      };
      return updateWebsiteConfig(config.id, {
        seo_data: seoData,
        media_data: mediaData,
      } as Partial<WebsiteConfig>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
      refetchPreview();
      savedSettingsRef.current = localSettings;
      toast.success('Ajustes guardados correctamente');
    },
  });

  // Unsaved settings indicator
  const hasUnsavedSettings = useMemo(() => {
    if (!localSettings || !savedSettingsRef.current) return false;
    return JSON.stringify(localSettings) !== JSON.stringify(savedSettingsRef.current);
  }, [localSettings]);

  const publishMutation = useMutation({
    mutationFn: () => publishWebsite(),
    onSuccess: () => {
      setPublishSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
      queryClient.invalidateQueries({ queryKey: ['onboardingStatus'] });
    },
  });

  // ─── Handlers ────────────────────────────────────────────
  const handleSendChat = useCallback(() => {
    const msg = chatMessage.trim();
    if (!msg || chatMutation.isPending) return;
    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: msg, section_id: activeSection },
    ]);
    setChatMessage('');
    chatMutation.mutate({ message: msg, sectionId: activeSection || undefined });
  }, [chatMessage, chatMutation, activeSection]);

  const handleThemeChange = useCallback(
    (theme: ThemeData) => {
      setLocalTheme(theme);
    },
    []
  );

  const handleThemeSave = useCallback(() => {
    if (localTheme) {
      themeMutation.mutate(localTheme);
    }
  }, [localTheme, themeMutation]);

  const handleSettingsChange = useCallback((s: SiteSettings) => {
    setLocalSettings(s);
  }, []);

  const handleSettingsSave = useCallback(() => {
    if (localSettings) {
      settingsMutation.mutate(localSettings);
    }
  }, [localSettings, settingsMutation]);

  const handleSuggestSeo = useCallback(async (
    keywords: string[],
    businessName: string,
    currentTitle: string,
    currentDesc: string,
  ): Promise<SeoSuggestion> => {
    // Enrich business name with tagline from hero section
    const contentData = config?.content_data as Record<string, { subtitle?: string }> | undefined;
    const tagline = contentData?.hero?.subtitle || '';
    const enrichedName = tagline ? `${businessName} — ${tagline}` : businessName;
    return suggestSeo(keywords, enrichedName, currentTitle, currentDesc);
  }, [config?.content_data]);

  const handleUploadMedia = useCallback(async (
    file: File,
    purpose: 'og_image' | 'favicon' | 'general',
  ) => {
    return uploadWebsiteMedia(file, purpose);
  }, []);

  const handleSectionClick = useCallback(
    (sectionId: string) => {
      setActiveSection(sectionId);
      setActiveTab('content');
      setPanelCollapsed(false);
    },
    []
  );

  // ─── Loading state ───────────────────────────────────────
  if (statusLoading || configLoading || !config?.content_data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="w-12 h-12 rounded-full bg-[#E2F3F1] flex items-center justify-center mb-4">
          <Loader2 className="h-5 w-5 text-[#95D0C9] animate-spin" />
        </div>
        <p className="text-[0.85rem] text-gray-400">Cargando editor...</p>
      </div>
    );
  }

  // ─── Publish success ─────────────────────────────────────
  if (publishSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#FAFAFA]">
        <div className="w-20 h-20 rounded-full bg-[#E2F3F1] flex items-center justify-center mb-6 animate-[scale-in_0.3s_ease-out]">
          <Check className="h-9 w-9 text-[#1C3B57]" strokeWidth={2.5} />
        </div>

        <h1
          className="text-[1.8rem] sm:text-[2.2rem] leading-[1.1] tracking-[-0.03em] text-center mb-3"
          style={{ color: '#1C3B57', fontWeight: 300 }}
        >
          Tu sitio web
          <br />
          <span style={{ fontWeight: 600 }}>
            ha sido{' '}
            <span className="text-[#95D0C9]">publicado</span>
          </span>
        </h1>

        <p className="text-[0.85rem] text-gray-400 mb-8 text-center max-w-md">
          Tu sitio web ya está en línea y disponible para tus clientes.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="h-11 px-6 rounded-xl border border-gray-200 text-gray-600 text-[0.85rem] font-medium hover:border-gray-300 transition-colors cursor-pointer"
          >
            Ir al dashboard
          </button>
          {config.public_url && (
            <a
              href={config.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 h-11 px-6 rounded-xl text-white text-[0.85rem] font-medium hover:opacity-90 transition-opacity cursor-pointer"
              style={{ background: '#1C3B57' }}
            >
              <Globe className="h-4 w-4" />
              Ver mi sitio
            </a>
          )}
        </div>
      </div>
    );
  }

  // ─── Data ────────────────────────────────────────────────
  const contentData = config.content_data as Record<string, SectionContent>;
  const sectionOrder = (contentData._section_order as unknown as string[]) || [];
  const sections = sectionOrder.length > 0
    ? sectionOrder.filter((s) => s in contentData)
    : Object.keys(contentData).filter((k) => k !== '_section_order');

  const structure = (config.template as { structure_schema?: { sections: { id: string; name: string; required: boolean }[] } })?.structure_schema;
  const allSections = structure?.sections || [];

  const currentContent = activeSection ? contentData[activeSection] : null;
  const currentTheme = localTheme || DEFAULT_THEME;
  // Reset target: the theme the user saved (onboarding/server), falling back to template default
  const savedTheme: ThemeData = {
    ...DEFAULT_THEME,
    ...((config.template as { default_theme?: ThemeData })?.default_theme || {}),
    ...((config.theme_data as unknown as ThemeData) || {}),
  };

  const railItems: { id: ActiveTab; label: string; icon: typeof Palette }[] = [
    { id: 'design', label: 'Diseño', icon: Palette },
    { id: 'content', label: 'Contenido', icon: FileText },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  const tenantName = (config as { tenant?: { name?: string } })?.tenant?.name
    || (config.template as { name?: string })?.name
    || 'Mi sitio';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ─── Top bar ────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 border-b border-gray-200/80 bg-white shrink-0"
        style={{ height: TOP_BAR_HEIGHT }}
      >
        {/* Left: Logo + back + site name */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/website-builder?nav=1')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <Image
              src="/Isotipo_color_GRAVITIFY.png"
              alt="Gravitify"
              width={24}
              height={24}
            />
          </button>
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200">
            <span className="text-[0.78rem] font-medium text-[#1C3B57] truncate max-w-[180px]">
              {tenantName}
            </span>
            <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-[#E2F3F1] text-[#1C3B57] font-medium">
              Editor
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Save theme button (only in design tab) */}
          {activeTab === 'design' && localTheme && (
            <button
              type="button"
              onClick={handleThemeSave}
              disabled={themeMutation.isPending}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[0.78rem] font-medium border border-[#95D0C9] text-[#1C3B57] hover:bg-[#E2F3F1] transition-colors cursor-pointer disabled:opacity-50"
            >
              {themeMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">Guardar diseño</span>
            </button>
          )}

          {/* Save settings button (only in settings tab) */}
          {activeTab === 'settings' && localSettings && (
            <button
              type="button"
              onClick={handleSettingsSave}
              disabled={settingsMutation.isPending}
              className="relative flex items-center gap-1.5 h-8 px-3 rounded-md text-[0.78rem] font-medium border border-[#95D0C9] text-[#1C3B57] hover:bg-[#E2F3F1] transition-colors cursor-pointer disabled:opacity-50"
            >
              {hasUnsavedSettings && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#95D0C9] rounded-full animate-pulse" />
              )}
              {settingsMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">Guardar ajustes</span>
            </button>
          )}

          {/* Publish button */}
          <button
            type="button"
            onClick={() => setShowPublishDialog(true)}
            className="flex items-center gap-1.5 h-8 px-4 rounded-md text-white text-[0.78rem] font-medium hover:opacity-90 transition-opacity cursor-pointer"
            style={{ background: '#1C3B57' }}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Publicar</span>
          </button>
        </div>
      </div>

      {/* ─── Workspace: Icon Rail + Left Panel + Preview ────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ─── Icon Rail (56px) ─────────────────────────────────── */}
        <div className="w-14 shrink-0 bg-white border-r border-gray-100 flex-col items-center py-3 hidden md:flex">
          <div className="flex flex-col items-center gap-1">
            {railItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  if (panelCollapsed) setPanelCollapsed(false);
                }}
                title={label}
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors cursor-pointer ${
                  activeTab === id && !panelCollapsed
                    ? 'bg-[#E2F3F1] text-[#1C3B57]'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[0.55rem] font-medium mt-0.5 leading-none truncate w-full text-center">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Left Panel (340px, collapsible) ──────────────────── */}
        <div
          className={`shrink-0 border-r border-gray-100 bg-white hidden md:flex md:flex-col transition-all duration-300 overflow-hidden ${
            panelCollapsed ? 'w-0 border-r-0' : 'w-[340px]'
          }`}
        >
          {/* Panel header with tab name + collapse */}
          <div className="w-[340px] flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
            <span className="text-[0.75rem] font-semibold text-[#1C3B57] uppercase tracking-wider">
              {railItems.find((r) => r.id === activeTab)?.label}
            </span>
            <button
              type="button"
              onClick={() => setPanelCollapsed(true)}
              title="Ocultar panel"
              className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="w-[340px] flex-1 overflow-y-auto p-4">
            {/* ─── Content Tab ──────────────────────── */}
            {activeTab === 'content' && (
              <>
                <SectionManager
                  sections={sections}
                  allSections={allSections}
                  activeSection={activeSection}
                  onSelectSection={(id) => {
                    setActiveSection(id);
                    setEditingSection(null);
                  }}
                  onReorder={(order) => reorderMutation.mutate(order)}
                  onAdd={(id) => addSectionMutation.mutate(id)}
                  onRemove={(id) => removeSectionMutation.mutate(id)}
                />

                <hr className="my-4 border-gray-100" />

                {currentContent ? (
                  <ContentPanel
                    sectionKey={activeSection}
                    content={currentContent}
                    isEditing={editingSection === activeSection}
                    isSaving={saveMutation.isPending}
                    onStartEdit={() => setEditingSection(activeSection)}
                    onSaveEdit={(content) => {
                      saveMutation.mutate({ sectionKey: activeSection, content });
                    }}
                    onCancelEdit={() => setEditingSection(null)}
                    onVariantChange={(variant) => {
                      variantMutation.mutate({ sectionId: activeSection, variant });
                    }}
                    isVariantLoading={variantMutation.isPending}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Eye className="h-8 w-8 text-gray-300 mb-3" />
                    <p className="text-[0.85rem] text-gray-500 font-medium mb-1">
                      Selecciona una sección
                    </p>
                    <p className="text-[0.75rem] text-gray-400">
                      Haz clic en una sección de arriba o en el preview para editarla
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ─── Design Tab ───────────────────────── */}
            {activeTab === 'design' && (
              <DesignPanel
                themeData={currentTheme}
                defaultTheme={savedTheme}
                onChange={handleThemeChange}
                isSaving={themeMutation.isPending}
              />
            )}

            {/* ─── Settings Tab ─────────────────────── */}
            {activeTab === 'settings' && localSettings && (
              <SettingsPanel
                settings={localSettings}
                siteName={tenantName}
                siteUrl={config.public_url ? config.public_url.replace('https://', '') : undefined}
                isPublished={config.is_published}
                tenantPhone={tenantContact?.phone}
                tenantCountry={tenantContact?.country}
                hasWhiteLabel={hasWhiteLabel}
                onChange={handleSettingsChange}
                onSuggestSeo={handleSuggestSeo}
                onUploadMedia={handleUploadMedia}
              />
            )}
          </div>
        </div>

        {/* ─── Live Preview (flex-1, maximized) ─────────────────── */}
        <div className="flex-1 min-w-0 relative">
          <LivePreview
            htmlContent={previewHtml || null}
            isLoading={previewLoading}
            onSectionClick={handleSectionClick}
            onRefresh={() => refetchPreview()}
            themeOverrides={localTheme || undefined}
            siteName={localSettings?.meta_title || tenantName}
            faviconUrl={localSettings?.favicon_url || ''}
            siteUrl={config.public_url ? config.public_url.replace('https://', '') : ''}
          />
        </div>
      </div>

      {/* ─── FAB + Floating Chat (bottom-right) ─────────────────── */}
      <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col items-end gap-3">
        {/* Chat panel (appears above FAB) */}
        {chatOpen && (
          <div className="w-[340px] sm:w-[380px] h-[480px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0 bg-[#1C3B57]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[0.82rem] font-semibold text-white">Asistente IA</p>
                  {activeSection && (
                    <p className="text-[0.6rem] text-white/60">
                      Editando: {activeSection}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4 text-white/70" />
              </button>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {chatMessages.length === 0 && (
                <div className="text-center py-6">
                  <div className="w-10 h-10 rounded-full bg-[#E2F3F1] flex items-center justify-center mx-auto mb-2">
                    <MessageSquare className="h-4 w-4 text-[#95D0C9]" />
                  </div>
                  <p className="text-[0.78rem] text-gray-500 font-medium mb-1">
                    Chatea con la IA
                  </p>
                  <p className="text-[0.68rem] text-gray-400 max-w-[200px] mx-auto">
                    Pídele que cambie textos, ajuste el tono, o modifique cualquier sección.
                  </p>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-[0.8rem] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#1C3B57] text-white rounded-br-sm'
                        : 'bg-gray-50 text-gray-700 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="px-3.5 py-2.5 rounded-xl rounded-bl-sm bg-gray-50">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="px-4 py-3 border-t border-gray-100 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder={`Ej: "Cambia el título a algo más llamativo"`}
                  rows={1}
                  className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-[0.82rem] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 transition-colors"
                  style={{ maxHeight: '80px' }}
                />
                <button
                  type="button"
                  onClick={handleSendChat}
                  disabled={!chatMessage.trim() || chatMutation.isPending}
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-30 cursor-pointer shrink-0"
                  style={{ background: '#1C3B57' }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAB button */}
        <button
          type="button"
          onClick={() => setChatOpen(!chatOpen)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all cursor-pointer hover:scale-105 ${
            chatOpen
              ? 'bg-gray-600 hover:bg-gray-700'
              : 'bg-[#1C3B57] hover:bg-[#15304a]'
          }`}
        >
          {chatOpen ? (
            <X className="h-5 w-5 text-white" />
          ) : (
            <MessageSquare className="h-5 w-5 text-white" />
          )}
        </button>
      </div>

      {/* ─── Mobile: bottom tab bar ────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-3 py-2 z-30">
        <div className="flex gap-1">
          {railItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                setMobileDrawerOpen(true);
              }}
              className={`flex-1 flex flex-col items-center justify-center h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === id && mobileDrawerOpen
                  ? 'bg-[#1C3B57] text-white'
                  : 'bg-white text-gray-500'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[0.55rem] font-medium mt-0.5">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Mobile: drawer overlay ────────────────────────────── */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto">
            {/* Drawer header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-3 flex items-center justify-between rounded-t-2xl z-10">
              <span className="text-[0.85rem] font-semibold text-[#1C3B57]">
                {railItems.find((r) => r.id === activeTab)?.label}
              </span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Drawer content */}
            <div className="p-4">
              {activeTab === 'content' && (
                <>
                  <SectionManager
                    sections={sections}
                    allSections={allSections}
                    activeSection={activeSection}
                    onSelectSection={(id) => {
                      setActiveSection(id);
                      setEditingSection(null);
                    }}
                    onReorder={(order) => reorderMutation.mutate(order)}
                    onAdd={(id) => addSectionMutation.mutate(id)}
                    onRemove={(id) => removeSectionMutation.mutate(id)}
                  />
                  <hr className="my-4 border-gray-100" />
                  {currentContent ? (
                    <ContentPanel
                      sectionKey={activeSection}
                      content={currentContent}
                      isEditing={editingSection === activeSection}
                      isSaving={saveMutation.isPending}
                      onStartEdit={() => setEditingSection(activeSection)}
                      onSaveEdit={(content) => {
                        saveMutation.mutate({ sectionKey: activeSection, content });
                      }}
                      onCancelEdit={() => setEditingSection(null)}
                      onVariantChange={(variant) => {
                        variantMutation.mutate({ sectionId: activeSection, variant });
                      }}
                      isVariantLoading={variantMutation.isPending}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Eye className="h-8 w-8 text-gray-300 mb-3" />
                      <p className="text-[0.85rem] text-gray-500 font-medium mb-1">
                        Selecciona una sección
                      </p>
                      <p className="text-[0.75rem] text-gray-400">
                        Toca una sección de arriba para editarla
                      </p>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'design' && (
                <DesignPanel
                  themeData={currentTheme}
                  defaultTheme={savedTheme}
                  onChange={handleThemeChange}
                  isSaving={themeMutation.isPending}
                />
              )}

              {activeTab === 'settings' && localSettings && (
                <SettingsPanel
                  settings={localSettings}
                  siteName={tenantName}
                  siteUrl={config.public_url ? config.public_url.replace('https://', '') : undefined}
                  isPublished={config.is_published}
                  tenantPhone={tenantContact?.phone}
                  tenantCountry={tenantContact?.country}
                  hasWhiteLabel={hasWhiteLabel}
                  onChange={handleSettingsChange}
                  onSuggestSeo={handleSuggestSeo}
                  onUploadMedia={handleUploadMedia}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Publish confirmation dialog ──────────────────────── */}
      {showPublishDialog && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#E2F3F1] flex items-center justify-center mx-auto mb-4">
              <Globe className="h-6 w-6 text-[#1C3B57]" />
            </div>

            <h3 className="text-[1.1rem] font-semibold text-[#1C3B57] mb-2">
              Publicar tu sitio web
            </h3>
            <p className="text-[0.82rem] text-gray-500 mb-6">
              Tu sitio web será visible públicamente. Podrás seguir editándolo después de publicar.
            </p>

            <div className="flex items-center gap-3 justify-center">
              <button
                type="button"
                onClick={() => setShowPublishDialog(false)}
                className="h-10 px-5 rounded-lg border border-gray-200 text-gray-500 text-[0.82rem] font-medium hover:border-gray-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setShowPublishDialog(false); publishMutation.mutate(); }}
                disabled={publishMutation.isPending}
                className="flex items-center gap-2 h-10 px-5 rounded-lg text-white text-[0.82rem] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                style={{ background: '#1C3B57' }}
              >
                {publishMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                Publicar ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
