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
  ArrowLeft,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Undo2,
  Redo2,
  Cloud,
  CloudOff,
  AlertCircle,
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
  duplicateSection,
  updateThemeData,
  updateSectionVariant,
  suggestSeo,
  uploadWebsiteMedia,
} from '@/lib/api/websites';
import type { WebsiteConfig, ChatResponse, PagesData, SitePage } from '@/types';
import { useAutoSave, type AutoSaveStatus } from '@/hooks/useAutoSave';

import LivePreview from '@/components/website-builder/LivePreview';
import DesignPanel from '@/components/website-builder/DesignPanel';
import ContentPanel from '@/components/website-builder/ContentPanel';
import SectionManager from '@/components/website-builder/SectionManager';
import PageManager from '@/components/website-builder/PageManager';
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
  const [activePage, setActivePage] = useState<string>('home');
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [localTheme, setLocalTheme] = useState<ThemeData | null>(null);
  const [localSettings, setLocalSettings] = useState<SiteSettings | null>(null);
  const [savedSettings, setSavedSettings] = useState<SiteSettings | null>(null);
  const [savedTheme, setSavedTheme] = useState<ThemeData | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [contentOverrides, setContentOverrides] = useState<Record<string, Record<string, unknown>>>({});
  const [hasUnsavedContent, setHasUnsavedContent] = useState(false);
  const contentSaveRef = useRef<(() => void) | null>(null);
  const contentSetRef = useRef<((c: SectionContent) => void) | null>(null);

  // ─── Global Undo / Redo ─────────────────────────────────
  type HistoryEntry =
    | { type: 'theme'; before: ThemeData; after: ThemeData }
    | { type: 'content'; section: string; before: SectionContent; after: SectionContent }
    | { type: 'settings'; before: SiteSettings; after: SiteSettings };

  const globalHistoryRef = useRef<HistoryEntry[]>([]);
  const globalPointerRef = useRef(-1);
  const globalUndoingRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Track previous states for computing "before" snapshots
  const prevThemeRef = useRef<ThemeData | null>(null);
  const prevSettingsRef = useRef<SiteSettings | null>(null);
  const prevContentRef = useRef<SectionContent | null>(null);

  // Content debounce (groups rapid keystrokes into single undo entry)
  const contentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentBeforeRef = useRef<SectionContent | null>(null); // "before" state for debounced batch

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
    queryKey: ['previewRender', activePage],
    queryFn: () => getPreviewRenderHtml(activePage),
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
      setSavedTheme(merged);
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
      setSavedSettings(initial);
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
  const isAutoSaveRef = useRef(false);

  const saveMutation = useMutation({
    mutationFn: async ({ sectionKey, content, mediaUpdates, seoUpdates }: {
      sectionKey: string;
      content: SectionContent;
      mediaUpdates?: Record<string, unknown>;
      seoUpdates?: Record<string, unknown>;
    }) => {
      if (!config) throw new Error('No config');

      const updates: Record<string, unknown> = {};

      // Always update content_data
      updates.content_data = { ...config.content_data, [sectionKey]: content };

      // If pages_data exists, also update the right location there
      const currentPagesData = (config.pages_data as PagesData) || null;
      if (currentPagesData) {
        // Header and footer are always global, even if not listed in global.sections
        const isGlobal = sectionKey === 'header' || sectionKey === 'footer'
          || currentPagesData.global?.sections?.includes(sectionKey);
        if (isGlobal) {
          const globalSections = currentPagesData.global?.sections || [];
          const updatedSections = globalSections.includes(sectionKey)
            ? globalSections
            : [...globalSections, sectionKey];
          updates.pages_data = {
            ...currentPagesData,
            global: {
              ...currentPagesData.global,
              sections: updatedSections,
              content: { ...(currentPagesData.global?.content || {}), [sectionKey]: content },
            },
          };
        } else {
          updates.pages_data = {
            ...currentPagesData,
            pages: currentPagesData.pages.map(p =>
              p.id === activePage && p.sections.includes(sectionKey)
                ? { ...p, content: { ...(p.content || {}), [sectionKey]: content } }
                : p
            ),
          };
        }
      }

      // Include media_data updates (e.g., logo_url from header editor)
      if (mediaUpdates && Object.keys(mediaUpdates).length > 0) {
        updates.media_data = { ...(config.media_data || {}), ...mediaUpdates };
      }

      // Include seo_data updates (e.g., social_links from footer editor)
      if (seoUpdates && Object.keys(seoUpdates).length > 0) {
        updates.seo_data = { ...(config.seo_data || {}), ...seoUpdates };
      }

      return updateWebsiteConfig(config.id, updates as Partial<WebsiteConfig>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
      setContentOverrides({});
      refetchPreview();
    },
    onError: (err) => {
      console.error('Save failed:', err);
      if (!isAutoSaveRef.current) {
        toast.error('Error al guardar los cambios');
      }
    },
  });

  const themeMutation = useMutation({
    mutationFn: async (theme: ThemeData) => {
      if (!config) throw new Error('No config');
      return updateThemeData(config.id, theme as unknown as Record<string, string>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
      setSavedTheme(localTheme);
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
    mutationFn: ({ sectionId, initialContent, variant }: { sectionId: string; initialContent?: Record<string, unknown>; variant?: string }) =>
      addSection(sectionId, initialContent, variant),
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

  const duplicateSectionMutation = useMutation({
    mutationFn: (sectionId: string) => duplicateSection(sectionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
      refetchPreview();
      setActiveSection(data.new_section_id);
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
      setSavedSettings(localSettings);
      if (!isAutoSaveRef.current) {
        toast.success('Ajustes guardados correctamente');
      }
      isAutoSaveRef.current = false;
    },
  });

  // Unsaved settings indicator
  const hasUnsavedSettings = useMemo(() => {
    if (!localSettings || !savedSettings) return false;
    return JSON.stringify(localSettings) !== JSON.stringify(savedSettings);
  }, [localSettings, savedSettings]);

  // Unsaved theme indicator
  const hasUnsavedTheme = useMemo(() => {
    if (!localTheme || !savedTheme) return false;
    return JSON.stringify(localTheme) !== JSON.stringify(savedTheme);
  }, [localTheme, savedTheme]);

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
      if (!globalUndoingRef.current && prevThemeRef.current) {
        const before = structuredClone(prevThemeRef.current);
        const after = structuredClone(theme);
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          const stack = globalHistoryRef.current.slice(0, globalPointerRef.current + 1);
          stack.push({ type: 'theme', before, after });
          if (stack.length > 50) stack.shift();
          globalHistoryRef.current = stack;
          globalPointerRef.current = stack.length - 1;
          setCanUndo(true);
          setCanRedo(false);
        }
      }
      prevThemeRef.current = structuredClone(theme);
      setLocalTheme(theme);
    },
    []
  );

  const handleThemeSave = useCallback(() => {
    if (localTheme) {
      return new Promise<void>((resolve, reject) => {
        themeMutation.mutate(localTheme, {
          onSuccess: () => resolve(),
          onError: (err) => reject(err),
        });
      });
    }
    return Promise.resolve();
  }, [localTheme, themeMutation]);

  const handleSettingsChange = useCallback((s: SiteSettings) => {
    if (!globalUndoingRef.current && prevSettingsRef.current) {
      const before = structuredClone(prevSettingsRef.current);
      const after = structuredClone(s);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        const stack = globalHistoryRef.current.slice(0, globalPointerRef.current + 1);
        stack.push({ type: 'settings', before, after });
        if (stack.length > 50) stack.shift();
        globalHistoryRef.current = stack;
        globalPointerRef.current = stack.length - 1;
        setCanUndo(true);
        setCanRedo(false);
      }
    }
    prevSettingsRef.current = structuredClone(s);
    setLocalSettings(s);
  }, []);

  const handleSettingsSave = useCallback(() => {
    if (localSettings) {
      return new Promise<void>((resolve, reject) => {
        settingsMutation.mutate(localSettings, {
          onSuccess: () => resolve(),
          onError: (err) => reject(err),
        });
      });
    }
    return Promise.resolve();
  }, [localSettings, settingsMutation]);

  // ─── Auto-save ──────────────────────────────────────────
  const handleContentAutoSave = useCallback(async () => {
    isAutoSaveRef.current = true;
    contentSaveRef.current?.();
  }, []);

  const handleThemeAutoSave = useCallback(async () => {
    isAutoSaveRef.current = true;
    await handleThemeSave();
  }, [handleThemeSave]);

  const handleSettingsAutoSave = useCallback(async () => {
    isAutoSaveRef.current = true;
    await handleSettingsSave();
  }, [handleSettingsSave]);

  const contentAutoSave = useAutoSave({ onSave: handleContentAutoSave, hasChanges: hasUnsavedContent });
  const themeAutoSave = useAutoSave({ onSave: handleThemeAutoSave, hasChanges: hasUnsavedTheme });
  const settingsAutoSave = useAutoSave({ onSave: handleSettingsAutoSave, hasChanges: hasUnsavedSettings });

  // Composite auto-save status (worst of the three)
  const compositeAutoSaveStatus: AutoSaveStatus = (() => {
    const statuses = [contentAutoSave.status, themeAutoSave.status, settingsAutoSave.status];
    if (statuses.includes('error')) return 'error';
    if (statuses.includes('saving')) return 'saving';
    if (statuses.includes('unsaved')) return 'unsaved';
    if (statuses.includes('saved')) return 'saved';
    return 'idle';
  })();

  const handleSaveAllNow = useCallback(() => {
    if (hasUnsavedContent) contentSaveRef.current?.();
    if (hasUnsavedTheme) handleThemeSave();
    if (hasUnsavedSettings) handleSettingsSave();
  }, [hasUnsavedContent, hasUnsavedTheme, hasUnsavedSettings, handleThemeSave, handleSettingsSave]);

  // Show a one-time toast the first time auto-save triggers
  const autoSaveToastShown = useRef(false);
  useEffect(() => {
    if (compositeAutoSaveStatus === 'saving' && !autoSaveToastShown.current) {
      autoSaveToastShown.current = true;
      toast('Los cambios se guardan automaticamente', {
        icon: <Cloud className="h-4 w-4 text-emerald-500" />,
        duration: 4000,
      });
    }
  }, [compositeAutoSaveStatus]);

  const handleFieldChange = useCallback((sectionKey: string, field: string, value: unknown) => {
    setContentOverrides(prev => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] || {}), [field]: value },
    }));
  }, []);

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

  const handleAddPage = useCallback(
    (newPage: SitePage) => {
      if (!config) return;
      const currentPages = (config.pages_data as PagesData) || { global: { sections: [], content: {} }, pages: [] };
      const updatedPagesData: PagesData = {
        ...currentPages,
        pages: [...(currentPages.pages || []), newPage],
      };
      updateWebsiteConfig(config.id, { pages_data: updatedPagesData } as Partial<WebsiteConfig>)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
          setActivePage(newPage.id);
        })
        .catch(() => toast.error('Error al agregar la página'));
    },
    [config, queryClient]
  );

  const handleRemovePage = useCallback(
    (pageId: string) => {
      if (!config) return;
      const currentPages = (config.pages_data as PagesData) || { global: { sections: [], content: {} }, pages: [] };
      const updatedPagesData: PagesData = {
        ...currentPages,
        pages: (currentPages.pages || []).filter((p) => p.id !== pageId),
      };
      updateWebsiteConfig(config.id, { pages_data: updatedPagesData } as Partial<WebsiteConfig>)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['websiteConfig'] });
          if (activePage === pageId) setActivePage('home');
        })
        .catch(() => toast.error('Error al eliminar la página'));
    },
    [config, activePage, queryClient]
  );

  const handleUpdatePages = useCallback(
    (updatedPagesData: PagesData) => {
      if (!config) return;
      updateWebsiteConfig(config.id, { pages_data: updatedPagesData } as Partial<WebsiteConfig>)
        .then(() => queryClient.invalidateQueries({ queryKey: ['websiteConfig'] }))
        .catch(() => toast.error('Error al actualizar páginas'));
    },
    [config, queryClient]
  );

  // ─── Global Undo / Redo ─────────────────────────────────

  // Initialize "previous" refs once data loads (prevents init from being treated as change)
  const prevThemeInitRef = useRef(false);
  useEffect(() => {
    if (localTheme && !prevThemeInitRef.current) {
      prevThemeInitRef.current = true;
      prevThemeRef.current = structuredClone(localTheme);
    }
  }, [localTheme]);

  const prevSettingsInitRef = useRef(false);
  useEffect(() => {
    if (localSettings && !prevSettingsInitRef.current) {
      prevSettingsInitRef.current = true;
      prevSettingsRef.current = structuredClone(localSettings);
    }
  }, [localSettings]);

  // Initialize prevContentRef when section changes
  useEffect(() => {
    const initialContent = config?.content_data?.[activeSection] || {};
    prevContentRef.current = structuredClone(initialContent) as SectionContent;
    contentBeforeRef.current = null;
    if (contentDebounceRef.current) {
      clearTimeout(contentDebounceRef.current);
      contentDebounceRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // Flush pending content change → push to global history
  const flushContentDebounce = useCallback(() => {
    if (contentDebounceRef.current) {
      clearTimeout(contentDebounceRef.current);
      contentDebounceRef.current = null;
    }
    const before = contentBeforeRef.current;
    const after = prevContentRef.current;
    if (!before || !after) return;
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    const stack = globalHistoryRef.current.slice(0, globalPointerRef.current + 1);
    stack.push({ type: 'content', section: activeSection, before: structuredClone(before), after: structuredClone(after) });
    if (stack.length > 50) stack.shift();
    globalHistoryRef.current = stack;
    globalPointerRef.current = stack.length - 1;
    setCanUndo(true);
    setCanRedo(false);
    contentBeforeRef.current = null;
  }, [activeSection]);

  // Called by ContentPanel on every content change
  const handleContentChange = useCallback((content: SectionContent) => {
    if (globalUndoingRef.current) {
      globalUndoingRef.current = false;
      return;
    }
    // Capture "before" state at start of debounce batch
    if (!contentBeforeRef.current) {
      contentBeforeRef.current = prevContentRef.current ? structuredClone(prevContentRef.current) : structuredClone(content);
    }
    prevContentRef.current = structuredClone(content);
    if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
    contentDebounceRef.current = setTimeout(() => flushContentDebounce(), 500);
  }, [flushContentDebounce]);

  // Global undo
  const globalUndo = useCallback(() => {
    // Flush any pending content debounce first
    flushContentDebounce();
    if (globalPointerRef.current < 0) return;
    const entry = globalHistoryRef.current[globalPointerRef.current];
    globalPointerRef.current -= 1;
    globalUndoingRef.current = true;

    switch (entry.type) {
      case 'theme':
        prevThemeRef.current = structuredClone(entry.before);
        setLocalTheme(structuredClone(entry.before));
        break;
      case 'content': {
        const restored = structuredClone(entry.before);
        prevContentRef.current = restored;
        // If same section, apply directly; otherwise switch section
        if (entry.section === activeSection) {
          contentSetRef.current?.(restored);
        } else {
          setActiveTab('content');
          setActiveSection(entry.section);
          // Queue apply for after section switch
          setTimeout(() => { contentSetRef.current?.(restored); }, 50);
        }
        setContentOverrides(prev => ({ ...prev, [entry.section]: restored as Record<string, unknown> }));
        break;
      }
      case 'settings':
        prevSettingsRef.current = structuredClone(entry.before);
        setLocalSettings(structuredClone(entry.before));
        break;
    }
    globalUndoingRef.current = false;
    setCanUndo(globalPointerRef.current >= 0);
    setCanRedo(true);
  }, [activeSection, flushContentDebounce]);

  // Global redo
  const globalRedo = useCallback(() => {
    if (globalPointerRef.current >= globalHistoryRef.current.length - 1) return;
    globalPointerRef.current += 1;
    const entry = globalHistoryRef.current[globalPointerRef.current];
    globalUndoingRef.current = true;

    switch (entry.type) {
      case 'theme':
        prevThemeRef.current = structuredClone(entry.after);
        setLocalTheme(structuredClone(entry.after));
        break;
      case 'content': {
        const restored = structuredClone(entry.after);
        prevContentRef.current = restored;
        if (entry.section === activeSection) {
          contentSetRef.current?.(restored);
        } else {
          setActiveTab('content');
          setActiveSection(entry.section);
          setTimeout(() => { contentSetRef.current?.(restored); }, 50);
        }
        setContentOverrides(prev => ({ ...prev, [entry.section]: restored as Record<string, unknown> }));
        break;
      }
      case 'settings':
        prevSettingsRef.current = structuredClone(entry.after);
        setLocalSettings(structuredClone(entry.after));
        break;
    }
    globalUndoingRef.current = false;
    setCanUndo(true);
    setCanRedo(globalPointerRef.current < globalHistoryRef.current.length - 1);
  }, [activeSection]);

  // Global keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z / Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) globalRedo();
        else globalUndo();
      } else if (e.key === 's') {
        e.preventDefault();
        handleSaveAllNow();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [globalUndo, globalRedo, handleSaveAllNow]);

  // ─── Loading state ───────────────────────────────────────
  if (statusLoading || configLoading || !config?.content_data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="w-12 h-12 rounded-full bg-[#E2F3F1] flex items-center justify-center mb-4">
          <Loader2 className="h-5 w-5 text-[#0D9488] animate-spin" />
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
            <span className="text-[#0D9488]">publicado</span>
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
  const templateIndustry = config.template_industry || 'generic';
  const contentData = config.content_data as Record<string, SectionContent>;
  const sectionOrder = (contentData._section_order as unknown as string[]) || [];
  const sections = sectionOrder.length > 0
    ? sectionOrder.filter((s) => s in contentData)
    : Object.keys(contentData).filter((k) => k !== '_section_order');

  const rawPagesData = (config.pages_data as PagesData) || null;

  // Normalize pagesData: ensure global.sections always includes header/footer
  const pagesData = (() => {
    if (!rawPagesData) return null;
    const globalSections = rawPagesData.global?.sections || [];
    const needsHeader = !globalSections.includes('header');
    const needsFooter = !globalSections.includes('footer');
    if (!needsHeader && !needsFooter) return rawPagesData;
    return {
      ...rawPagesData,
      global: {
        ...rawPagesData.global,
        sections: [
          ...(needsHeader ? ['header'] : []),
          ...globalSections,
          ...(needsFooter ? ['footer'] : []),
        ],
      },
    };
  })();

  const structure = (config.template as { structure_schema?: { sections: { id: string; name: string; required: boolean }[] } })?.structure_schema;
  const allSections = structure?.sections || [];

  // Resolve content for active section: look in pages_data first, then content_data fallback
  const currentContent: SectionContent | null = (() => {
    if (!activeSection) return null;
    if (pagesData) {
      const globalContent = pagesData.global?.content?.[activeSection];
      if (globalContent) return globalContent as SectionContent;
      const page = pagesData.pages?.find((p) => p.id === activePage);
      const pageContent = page?.content?.[activeSection];
      if (pageContent) return pageContent as SectionContent;
    }
    // Fallback to content_data; for header/footer always return at least {}
    const fallback = contentData[activeSection];
    if (fallback) return fallback;
    if (activeSection === 'header' || activeSection === 'footer') return {} as SectionContent;
    return null;
  })();
  const currentTheme = localTheme || DEFAULT_THEME;
  // Reset target: the theme the user saved (onboarding/server), falling back to template default
  const defaultThemeFromServer: ThemeData = {
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
              src="/Isotipo_color_NERBIS.png"
              alt="Nerbis"
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

        {/* Right: Auto-save indicator + Actions */}
        <div className="flex items-center gap-3">
          {/* Auto-save status */}
          <div className="flex items-center gap-1.5 text-[0.72rem] transition-opacity duration-300" style={{ opacity: compositeAutoSaveStatus === 'idle' ? 0 : 1 }}>
            {compositeAutoSaveStatus === 'saving' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                <span className="text-gray-400 hidden sm:inline">Guardando...</span>
              </>
            )}
            {compositeAutoSaveStatus === 'saved' && (
              <>
                <Cloud className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600 hidden sm:inline">Guardado</span>
              </>
            )}
            {compositeAutoSaveStatus === 'unsaved' && (
              <>
                <CloudOff className="h-3 w-3 text-gray-400" />
                <span className="text-gray-400 hidden sm:inline">Sin guardar</span>
              </>
            )}
            {compositeAutoSaveStatus === 'error' && (
              <button
                type="button"
                onClick={handleSaveAllNow}
                className="flex items-center gap-1 text-red-500 hover:text-red-600 cursor-pointer"
              >
                <AlertCircle className="h-3 w-3" />
                <span className="hidden sm:inline">Error</span>
                <span className="underline hidden sm:inline">Reintentar</span>
              </button>
            )}
          </div>

          {/* Publish button */}
          <button
            type="button"
            onClick={() => setShowPublishDialog(true)}
            className="relative flex items-center gap-1.5 h-8 px-4 rounded-md text-white text-[0.78rem] font-medium hover:opacity-90 transition-opacity cursor-pointer"
            style={{ background: '#1C3B57' }}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Publicar</span>
            {config.has_unpublished_changes && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
            )}
          </button>
        </div>
      </div>

      {/* ─── Workspace: Icon Rail + Left Panel + Preview ────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ─── Icon Rail (56px) ─────────────────────────────────── */}
        <div className="w-14 shrink-0 bg-white border-r border-gray-100 flex-col items-center py-3 hidden md:flex">
          <div className="flex flex-col items-center gap-1">
            {railItems.map(({ id, label, icon: Icon }) => {
              const hasChanges =
                (id === 'design' && hasUnsavedTheme) ||
                (id === 'content' && hasUnsavedContent) ||
                (id === 'settings' && hasUnsavedSettings);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveTab(id);
                    if (panelCollapsed) setPanelCollapsed(false);
                  }}
                  title={hasChanges ? `${label} — cambios sin guardar` : label}
                  className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors cursor-pointer ${
                    activeTab === id && !panelCollapsed
                      ? 'bg-[#E2F3F1] text-[#1C3B57]'
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[0.55rem] font-medium mt-0.5 leading-none truncate w-full text-center">{label}</span>
                  {hasChanges && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Left Panel (340px, collapsible) ──────────────────── */}
        <div
          className={`shrink-0 border-r border-gray-100 bg-white hidden md:flex md:flex-col transition-all duration-300 overflow-hidden ${
            panelCollapsed ? 'w-0 border-r-0' : 'w-[340px]'
          }`}
        >
          {/* Panel header with tab name + undo/redo + collapse */}
          <div className="w-[340px] flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
            <span className="text-[0.75rem] font-semibold text-[#1C3B57] uppercase tracking-wider">
              {railItems.find((r) => r.id === activeTab)?.label}
            </span>
            <div className="flex items-center gap-0.5">
              {/* Undo / Redo — global, always visible */}
              <button
                type="button"
                onClick={globalUndo}
                disabled={!canUndo}
                title="Deshacer (Ctrl+Z)"
                className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-default text-gray-400 hover:text-[#1C3B57] hover:bg-[#E2F3F1]/40"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={globalRedo}
                disabled={!canRedo}
                title="Rehacer (Ctrl+Shift+Z)"
                className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-default text-gray-400 hover:text-[#1C3B57] hover:bg-[#E2F3F1]/40"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button
                type="button"
                onClick={() => setPanelCollapsed(true)}
                title="Ocultar panel"
                className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="w-[340px] flex-1 overflow-y-auto p-4">
            {/* ─── Content Tab ──────────────────────── */}
            {activeTab === 'content' && (
              <>
                {pagesData ? (
                  <PageManager
                    pagesData={pagesData}
                    activePage={activePage}
                    activeSection={activeSection}
                    allSections={allSections}
                    editorContent={currentContent ? (
                      <ContentPanel
                        sectionKey={activeSection}
                        content={currentContent}
                        onSaveEdit={(content, mediaUpdates, seoUpdates) => {
                          saveMutation.mutate({ sectionKey: activeSection, content, mediaUpdates, seoUpdates });
                        }}
                        onVariantChange={(variant) => {
                          variantMutation.mutate({ sectionId: activeSection, variant });
                        }}
                        isVariantLoading={variantMutation.isPending}
                        onUploadMedia={(file) => uploadWebsiteMedia(file, 'general')}
                        onFieldChange={handleFieldChange}
                        onDirtyChange={setHasUnsavedContent}
                        onContentChange={handleContentChange}
                        saveRef={contentSaveRef}
                        contentSetRef={contentSetRef}
                        mediaData={config.media_data as Record<string, unknown>}
                        seoData={config.seo_data as Record<string, unknown>}
                        contactContent={contentData.contact}
                        availableNavSections={sections.filter(s => !['hero', 'header', 'footer'].includes(s))}
                        onNavigateToSection={(id) => { setActiveSection(id); }}
                        contactWhatsapp={contentData.contact?.whatsapp ? String(contentData.contact.whatsapp) : undefined}
                        industry={templateIndustry}
                      />
                    ) : undefined}
                    onSelectPage={(id) => {
                      setActivePage(id);
                      setActiveSection('');
                    }}
                    onSelectSection={(id) => {
                      setActiveSection(id);
                    }}
                    onAddPage={handleAddPage}
                    onRemovePage={handleRemovePage}
                    onUpdatePages={handleUpdatePages}
                    onAddSectionWithContent={(sectionId, content, variant) =>
                      addSectionMutation.mutate({ sectionId, initialContent: content, variant })
                    }
                  />
                ) : (
                  <SectionManager
                    sections={sections}
                    allSections={allSections}
                    activeSection={activeSection}
                    onSelectSection={(id) => {
                      setActiveSection(id);
                    }}
                    onReorder={(order) => reorderMutation.mutate(order)}
                    onAdd={(id, content, variant) => addSectionMutation.mutate({ sectionId: id, initialContent: content, variant })}
                    onRemove={(id) => removeSectionMutation.mutate(id)}
                    onDuplicate={(id) => duplicateSectionMutation.mutate(id)}
                  />
                )}
              </>
            )}

            {/* ─── Design Tab ───────────────────────── */}
            {activeTab === 'design' && (
              <DesignPanel
                themeData={currentTheme}
                defaultTheme={defaultThemeFromServer}
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

          {/* Auto-save indicator moved to top bar */}
        </div>

        {/* ─── Live Preview (flex-1, maximized) ─────────────────── */}
        <div className="flex-1 min-w-0 relative">
          <LivePreview
            htmlContent={previewHtml || null}
            isLoading={previewLoading}
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
            onRefresh={() => refetchPreview()}
            themeOverrides={localTheme || undefined}
            contentOverrides={contentOverrides}
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
                    <MessageSquare className="h-4 w-4 text-[#0D9488]" />
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
                  className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-[0.82rem] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/30 transition-colors"
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
          {railItems.map(({ id, label, icon: Icon }) => {
            const hasChanges =
              (id === 'design' && hasUnsavedTheme) ||
              (id === 'content' && hasUnsavedContent) ||
              (id === 'settings' && hasUnsavedSettings);
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setMobileDrawerOpen(true);
                }}
                className={`relative flex-1 flex flex-col items-center justify-center h-12 rounded-xl transition-all cursor-pointer ${
                  activeTab === id && mobileDrawerOpen
                    ? 'bg-[#1C3B57] text-white'
                    : 'bg-white text-gray-500'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[0.55rem] font-medium mt-0.5">{label}</span>
                {hasChanges && (
                  <span className={`absolute top-1 right-3 w-2 h-2 rounded-full ring-2 ${
                    activeTab === id && mobileDrawerOpen
                      ? 'bg-amber-300 ring-[#1C3B57]'
                      : 'bg-amber-400 ring-white'
                  }`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Mobile: drawer overlay ────────────────────────────── */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] flex flex-col">
            {/* Drawer header */}
            <div className="bg-white border-b border-gray-100 p-3 flex items-center justify-between rounded-t-2xl z-10 shrink-0">
              <span className="text-[0.85rem] font-semibold text-[#1C3B57]">
                {railItems.find((r) => r.id === activeTab)?.label}
              </span>
              <div className="flex items-center gap-0.5">
                {/* Undo / Redo — global */}
                <button
                  type="button"
                  onClick={globalUndo}
                  disabled={!canUndo}
                  title="Deshacer"
                  className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-default text-gray-400 hover:text-[#1C3B57] hover:bg-[#E2F3F1]/40"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={globalRedo}
                  disabled={!canRedo}
                  title="Rehacer"
                  className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-default text-gray-400 hover:text-[#1C3B57] hover:bg-[#E2F3F1]/40"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </button>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Drawer content */}
            <div className="p-4 flex-1 overflow-y-auto">
              {activeTab === 'content' && (
                <>
                  {pagesData ? (
                    <PageManager
                      pagesData={pagesData}
                      activePage={activePage}
                      activeSection={activeSection}
                      allSections={allSections}
                      editorContent={currentContent ? (
                        <ContentPanel
                          sectionKey={activeSection}
                          content={currentContent}
                          onSaveEdit={(content, mediaUpdates, seoUpdates) => {
                            saveMutation.mutate({ sectionKey: activeSection, content, mediaUpdates, seoUpdates });
                          }}
                          onVariantChange={(variant) => {
                            variantMutation.mutate({ sectionId: activeSection, variant });
                          }}
                          isVariantLoading={variantMutation.isPending}
                          onUploadMedia={(file) => uploadWebsiteMedia(file, 'general')}
                          onFieldChange={handleFieldChange}
                          onDirtyChange={setHasUnsavedContent}
                          onContentChange={handleContentChange}
                          saveRef={contentSaveRef}
                          contentSetRef={contentSetRef}
                          mediaData={config.media_data as Record<string, unknown>}
                          seoData={config.seo_data as Record<string, unknown>}
                          contactContent={contentData.contact}
                          availableNavSections={sections.filter(s => !['hero', 'header', 'footer'].includes(s))}
                          onNavigateToSection={(id) => { setActiveSection(id); }}
                          contactWhatsapp={contentData.contact?.whatsapp ? String(contentData.contact.whatsapp) : undefined}
                          industry={templateIndustry}
                        />
                      ) : undefined}
                      onSelectPage={(id) => {
                        setActivePage(id);
                        setActiveSection('');
                      }}
                      onSelectSection={(id) => {
                        setActiveSection(id);
                      }}
                      onAddPage={handleAddPage}
                      onRemovePage={handleRemovePage}
                      onUpdatePages={handleUpdatePages}
                      onAddSectionWithContent={(sectionId, content, variant) =>
                        addSectionMutation.mutate({ sectionId, initialContent: content, variant })
                      }
                    />
                  ) : (
                    <SectionManager
                      sections={sections}
                      allSections={allSections}
                      activeSection={activeSection}
                      onSelectSection={(id) => {
                        setActiveSection(id);
                      }}
                      onReorder={(order) => reorderMutation.mutate(order)}
                      onAdd={(id, content, variant) => addSectionMutation.mutate({ sectionId: id, initialContent: content, variant })}
                      onRemove={(id) => removeSectionMutation.mutate(id)}
                      onDuplicate={(id) => duplicateSectionMutation.mutate(id)}
                    />
                  )}
                </>
              )}

              {activeTab === 'design' && (
                <DesignPanel
                  themeData={currentTheme}
                  defaultTheme={defaultThemeFromServer}
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

            {/* Auto-save indicator moved to top bar */}
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
            <p className="text-[0.82rem] text-gray-500 mb-4">
              Tu sitio web será visible públicamente. Podrás seguir editándolo después de publicar.
            </p>

            {config.has_unpublished_changes && config.is_published && (
              <div className="flex items-center gap-2 justify-center mb-4 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-[0.78rem]">
                <Cloud className="h-3.5 w-3.5 shrink-0" />
                <span>Hay cambios pendientes de publicar</span>
              </div>
            )}

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
                onClick={async () => {
                  // Save any unsaved changes first, then publish
                  handleSaveAllNow();
                  setShowPublishDialog(false);
                  publishMutation.mutate();
                }}
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
