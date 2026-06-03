'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import {
  Dumbbell,
  Scissors,
  UtensilsCrossed,
  Stethoscope,
  ShoppingBag,
  Briefcase,
  Sparkles,
  Crown,
  ArrowRight,
  Check,
  Loader2,
  ExternalLink,
  GraduationCap,
  Car,
  Home,
  PartyPopper,
  PawPrint,
  Monitor,
  Paintbrush,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { getWebsiteTemplates, getWebsiteConfig, startOnboarding } from '@/lib/api/websites';
import { WebsiteTemplate, WebsiteIndustry } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Iconos por industria (template) ─────────────────────────
const industryIcons: Partial<Record<WebsiteIndustry, React.ReactNode>> = {
  restaurant: <UtensilsCrossed className="h-6 w-6" />,
  retail: <ShoppingBag className="h-6 w-6" />,
  beauty: <Scissors className="h-6 w-6" />,
  health: <Stethoscope className="h-6 w-6" />,
  fitness: <Dumbbell className="h-6 w-6" />,
  professional: <Briefcase className="h-6 w-6" />,
  education: <GraduationCap className="h-6 w-6" />,
  automotive: <Car className="h-6 w-6" />,
  real_estate: <Home className="h-6 w-6" />,
  events: <PartyPopper className="h-6 w-6" />,
  pet: <PawPrint className="h-6 w-6" />,
  tech: <Monitor className="h-6 w-6" />,
  creative: <Paintbrush className="h-6 w-6" />,
  consulting: <MessageSquare className="h-6 w-6" />,
  generic: <Sparkles className="h-6 w-6" />,
};

const industryIconsLg: Partial<Record<WebsiteIndustry, React.ReactNode>> = {
  restaurant: <UtensilsCrossed className="h-10 w-10" />,
  retail: <ShoppingBag className="h-10 w-10" />,
  beauty: <Scissors className="h-10 w-10" />,
  health: <Stethoscope className="h-10 w-10" />,
  fitness: <Dumbbell className="h-10 w-10" />,
  professional: <Briefcase className="h-10 w-10" />,
  education: <GraduationCap className="h-10 w-10" />,
  automotive: <Car className="h-10 w-10" />,
  real_estate: <Home className="h-10 w-10" />,
  events: <PartyPopper className="h-10 w-10" />,
  pet: <PawPrint className="h-10 w-10" />,
  tech: <Monitor className="h-10 w-10" />,
  creative: <Paintbrush className="h-10 w-10" />,
  consulting: <MessageSquare className="h-10 w-10" />,
  generic: <Sparkles className="h-10 w-10" />,
};

const industryGradients: Partial<Record<WebsiteIndustry, string>> = {
  restaurant: 'from-amber-50 to-yellow-100',
  retail: 'from-emerald-50 to-green-100',
  beauty: 'from-pink-50 to-rose-100',
  health: 'from-blue-50 to-sky-100',
  fitness: 'from-orange-50 to-amber-100',
  professional: 'from-slate-50 to-gray-100',
  education: 'from-indigo-50 to-blue-100',
  automotive: 'from-zinc-50 to-neutral-100',
  real_estate: 'from-teal-50 to-cyan-100',
  events: 'from-fuchsia-50 to-pink-100',
  pet: 'from-lime-50 to-green-100',
  tech: 'from-violet-50 to-purple-100',
  creative: 'from-rose-50 to-pink-100',
  consulting: 'from-sky-50 to-blue-100',
  generic: 'from-gray-50 to-slate-100',
};

const industryColors: Partial<Record<WebsiteIndustry, string>> = {
  restaurant: 'text-amber-600',
  retail: 'text-emerald-600',
  beauty: 'text-pink-600',
  health: 'text-blue-600',
  fitness: 'text-orange-600',
  professional: 'text-slate-600',
  education: 'text-indigo-600',
  automotive: 'text-zinc-600',
  real_estate: 'text-teal-600',
  events: 'text-fuchsia-600',
  pet: 'text-lime-600',
  tech: 'text-violet-600',
  creative: 'text-rose-600',
  consulting: 'text-sky-600',
  generic: 'text-gray-500',
};

// ─── Mapeo: industria del tenant (27) → categoría de template (15) ──
const TENANT_TO_TEMPLATE_INDUSTRY: Record<string, WebsiteIndustry> = {
  beauty: 'beauty', spa: 'beauty', nails: 'beauty',
  gym: 'fitness', yoga: 'fitness',
  clinic: 'health', dental: 'health', psychology: 'health', nutrition: 'health',
  veterinary: 'pet',
  restaurant: 'restaurant', bakery: 'restaurant',
  store: 'retail', fashion: 'retail',
  education: 'education', coworking: 'professional',
  photography: 'creative', architecture: 'creative', marketing: 'creative',
  legal: 'consulting', accounting: 'consulting',
  tech: 'tech',
  real_estate: 'real_estate', automotive: 'automotive',
  events: 'events', travel: 'events',
  services: 'professional', other: 'generic',
};

