'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Building2,
  Palette,
  FileText,
  Phone,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Check,
  Upload,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { getOnboardingStatus, saveOnboardingResponses, getWebsiteTemplate } from '@/lib/api/websites';
import { OnboardingQuestion, QuestionSection } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Section config ───────────────────────────────────────────

const SECTIONS: { key: QuestionSection; label: string; icon: React.ElementType }[] = [
  { key: 'basic', label: 'Tu Negocio', icon: Building2 },
  { key: 'branding', label: 'Identidad', icon: Palette },
  { key: 'content', label: 'Páginas', icon: FileText },
  { key: 'contact', label: 'Contacto', icon: Phone },
];

// ─── Image upload + color extraction ─────────────────────────

function ImageUploadField({
  value,
  onChange,
  onColorsExtracted,
}: {
  value?: string;
  onChange: (val: string) => void;
  onColorsExtracted?: (colors: { primary: string; secondary: string }) => void;
}) {
  // Preview: use stored data URL if available
  const preview = value && value.startsWith('data:') ? value : null;
  const [extracting, setExtracting] = useState(false);

  const handleFile = async (file: File) => {
    // Convert to data URL for persistent preview
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);

    if (onColorsExtracted) {
      setExtracting(true);
      try {
        const objectUrl = URL.createObjectURL(file);
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.src = objectUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
        });

        const ColorThief = (await import('colorthief')).default;
        const ct = new ColorThief();
        const palette = ct.getPalette(img, 5);

        const toHex = (rgb: [number, number, number]) =>
          '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');

        onColorsExtracted({
          primary: toHex(palette[0]),
          secondary: toHex(palette[1]),
        });
        toast.success('Colores extraídos de tu logo');
        URL.revokeObjectURL(objectUrl);
      } catch (err) {
        console.warn('Color extraction failed:', err);
      }
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="group block border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-[#95D0C9] transition-colors cursor-pointer">
        <input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {preview ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Logo preview"
              className="max-h-20 max-w-50 object-contain"
            />
            {extracting ? (
              <span className="text-[0.78rem] text-[#95D0C9] flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Extrayendo colores...
              </span>
            ) : (
              <span className="text-[0.78rem] text-gray-400 group-hover:text-[#95D0C9]">
                Cambiar imagen
              </span>
            )}
          </div>
        ) : (
          <div className="text-gray-400 space-y-2">
            <Upload className="h-6 w-6 mx-auto text-gray-300" />
            <p className="text-[0.82rem]">
              Arrastra o haz clic para subir tu logo
            </p>
            <p className="text-[0.72rem]">PNG, JPG, SVG o WebP</p>
          </div>
        )}
      </label>
    </div>
  );
}

// ─── Question field renderer ──────────────────────────────────

