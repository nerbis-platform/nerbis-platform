'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, FileText, Sparkles } from 'lucide-react';
import { LayoutIcon, SECTION_VARIANTS } from './VariantSwitcher';
import { SECTION_TEMPLATES, getDefaultContent } from '@/data/section-templates';

interface SectionInfo {
  id: string;
  name: string;
  required: boolean;
}

interface SectionLibraryProps {
  availableSections: SectionInfo[];
  onAdd: (sectionId: string, initialContent?: Record<string, unknown>, variant?: string) => void;
  onClose: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero / Inicio',
  about: 'Sobre Nosotros',
  services: 'Servicios',
  products: 'Productos',
  contact: 'Contacto',
  testimonials: 'Testimonios',
  gallery: 'Galería',
  pricing: 'Precios',
  faq: 'Preguntas Frecuentes',
  team: 'Equipo',
  blog: 'Blog',
  features: 'Características',
  stats: 'Estadísticas',
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  hero: 'Banner principal con título, subtítulo y llamada a la acción',
  about: 'Cuenta la historia de tu negocio o marca',
  services: 'Muestra los servicios que ofreces',
  products: 'Presenta tu catálogo de productos',
  contact: 'Información de contacto y formulario',
  testimonials: 'Opiniones y reseñas de tus clientes',
  gallery: 'Galería de imágenes o portafolio',
  pricing: 'Planes, precios y comparaciones',
  faq: 'Preguntas frecuentes con respuestas',
  team: 'Presenta a los miembros de tu equipo',
  blog: 'Artículos y noticias recientes',
  features: 'Destaca las características principales',
  stats: 'Números y estadísticas importantes',
};

export default function SectionLibrary({
  availableSections,
  onAdd,
  onClose,
}: SectionLibraryProps) {
  const [selectedSection, setSelectedSection] = useState<string>(
    availableSections[0]?.id || ''
  );

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleAddWithVariant = useCallback((sectionId: string, variant: string) => {
    const key = `${sectionId}:${variant}`;
    const content = SECTION_TEMPLATES[key] ? { ...SECTION_TEMPLATES[key] } : undefined;
    onAdd(sectionId, content, variant);
  }, [onAdd]);

  const handleAddBlank = useCallback((sectionId: string) => {
    onAdd(sectionId);
  }, [onAdd]);

  const handleAddDefault = useCallback((sectionId: string) => {
    const content = getDefaultContent(sectionId);
    if (content) {
      // Get the variant from the first template
      const prefix = `${sectionId}:`;
      const key = Object.keys(SECTION_TEMPLATES).find(k => k.startsWith(prefix));
      const variant = key ? key.split(':')[1] : undefined;
      onAdd(sectionId, content, variant);
    } else {
      onAdd(sectionId);
    }
  }, [onAdd]);

  const currentVariants = SECTION_VARIANTS[selectedSection] || [];
  const hasVariants = currentVariants.length > 0;

  if (availableSections.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[0.95rem] font-semibold text-[#1C3B57]">
              Biblioteca de secciones
            </h2>
            <p className="text-[0.72rem] text-gray-400 mt-0.5">
              Elige una sección y un diseño para agregar a tu sitio
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar: section types */}
          <div className="w-48 shrink-0 border-r border-gray-100 overflow-y-auto py-2">
            {availableSections.map(section => {
              const isActive = selectedSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedSection(section.id)}
                  className={`w-full text-left px-4 py-2.5 text-[0.78rem] transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#E2F3F1] text-[#1C3B57] font-medium border-r-2 border-[#1C3B57]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {SECTION_LABELS[section.id] || section.name}
                </button>
              );
            })}
          </div>

          {/* Right area: variants */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Section description */}
            <div className="mb-4">
              <h3 className="text-[0.85rem] font-semibold text-[#1C3B57]">
                {SECTION_LABELS[selectedSection] || selectedSection}
              </h3>
              <p className="text-[0.72rem] text-gray-400 mt-0.5">
                {SECTION_DESCRIPTIONS[selectedSection] || 'Sección personalizada'}
              </p>
            </div>

            {hasVariants ? (
              <>
                {/* Variant grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {currentVariants.map(variant => {
                    const hasTemplate = !!SECTION_TEMPLATES[`${selectedSection}:${variant.id}`];
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => handleAddWithVariant(selectedSection, variant.id)}
                        className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-[#0D9488] hover:bg-[#E2F3F1]/20 transition-all cursor-pointer"
                      >
                        <LayoutIcon type={variant.icon} isActive={false} />
                        <div className="text-center">
                          <span className="text-[0.75rem] font-medium text-gray-700 group-hover:text-[#1C3B57] block">
                            {variant.label}
                          </span>
                          <span className="text-[0.65rem] text-gray-400 leading-tight block mt-0.5">
                            {variant.description}
                          </span>
                        </div>
                        {hasTemplate && (
                          <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-[#E2F3F1] text-[#1C3B57] text-[0.55rem] font-medium px-1.5 py-0.5 rounded-full">
                            <Sparkles className="h-2 w-2" />
                            Contenido
                          </span>
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#1C3B57]/5 rounded-xl">
                          <span className="flex items-center gap-1 bg-[#1C3B57] text-white text-[0.7rem] font-medium px-3 py-1.5 rounded-lg shadow-sm">
                            <Plus className="h-3 w-3" />
                            Agregar
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Add blank option */}
                <div className="border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => handleAddBlank(selectedSection)}
                    className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-dashed border-gray-300 text-[0.75rem] text-gray-500 font-medium hover:border-[#0D9488] hover:text-[#1C3B57] transition-colors cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Agregar sin contenido
                  </button>
                </div>
              </>
            ) : (
              /* Section without variants — show single add option */
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 rounded-2xl bg-[#E2F3F1] flex items-center justify-center">
                  <FileText className="h-7 w-7 text-[#1C3B57]" />
                </div>
                <div className="text-center">
                  <p className="text-[0.78rem] text-gray-500">
                    Esta sección no tiene variantes de diseño.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddDefault(selectedSection)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1C3B57] text-white text-[0.78rem] font-medium hover:bg-[#1C3B57]/90 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Agregar con contenido
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBlank(selectedSection)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-[0.78rem] font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    En blanco
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