// ─── Opciones para el dropdown del website builder ──────────
const TEMPLATE_INDUSTRY_CHOICES: { value: WebsiteIndustry; label: string }[] = [
  { value: 'beauty', label: 'Salón de Belleza / Spa' },
  { value: 'restaurant', label: 'Restaurante / Café' },
  { value: 'fitness', label: 'Gimnasio / Fitness' },
  { value: 'professional', label: 'Servicios Profesionales' },
  { value: 'retail', label: 'Tienda / Retail' },
  { value: 'health', label: 'Salud / Clínica' },
  { value: 'education', label: 'Educación / Academia' },
  { value: 'automotive', label: 'Automotriz / Taller' },
  { value: 'real_estate', label: 'Inmobiliaria' },
  { value: 'events', label: 'Eventos / Catering' },
  { value: 'pet', label: 'Mascotas / Veterinaria' },
  { value: 'tech', label: 'Tecnología / Startup' },
  { value: 'creative', label: 'Creativo / Agencia' },
  { value: 'consulting', label: 'Consultoría' },
  { value: 'generic', label: 'Negocio General' },
];

// ─── Template Card (extracted for reuse) ─────────────────────
function TemplateCard({
  template,
  onSelect,
  isSelected,
}: {
  template: WebsiteTemplate;
  onSelect: (t: WebsiteTemplate) => void;
  isSelected?: boolean;
}) {
  return (
    <div
      onClick={() => onSelect(template)}
      className={`group bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
        isSelected
          ? 'border-[#0D9488] ring-2 ring-[#0D9488]/20'
          : template.is_premium
            ? 'border-amber-200 hover:border-amber-300'
            : 'border-gray-100 hover:border-[#0D9488]'
      }`}
    >
      {/* Preview */}
      <div className={`relative h-36 overflow-hidden ${
        template.preview_image_url
          ? 'bg-gray-100'
          : `bg-gradient-to-br ${industryGradients[template.industry]}`
      }`}>
        {template.preview_image_url ? (
          <Image
            src={template.preview_image_url}
            alt={template.name}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={industryColors[template.industry]}>
              {industryIconsLg[template.industry]}
            </div>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[#1C3B57]/0 group-hover:bg-[#1C3B57]/40 transition-colors duration-300 flex items-center justify-center">
          <span className="text-white text-[0.78rem] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1.5">
            {isSelected ? 'Seleccionada' : 'Elegir'}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>

        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1 bg-[#1C3B57]/90 backdrop-blur-sm rounded-md px-2.5 py-1">
              <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
              <span className="text-[0.65rem] font-semibold text-white">Actual</span>
            </div>
          </div>
        )}

        {/* Premium badge */}
        {!isSelected && template.is_premium && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-amber-500/90 backdrop-blur-sm hover:bg-amber-500 text-white border-0 text-[0.65rem] font-semibold px-2.5 py-0.5">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          </div>
        )}

        {/* Demo link */}
        {template.preview_url && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(template.preview_url, '_blank');
            }}
            className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-md px-2.5 py-1 text-[0.68rem] font-medium text-gray-600 hover:bg-white transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3 w-3" />
            Demo
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-[0.88rem] text-gray-900 leading-tight">
            {template.name}
          </h3>
          <span className={`flex items-center gap-1 text-[0.62rem] font-medium shrink-0 ${industryColors[template.industry]}`}>
            {industryIcons[template.industry] && (
              <span className="[&_svg]:h-3 [&_svg]:w-3">{industryIcons[template.industry]}</span>
            )}
            {template.industry_display}
          </span>
        </div>
        <p className="text-[0.75rem] text-gray-500 leading-relaxed line-clamp-2">
          {template.description}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function WebsiteBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNavBack = searchParams.get('nav') === '1';
  const { user, tenant } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<WebsiteTemplate | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<WebsiteIndustry>('generic');

  const { data: existingConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['websiteConfig'],
    queryFn: getWebsiteConfig,
  });

  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['websiteTemplates'],
    queryFn: getWebsiteTemplates,
  });

  // Sync industry: prefer existing template's industry, fallback to tenant mapping
  useEffect(() => {
    if (existingConfig?.template && templates) {
      const currentTemplate = templates.find(t => t.id === existingConfig.template);
      if (currentTemplate) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedIndustry(currentTemplate.industry);
        return;
      }
    }
    if (tenant?.industry) {
      const mapped = TENANT_TO_TEMPLATE_INDUSTRY[tenant.industry] || 'generic';
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedIndustry(mapped);
    }
  }, [tenant?.industry, existingConfig?.template, templates]);

  const startOnboardingMutation = useMutation({
    mutationFn: (templateId: number) => startOnboarding(templateId),
    onSuccess: () => {
      toast.success('Template seleccionado correctamente');
      router.push('/dashboard/website-builder/onboarding');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al iniciar el proceso');
    },
  });

  // Split templates into recommended + others
  const { recommendedTemplates, otherTemplates } = useMemo(() => {
    if (!templates) return { recommendedTemplates: [], otherTemplates: [] };

    const recommended = templates.filter(t => t.industry === selectedIndustry);
    const others = templates.filter(t => t.industry !== selectedIndustry);

    return { recommendedTemplates: recommended, otherTemplates: others };
  }, [templates, selectedIndustry]);

  // Redirect based on existing config status (skip if user navigated back via stepper)
  useEffect(() => {
    if (existingConfig && !isLoadingConfig) {
      // Always redirect during active generation
      if (existingConfig.status === 'generating') {
        router.push('/dashboard/website-builder/generate');
      } else if (!isNavBack) {
        if (existingConfig.status === 'onboarding') {
          router.push('/dashboard/website-builder/onboarding');
        } else if (existingConfig.status === 'review' || existingConfig.status === 'published') {
          router.push('/dashboard/website-builder/editor');
        }
      }
    }
  }, [existingConfig, isLoadingConfig, router, isNavBack]);

  const currentTemplateId = existingConfig?.template ?? null;

  const selectedIndustryLabel = TEMPLATE_INDUSTRY_CHOICES.find(
    c => c.value === selectedIndustry
  )?.label || 'tu industria';

  const handleSelectTemplate = (template: WebsiteTemplate) => {
    if (template.is_premium) {
      toast.info('Los templates premium estarán disponibles próximamente');
      return;
    }
    setSelectedTemplate(template);
    setShowConfirmDialog(true);
  };

  const handleConfirmSelection = () => {
    if (selectedTemplate) {
      startOnboardingMutation.mutate(selectedTemplate.id);
    }
  };

  const isLoading = isLoadingConfig || isLoadingTemplates;
  const firstName = user?.first_name || '';
  const businessName = tenant?.name || 'tu negocio';

  return (
    <>
      <style jsx global>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fade-up 0.4s ease-out forwards; }
        .fade-up-delay-1 { animation: fade-up 0.4s ease-out 0.1s forwards; opacity: 0; }
        .fade-up-delay-2 { animation: fade-up 0.4s ease-out 0.2s forwards; opacity: 0; }
      `}</style>

      <div className="space-y-10">
        {/* ── Header personalizado ── */}
        <div className="max-w-lg fade-up">
          <h1
            className="text-[2rem] sm:text-[2.4rem] leading-[1.1] tracking-[-0.03em] mb-4"
            style={{ color: '#1C3B57', fontWeight: 300 }}
          >
            {firstName ? (
              <>
                Hola{' '}
                <span className="border-b-2 border-[#1C3B57]/25" style={{ fontWeight: 600 }}>
                  {firstName}
                </span>
              </>
            ) : 'Hola'}
            <br />
            <span style={{ fontWeight: 600 }}>Elige el estilo</span>
            <br />
            <span style={{ fontWeight: 600 }}>
              para{' '}
              <span className="text-[#0D9488] border-b-2 border-[#0D9488]/30">
                {businessName}
              </span>
            </span>
          </h1>

          <p className="text-[0.9rem] leading-[1.7] text-gray-500">
            La IA personalizará todo el contenido de tu sitio web.
          </p>
        </div>

        {/* ── Selector de industria ── */}
        {!isLoading && (
          <div className="flex items-center gap-2 flex-wrap fade-up-delay-1">
            <span className="text-[0.85rem] text-gray-500">
              Selecciona tu tipo de negocio
            </span>
            <Select
              value={selectedIndustry}
              onValueChange={(value) => setSelectedIndustry(value as WebsiteIndustry)}
            >
              <SelectTrigger className="w-auto min-w-[220px] h-9 text-[0.85rem] font-medium border-[#0D9488]/40 focus:border-[#0D9488] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_INDUSTRY_CHOICES.map((choice) => (
                  <SelectItem key={choice.value} value={choice.value}>
                    <span className="flex items-center gap-2">
                      <span className={`[&_svg]:h-4 [&_svg]:w-4 ${industryColors[choice.value]}`}>
                        {industryIcons[choice.value]}
                      </span>
                      {choice.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[0.8rem] text-gray-400">
              para ver plantillas recomendadas
            </span>
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 fade-up-delay-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <Skeleton className="h-36 w-full" />
                <div className="p-3.5">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3 mt-1.5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Recomendados para tu industria ── */}
        {!isLoading && recommendedTemplates.length > 0 && (
          <div className="space-y-4 fade-up-delay-1">
            <h2
              className="text-[1.1rem] tracking-[-0.02em]"
              style={{ color: '#1C3B57', fontWeight: 600 }}
            >
              Recomendados para {selectedIndustryLabel}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recommendedTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                  isSelected={template.id === currentTemplateId}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Sin recomendados — mensaje amigable ── */}
        {!isLoading && recommendedTemplates.length === 0 && templates && templates.length > 0 && (
          <div className="bg-[#E2F3F1]/50 rounded-xl p-6 fade-up-delay-1">
            <p className="text-[0.9rem] text-gray-700 font-medium mb-1">
              Aún no tenemos plantillas específicas para {selectedIndustryLabel}
            </p>
            <p className="text-[0.82rem] text-gray-500">
              Puedes elegir cualquiera de las disponibles. La IA adaptará todo el contenido a tu negocio.
            </p>
          </div>
        )}

        {/* ── Otros templates ── */}
        {!isLoading && otherTemplates.length > 0 && (
          <div className="space-y-4 fade-up-delay-2">
            <h2
              className="text-[1rem] tracking-[-0.02em]"
              style={{ color: '#1C3B57', fontWeight: 500 }}
            >
              Explorar más estilos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {otherTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                  isSelected={template.id === currentTemplateId}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && templates?.length === 0 && (
          <div className="text-center py-20 fade-up-delay-2">
            <h3
              className="text-[1.3rem] tracking-[-0.02em] mb-2"
              style={{ color: '#1C3B57', fontWeight: 600 }}
            >
              Estamos preparando tus templates
            </h3>
            <p className="text-[0.85rem] text-gray-400 max-w-sm mx-auto">
              Los templates personalizados para tu industria estarán
              disponibles muy pronto.
            </p>
          </div>
        )}

        {/* ── Dialog de confirmación ── */}
        <ResponsiveDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <ResponsiveDialogContent className="sm:max-w-md">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle
                className="text-[1.2rem] tracking-[-0.02em]"
                style={{ color: '#1C3B57', fontWeight: 600 }}
              >
                {currentTemplateId && selectedTemplate?.id !== currentTemplateId
                  ? 'Cambiar plantilla'
                  : 'Excelente elección'}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="text-[0.85rem] leading-relaxed pt-1">
                {currentTemplateId && selectedTemplate?.id !== currentTemplateId ? (
                  <>
                    Vas a cambiar a <strong className="text-gray-700">{selectedTemplate?.name}</strong>.
                    Esto reiniciará el onboarding y se perderá el contenido generado anteriormente.
                  </>
                ) : (
                  <>
                    Has seleccionado <strong className="text-gray-700">{selectedTemplate?.name}</strong>.
                    A continuación te haremos algunas preguntas sobre tu negocio para
                    personalizar el contenido.
                  </>
                )}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            {/* Preview en el dialog */}
            {selectedTemplate && (
              <div className={`relative h-40 rounded-lg overflow-hidden my-2 ${
                selectedTemplate.preview_image_url
                  ? 'bg-gray-100'
                  : `bg-gradient-to-br ${industryGradients[selectedTemplate.industry]}`
              }`}>
                {selectedTemplate.preview_image_url ? (
                  <Image
                    src={selectedTemplate.preview_image_url}
                    alt={selectedTemplate.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={industryColors[selectedTemplate.industry]}>
                      {industryIconsLg[selectedTemplate.industry]}
                    </div>
                  </div>
                )}
              </div>
            )}

            <ResponsiveDialogFooter className="gap-2 sm:gap-2 pt-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={startOnboardingMutation.isPending}
                className="h-10 px-5 rounded-lg border border-gray-200 text-gray-500 text-[0.82rem] font-medium transition-all hover:border-gray-300 hover:text-gray-600 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSelection}
                disabled={startOnboardingMutation.isPending}
                className="h-10 px-6 rounded-lg text-white text-[0.82rem] font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                style={{ background: '#1C3B57' }}
              >
                {startOnboardingMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>
    </>
  );
}