function QuestionField({
  question,
  value,
  onChange,
  onColorsExtracted,
  compact = false,
}: {
  question: OnboardingQuestion;
  value: string | string[];
  onChange: (val: string | string[]) => void;
  onColorsExtracted?: (colors: { primary: string; secondary: string }) => void;
  compact?: boolean;
}) {
  const stringValue = typeof value === 'string' ? value : '';
  const arrayValue = Array.isArray(value) ? value : [];

  switch (question.question_type) {
    case 'text':
    case 'url':
    case 'number':
      return (
        <Input
          type={question.question_type === 'url' ? 'url' : question.question_type === 'number' ? 'number' : 'text'}
          placeholder={question.placeholder || ''}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 border-gray-200 focus:border-[#95D0C9] focus:ring-[#95D0C9]/20 text-[0.88rem]"
        />
      );

    case 'textarea':
      return (
        <Textarea
          placeholder={question.placeholder || ''}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          maxLength={question.max_length || undefined}
          className="border-gray-200 focus:border-[#95D0C9] focus:ring-[#95D0C9]/20 text-[0.88rem] resize-none"
        />
      );

    case 'choice':
      return (
        <div className={compact ? 'grid grid-cols-2 gap-2' : 'grid gap-2'}>
          {question.options?.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`text-left px-3.5 py-2.5 rounded-lg border text-[0.82rem] transition-all duration-150 cursor-pointer ${
                stringValue === option
                  ? 'border-[#95D0C9] bg-[#E2F3F1]/50 text-[#1C3B57] font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    stringValue === option
                      ? 'border-[#95D0C9] bg-[#95D0C9]'
                      : 'border-gray-300'
                  }`}
                >
                  {stringValue === option && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                {option}
              </div>
            </button>
          ))}
        </div>
      );

    case 'multi_choice':
      return (
        <div className={compact ? 'grid grid-cols-2 gap-2' : 'grid gap-2'}>
          {question.options?.map((option) => {
            const isSelected = arrayValue.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    onChange(arrayValue.filter((v) => v !== option));
                  } else {
                    onChange([...arrayValue, option]);
                  }
                }}
                className={`text-left px-3.5 py-2.5 rounded-lg border text-[0.82rem] transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'border-[#95D0C9] bg-[#E2F3F1]/50 text-[#1C3B57] font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'border-[#95D0C9] bg-[#95D0C9]'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  {option}
                </div>
              </button>
            );
          })}
        </div>
      );

    case 'color':
      return (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={stringValue || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-11 h-11 rounded-lg border border-gray-200 cursor-pointer p-1"
          />
          <Input
            type="text"
            placeholder="#000000"
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 border-gray-200 focus:border-[#95D0C9] focus:ring-[#95D0C9]/20 text-[0.88rem] font-mono max-w-35"
          />
        </div>
      );

    case 'image':
      return (
        <ImageUploadField
          value={stringValue}
          onChange={(val) => onChange(val)}
          onColorsExtracted={onColorsExtracted}
        />
      );

    default:
      return (
        <Input
          placeholder={question.placeholder || ''}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 border-gray-200 focus:border-[#95D0C9] focus:ring-[#95D0C9]/20 text-[0.88rem]"
        />
      );
  }
}

// ─── Reusable question block ─────────────────────────────────

function QuestionBlock({
  question,
  responses,
  errors,
  updateResponse,
  compact = false,
}: {
  question: OnboardingQuestion;
  responses: Record<string, string | string[]>;
  errors: Record<string, string>;
  updateResponse: (key: string, val: string | string[]) => void;
  compact?: boolean;
}) {
  return (
    <div>
      <label className="block mb-1.5">
        <span className="text-[0.85rem] font-medium" style={{ color: '#1C3B57' }}>
          {question.question_text}
          {question.is_required && <span className="text-[#95D0C9] ml-1">*</span>}
        </span>
        {!compact && question.help_text && (
          <span className="block text-[0.72rem] text-gray-400/80 mt-0.5">{question.help_text}</span>
        )}
      </label>

      <QuestionField
        question={question}
        value={responses[question.question_key] || (question.question_type === 'multi_choice' ? [] : '')}
        onChange={(val) => updateResponse(question.question_key, val)}
        compact={compact}
      />

      {errors[question.question_key] && (
        <p className="text-red-500 text-[0.78rem] mt-1.5">{errors[question.question_key]}</p>
      )}

      {question.question_type === 'textarea' &&
        question.max_length &&
        typeof responses[question.question_key] === 'string' &&
        (responses[question.question_key] as string).length > question.max_length * 0.8 && (
          <p
            className={`text-[0.72rem] mt-1 text-right ${
              (responses[question.question_key] as string).length >= question.max_length
                ? 'text-red-400'
                : 'text-gray-400'
            }`}
          >
            {(responses[question.question_key] as string).length}/{question.max_length}
          </p>
        )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

// Mapeo: flags del tenant → secciones pre-seleccionadas
function getDefaultSections(tenant: { has_shop?: boolean; has_bookings?: boolean; has_services?: boolean; has_marketing?: boolean } | null): string[] {
  const sections = ['Sobre nosotros', 'Preguntas frecuentes']; // Siempre incluir
  if (tenant?.has_shop) {
    sections.push('Productos', 'Precios / Tarifas', 'Galería de fotos');
  }
  if (tenant?.has_bookings || tenant?.has_services) {
    sections.push('Servicios');
    if (!sections.includes('Galería de fotos')) sections.push('Galería de fotos');
  }
  if (tenant?.has_marketing) {
    sections.push('Testimonios / Reseñas');
  }
  return sections;
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNavBack = searchParams.get('nav') === '1';
  const { tenant, user } = useAuth();
  const [currentSection, setCurrentSection] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch onboarding status (includes saved responses)
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: getOnboardingStatus,
  });

  // Fetch template with questions
  const templateId = statusData?.template?.id;
  const { data: templateData, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['websiteTemplate', templateId],
    queryFn: () => getWebsiteTemplate(templateId!),
    enabled: !!templateId,
  });

  // Initialize responses from saved data
  useEffect(() => {
    if (statusData?.responses) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResponses((prev) => {
        // Only set if we haven't loaded yet (empty state)
        if (Object.keys(prev).length === 0) {
          return statusData.responses;
        }
        return prev;
      });
    }
  }, [statusData?.responses]);

  // Pre-fill fields from tenant/user data (only if no saved response)
  useEffect(() => {
    if (!tenant && !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResponses((prev) => {
      const updates: Record<string, string> = {};
      if (tenant?.name && !prev['business_name']) updates['business_name'] = tenant.name;
      // Phone: tenant first, fallback to user
      const phone = tenant?.phone || user?.phone;
      if (phone && !prev['business_phone']) updates['business_phone'] = phone;
      // Email: tenant first, fallback to user
      const email = tenant?.email || user?.email;
      if (email && !prev['business_email']) updates['business_email'] = email;
      if (tenant?.address && !prev['business_address']) {
        const parts = [tenant.address, tenant.city, tenant.country].filter(Boolean);
        updates['business_address'] = parts.join(', ');
      }
      if (Object.keys(updates).length === 0) return prev;
      return { ...prev, ...updates };
    });
  }, [tenant, user]);

  // Pre-select website_sections based on tenant flags (only if no saved response)
  useEffect(() => {
    if (tenant && !responses['website_sections']) {
      const defaults = getDefaultSections(tenant);
      if (defaults.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResponses((prev) => {
          if (!prev['website_sections']) {
            return { ...prev, website_sections: defaults };
          }
          return prev;
        });
      }
    }
  }, [tenant, responses]);

  // Redirect if not in onboarding status (skip if user navigated back via stepper)
  useEffect(() => {
    if (statusData && statusData.status !== 'onboarding') {
      if (statusData.status === 'not_started' || statusData.status === 'draft') {
        router.push('/dashboard/website-builder');
      } else if (statusData.status === 'generating') {
        router.push('/dashboard/website-builder/generate');
      } else if (!isNavBack) {
        router.push('/dashboard/website-builder/editor');
      }
    }
  }, [statusData, router, isNavBack]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string | string[]>) => saveOnboardingResponses(data),
  });

  // Get questions grouped by section
  const questions: OnboardingQuestion[] = templateData?.questions || [];
  const questionsBySection = SECTIONS.map((section) => ({
    ...section,
    questions: questions.filter((q) => q.section === section.key),
  })).filter((s) => s.questions.length > 0);

  const currentSectionData = questionsBySection[currentSection];
  const isLastSection = currentSection === questionsBySection.length - 1;

  // Update a response
  const updateResponse = (key: string, value: string | string[]) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Validate current section
  const validateSection = (): boolean => {
    if (!currentSectionData) return true;

    const newErrors: Record<string, string> = {};
    for (const q of currentSectionData.questions) {
      if (q.is_required) {
        const val = responses[q.question_key];
        if (!val || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0)) {
          newErrors[q.question_key] = 'Este campo es obligatorio';
        } else if (q.min_length && typeof val === 'string' && val.length < q.min_length) {
          newErrors[q.question_key] = `Mínimo ${q.min_length} caracteres`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save current section responses
  const saveCurrentSection = async () => {
    if (!currentSectionData) return;

    // Only save questions that have responses
    const sectionResponses: Record<string, string | string[]> = {};
    for (const q of currentSectionData.questions) {
      const val = responses[q.question_key];
      if (val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) {
        sectionResponses[q.question_key] = val;
      }
    }

    if (Object.keys(sectionResponses).length > 0) {
      await saveMutation.mutateAsync(sectionResponses);
    }
  };

  // Navigate to next section
  const handleNext = async () => {
    if (!validateSection()) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    try {
      await saveCurrentSection();

      if (isLastSection) {
        toast.success('Información guardada correctamente');
        router.push('/dashboard/website-builder/generate');
      } else {
        setCurrentSection((prev) => prev + 1);
      }
    } catch {
      toast.error('Error al guardar. Intenta de nuevo.');
    }
  };

  // Navigate to previous section
  const handlePrev = async () => {
    try {
      await saveCurrentSection();
    } catch {
      // Silent — don't block navigation back
    }
    setCurrentSection((prev) => prev - 1);
  };

  const isLoading = isLoadingStatus || isLoadingTemplate;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="max-w-lg">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-5 w-full" />
        </div>
        <div className="flex gap-3 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-lg" />
          ))}
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (questionsBySection.length === 0) {
    return (
      <div className="text-center py-20">
        <Sparkles className="h-8 w-8 text-[#95D0C9] mx-auto mb-4" />
        <p className="text-gray-500">Cargando preguntas...</p>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fade-up 0.4s ease-out forwards; }
      `}</style>

      <div className="space-y-8 fade-up">
        {/* Header */}
        <div className="max-w-lg">
          <h1
            className="text-[2rem] sm:text-[2.4rem] leading-[1.1] tracking-[-0.03em] mb-4"
            style={{ color: '#1C3B57', fontWeight: 300 }}
          >
            Cuéntanos sobre
            <br />
            <span style={{ fontWeight: 600 }}>
              tu{' '}
              <span className="text-[#95D0C9] border-b-2 border-[#95D0C9]/30">
                negocio
              </span>
            </span>
          </h1>
          <p className="text-[0.88rem] leading-[1.7] text-gray-500">
            Esta información ayudará a la IA a generar contenido personalizado para tu sitio web.
          </p>
        </div>

        {/* Section stepper */}
        <div className="flex flex-wrap gap-2">
          {questionsBySection.map((section, index) => {
            const Icon = SECTIONS.find((s) => s.key === section.key)?.icon || Building2;
            const isActive = index === currentSection;
            const isCompleted = index < currentSection;

            return (
              <button
                key={section.key}
                type="button"
                onClick={async () => {
                  // Allow clicking on completed or current sections
                  if (index <= currentSection) {
                    if (index < currentSection) {
                      try { await saveCurrentSection(); } catch { /* silent */ }
                    }
                    setCurrentSection(index);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[0.8rem] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#1C3B57] text-white'
                    : isCompleted
                    ? 'bg-[#E2F3F1] text-[#1C3B57] cursor-pointer hover:bg-[#d1ece8]'
                    : 'bg-gray-100 text-gray-400 cursor-default'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                {section.label}
              </button>
            );
          })}
        </div>

        {/* Questions */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 space-y-7">
          {(() => {
            if (!currentSectionData) return null;

            // Branding section: all keys handled with custom layout
            const isBranding = currentSectionData.key === 'branding';
            const allBrandingKeys = new Set(['brand_tone', 'logo_upload', 'primary_color', 'secondary_color']);
            const brandToneQ = isBranding ? currentSectionData.questions.find((q) => q.question_key === 'brand_tone') : null;
            const logoQ = isBranding ? currentSectionData.questions.find((q) => q.question_key === 'logo_upload') : null;
            const primaryQ = isBranding ? currentSectionData.questions.find((q) => q.question_key === 'primary_color') : null;
            const secondaryQ = isBranding ? currentSectionData.questions.find((q) => q.question_key === 'secondary_color') : null;

            // Basic section: custom compact layout
            const isBasic = currentSectionData.key === 'basic';
            const allBasicKeys = new Set(['business_name', 'business_tagline', 'business_description', 'target_audience', 'unique_selling_point']);
            const nameQ = isBasic ? currentSectionData.questions.find((q) => q.question_key === 'business_name') : null;
            const taglineQ = isBasic ? currentSectionData.questions.find((q) => q.question_key === 'business_tagline') : null;
            const descQ = isBasic ? currentSectionData.questions.find((q) => q.question_key === 'business_description') : null;
            const audienceQ = isBasic ? currentSectionData.questions.find((q) => q.question_key === 'target_audience') : null;
            const uspQ = isBasic ? currentSectionData.questions.find((q) => q.question_key === 'unique_selling_point') : null;

            // Content section: single website_sections multi_choice
            const isContent = currentSectionData.key === 'content';
            const allContentKeys = new Set(['website_sections']);
            const sectionsQ = isContent ? currentSectionData.questions.find((q) => q.question_key === 'website_sections') : null;

            // Contact section: custom layout
            const isContact = currentSectionData.key === 'contact';
            const allContactKeys = new Set(['business_phone', 'business_email', 'business_whatsapp', 'business_address', 'business_hours', 'social_media']);
            const phoneQ = isContact ? currentSectionData.questions.find((q) => q.question_key === 'business_phone') : null;
            const emailQ = isContact ? currentSectionData.questions.find((q) => q.question_key === 'business_email') : null;
            const whatsappQ = isContact ? currentSectionData.questions.find((q) => q.question_key === 'business_whatsapp') : null;
            const addressQ = isContact ? currentSectionData.questions.find((q) => q.question_key === 'business_address') : null;
            const hoursQ = isContact ? currentSectionData.questions.find((q) => q.question_key === 'business_hours') : null;
            const socialQ = isContact ? currentSectionData.questions.find((q) => q.question_key === 'social_media') : null;

            // Questions not handled by custom layouts
            const displayQuestions = currentSectionData.questions.filter((q) => {
              if (isBasic) return !allBasicKeys.has(q.question_key);
              if (isBranding) return !allBrandingKeys.has(q.question_key);
              if (isContent) return !allContentKeys.has(q.question_key);
              if (isContact) return !allContactKeys.has(q.question_key);
              return true;
            });

            return (
              <>
                {/* Basic section: premium layout */}
                {isBasic && (
                  <>
                    {/* Name + Tagline row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {nameQ && (
                        <QuestionBlock
                          question={nameQ}
                          responses={responses}
                          errors={errors}
                          updateResponse={updateResponse}
                          compact
                        />
                      )}
                      {taglineQ && (
                        <QuestionBlock
                          question={taglineQ}
                          responses={responses}
                          errors={errors}
                          updateResponse={updateResponse}
                          compact
                        />
                      )}
                    </div>

                    {/* Description full width */}
                    {descQ && (
                      <QuestionBlock
                        question={descQ}
                        responses={responses}
                        errors={errors}
                        updateResponse={updateResponse}
                      />
                    )}

                    {/* Optional separator */}
                    {(audienceQ || uspQ) && (
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-[0.7rem] text-gray-400 uppercase tracking-wider">Opcional</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                    )}

                    {/* Audience + USP row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {audienceQ && (
                        <QuestionBlock
                          question={audienceQ}
                          responses={responses}
                          errors={errors}
                          updateResponse={updateResponse}
                          compact
                        />
                      )}
                      {uspQ && (
                        <QuestionBlock
                          question={uspQ}
                          responses={responses}
                          errors={errors}
                          updateResponse={updateResponse}
                          compact
                        />
                      )}
                    </div>
                  </>
                )}

                {/* Other section questions (non-basic, non-branding-special) */}
                {displayQuestions.map((question) => (
                  <QuestionBlock
                    key={question.question_key}
                    question={question}
                    responses={responses}
                    errors={errors}
                    updateResponse={updateResponse}
                  />
                ))}

                {/* Branding section: premium layout */}
                {isBranding && (
                  <>
                    {/* Brand tone — compact 2-col grid */}
                    {brandToneQ && (
                      <QuestionBlock
                        question={brandToneQ}
                        responses={responses}
                        errors={errors}
                        updateResponse={updateResponse}
                        compact
                      />
                    )}

                    {/* Logo + Colors row */}
                    {logoQ && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div>
                          <label className="block mb-1.5">
                            <span className="text-[0.85rem] font-medium" style={{ color: '#1C3B57' }}>
                              {logoQ.question_text}
                            </span>
                          </label>
                          <QuestionField
                            question={logoQ}
                            value={responses[logoQ.question_key] || ''}
                            onChange={(val) => updateResponse(logoQ.question_key, val)}
                            onColorsExtracted={(colors) => {
                              updateResponse('primary_color', colors.primary);
                              updateResponse('secondary_color', colors.secondary);
                            }}
                          />
                        </div>

                        <div className="space-y-4">
                          {[primaryQ, secondaryQ].filter(Boolean).map((q) => (
                            <div key={q!.question_key}>
                              <label className="block mb-1.5">
                                <span className="text-[0.85rem] font-medium" style={{ color: '#1C3B57' }}>
                                  {q!.question_text}
                                </span>
                              </label>
                              <QuestionField
                                question={q!}
                                value={responses[q!.question_key] || ''}
                                onChange={(val) => updateResponse(q!.question_key, val)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Content section: single sections selector */}
                {isContent && sectionsQ && (
                  <QuestionBlock
                    question={sectionsQ}
                    responses={responses}
                    errors={errors}
                    updateResponse={updateResponse}
                    compact
                  />
                )}

                {/* Contact section: premium layout */}
                {isContact && (
                  <>
                    {/* Phone + Email row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {phoneQ && (
                        <QuestionBlock
                          question={phoneQ}
                          responses={responses}
                          errors={errors}
                          updateResponse={updateResponse}
                          compact
                        />
                      )}
                      {emailQ && (
                        <QuestionBlock
                          question={emailQ}
                          responses={responses}
                          errors={errors}
                          updateResponse={updateResponse}
                          compact
                        />
                      )}
                    </div>

                    {/* WhatsApp full width */}
                    {whatsappQ && (
                      <QuestionBlock
                        question={whatsappQ}
                        responses={responses}
                        errors={errors}
                        updateResponse={updateResponse}
                      />
                    )}

                    {/* Separator */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-[0.7rem] text-gray-400 uppercase tracking-wider">Ubicación y horario</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    {/* Address + Hours row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {addressQ && (
                        <QuestionBlock
                          question={addressQ}
                          responses={responses}
                          errors={errors}
                          updateResponse={updateResponse}
                          compact
                        />
                      )}
                      {hoursQ && (
                        <QuestionBlock
                          question={hoursQ}
                          responses={responses}
                          errors={errors}
                          updateResponse={updateResponse}
                          compact
                        />
                      )}
                    </div>

                    {/* Social media */}
                    {socialQ && (
                      <>
                        <div className="flex items-center gap-3 pt-1">
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-[0.7rem] text-gray-400 uppercase tracking-wider">Redes sociales</span>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>
                        <QuestionBlock
                          question={socialQ}
                          responses={responses}
                          errors={errors}
                          updateResponse={updateResponse}
                          compact
                        />
                      </>
                    )}
                  </>
                )}
              </>
            );
          })()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {currentSection > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 h-11 px-5 rounded-lg border border-gray-200 text-gray-500 text-[0.85rem] font-medium transition-all hover:border-gray-300 hover:text-gray-600 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[0.75rem] text-gray-400">
              {currentSection + 1} / {questionsBySection.length}
            </span>

            <button
              type="button"
              onClick={handleNext}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 h-11 px-6 rounded-lg text-white text-[0.85rem] font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              style={{ background: '#1C3B57' }}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isLastSection ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar mi sitio web
                </>
              ) : (
                <>
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
