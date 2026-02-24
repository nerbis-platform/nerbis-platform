'use client';

import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Save,
  X,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import VariantSwitcher from './VariantSwitcher';

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

interface ContentPanelProps {
  sectionKey: string;
  content: SectionContent;
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onSaveEdit: (content: SectionContent) => void;
  onCancelEdit: () => void;
  onVariantChange?: (variant: string) => void;
  isVariantLoading?: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  header: 'Encabezado / Menú',
  hero: 'Inicio',
  about: 'Sobre nosotros',
  services: 'Servicios',
  products: 'Productos',
  contact: 'Contacto',
  testimonials: 'Testimonios',
  gallery: 'Galería',
  pricing: 'Precios',
  faq: 'Preguntas frecuentes',
  footer: 'Pie de página',
  team: 'Equipo',
  blog: 'Blog',
};

const SECTION_ICONS: Record<string, string> = {
  header: '🧭',
  hero: '🏠',
  about: '📖',
  services: '⚙️',
  products: '🛍️',
  contact: '📞',
  testimonials: '⭐',
  gallery: '🖼️',
  pricing: '💰',
  faq: '❓',
  footer: '📋',
  team: '👥',
  blog: '✍️',
};

// ─── Main component ──────────────────────────────────────────
export default function ContentPanel({
  sectionKey,
  content,
  isEditing,
  isSaving,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onVariantChange,
  isVariantLoading,
}: ContentPanelProps) {
  const [editedContent, setEditedContent] = useState<SectionContent>(content);

  // Reset edited content when section changes or editing starts
  const handleStartEdit = () => {
    setEditedContent({ ...content });
    onStartEdit();
  };

  const handleSave = () => {
    onSaveEdit(editedContent);
  };

  const handleCancel = () => {
    setEditedContent({ ...content });
    onCancelEdit();
  };

  const displayContent = isEditing ? editedContent : content;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{SECTION_ICONS[sectionKey] || '📄'}</span>
          <h2 className="text-[1rem] font-semibold text-[#1C3B57]">
            {SECTION_LABELS[sectionKey] || sectionKey}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[0.75rem] text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-[0.75rem] text-white font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                style={{ background: '#1C3B57' }}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Guardar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[0.75rem] text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 transition-all cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
          )}
        </div>
      </div>

      {/* Variant switcher */}
      {onVariantChange && (
        <VariantSwitcher
          sectionKey={sectionKey}
          currentVariant={(content._variant as string) || ''}
          aiRecommendedVariant={(content._variant_ai_recommended as string) || undefined}
          onChange={onVariantChange}
          isLoading={isVariantLoading}
        />
      )}

      {/* Section fields */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
        <SectionFields
          sectionKey={sectionKey}
          content={displayContent}
          isEditing={isEditing}
          onChange={(updated) => setEditedContent(updated)}
        />
      </div>
    </div>
  );
}

// ─── Section fields renderer ─────────────────────────────────
function SectionFields({
  sectionKey,
  content,
  isEditing,
  onChange,
}: {
  sectionKey: string;
  content: SectionContent;
  isEditing: boolean;
  onChange: (updated: SectionContent) => void;
}) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...content, [field]: value });
  };

  const updateHighlight = (index: number, value: string) => {
    const highlights = [...(content.highlights || [])];
    highlights[index] = value;
    onChange({ ...content, highlights });
  };

  const addHighlight = () => {
    const highlights = [...(content.highlights || []), ''];
    onChange({ ...content, highlights });
  };

  const removeHighlight = (index: number) => {
    const highlights = [...(content.highlights || [])];
    highlights.splice(index, 1);
    onChange({ ...content, highlights });
  };

  const updateItem = (index: number, field: string, value: string) => {
    const items = [...(content.items || [])];
    items[index] = { ...items[index], [field]: value };
    onChange({ ...content, items });
  };

  const addItem = () => {
    const items = [...(content.items || [])];
    const template = getEmptyItem(sectionKey);
    items.push(template);
    onChange({ ...content, items });
  };

  const removeItem = (index: number) => {
    const items = [...(content.items || [])];
    items.splice(index, 1);
    onChange({ ...content, items });
  };

  const textFields = getTextFields(sectionKey, content);

  return (
    <div className="space-y-5">
      {/* Simple text fields */}
      {textFields.map(({ key, label, value, multiline }) => (
        <div key={key}>
          <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide">
            {label}
          </label>
          {isEditing ? (
            multiline ? (
              <textarea
                value={String(value || '')}
                onChange={(e) => updateField(key, e.target.value)}
                rows={3}
                className="w-full mt-1.5 px-3 py-2.5 rounded-lg border border-gray-200 text-[0.88rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 resize-none transition-colors"
              />
            ) : (
              <input
                type="text"
                value={String(value || '')}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full mt-1.5 h-10 px-3 rounded-lg border border-gray-200 text-[0.88rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 transition-colors"
              />
            )
          ) : (
            <p className="text-[0.88rem] text-gray-700 mt-1.5 leading-relaxed">
              {value ? String(value) : <span className="text-gray-300 italic">Sin contenido</span>}
            </p>
          )}
        </div>
      ))}

      {/* Highlights list */}
      {content.highlights && content.highlights.length > 0 && (
        <div>
          <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide">
            Puntos destacados
          </label>
          <div className="mt-2 space-y-2">
            {content.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#E2F3F1] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-[#1C3B57]" />
                </div>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={h}
                      onChange={(e) => updateHighlight(i, e.target.value)}
                      className="flex-1 h-8 px-2.5 rounded-lg border border-gray-200 text-[0.85rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeHighlight(i)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <p className="text-[0.85rem] text-gray-700">{h}</p>
                )}
              </div>
            ))}
            {isEditing && (
              <button
                type="button"
                onClick={addHighlight}
                className="flex items-center gap-1.5 text-[0.78rem] text-[#1C3B57] font-medium hover:underline cursor-pointer mt-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar punto
              </button>
            )}
          </div>
        </div>
      )}

      {/* Items (services, testimonials, FAQ, pricing, etc.) */}
      {content.items && content.items.length > 0 && (
        <div>
          <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide mb-3 block">
            {getItemsLabel(sectionKey)}
          </label>
          <div className="space-y-3">
            {content.items.map((item, i) => (
              <ItemCard
                key={i}
                sectionKey={sectionKey}
                item={item}
                index={i}
                isEditing={isEditing}
                onUpdate={(field, value) => updateItem(i, field, value)}
                onRemove={() => removeItem(i)}
              />
            ))}
          </div>
          {isEditing && (
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 mt-3 text-[0.78rem] text-[#1C3B57] font-medium hover:underline cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar {getItemSingular(sectionKey)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Item card for lists ─────────────────────────────────────
function ItemCard({
  sectionKey,
  item,
  index,
  isEditing,
  onUpdate,
  onRemove,
}: {
  sectionKey: string;
  item: Record<string, unknown>;
  index: number;
  isEditing: boolean;
  onUpdate: (field: string, value: string) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(index < 3);

  const fields = getItemFields(sectionKey, item);
  const title = String(item.name || item.question || item.title || `Elemento ${index + 1}`);

  return (
    <div className="rounded-lg border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
        >
          <span className="text-[0.85rem] font-medium text-gray-700">{title}</span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onRemove}
            className="p-2 mr-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
          {fields.map(({ key, label, multiline }) => (
            <div key={key}>
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide">
                {label}
              </label>
              {isEditing ? (
                multiline ? (
                  <textarea
                    value={String(item[key] || '')}
                    onChange={(e) => onUpdate(key, e.target.value)}
                    rows={2}
                    className="w-full mt-1 px-2.5 py-2 rounded-lg border border-gray-200 text-[0.82rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] resize-none transition-colors"
                  />
                ) : (
                  <input
                    type="text"
                    value={String(item[key] || '')}
                    onChange={(e) => onUpdate(key, e.target.value)}
                    className="w-full mt-1 h-8 px-2.5 rounded-lg border border-gray-200 text-[0.82rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] transition-colors"
                  />
                )
              ) : (
                <p className="text-[0.82rem] text-gray-600 mt-1 leading-relaxed">
                  {item[key] ? String(item[key]) : <span className="text-gray-300 italic">&mdash;</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function getTextFields(sectionKey: string, content: SectionContent) {
  const fields: { key: string; label: string; value: unknown; multiline?: boolean }[] = [];

  // Header section has specific fields
  if (sectionKey === 'header') {
    if ('logo_text' in content) fields.push({ key: 'logo_text', label: 'Texto del logo', value: content.logo_text });
    if ('cta_text' in content) fields.push({ key: 'cta_text', label: 'Botón del menú (CTA)', value: content.cta_text });
    if ('cta_link' in content) fields.push({ key: 'cta_link', label: 'Link del botón', value: content.cta_link });
    return fields;
  }

  // Common fields
  if ('title' in content) fields.push({ key: 'title', label: 'Título', value: content.title });
  if ('subtitle' in content) fields.push({ key: 'subtitle', label: 'Subtítulo', value: content.subtitle });
  if ('content' in content) fields.push({ key: 'content', label: 'Contenido', value: content.content, multiline: true });
  if ('cta_text' in content) fields.push({ key: 'cta_text', label: 'Texto del botón', value: content.cta_text });
  if ('phone' in content) fields.push({ key: 'phone', label: 'Teléfono', value: content.phone });
  if ('email' in content) fields.push({ key: 'email', label: 'Email', value: content.email });
  if ('address' in content) fields.push({ key: 'address', label: 'Dirección', value: content.address });
  if ('whatsapp' in content) fields.push({ key: 'whatsapp', label: 'WhatsApp', value: content.whatsapp });
  if ('hours' in content) fields.push({ key: 'hours', label: 'Horario', value: content.hours });

  return fields;
}

function getItemsLabel(sectionKey: string): string {
  const labels: Record<string, string> = {
    services: 'Servicios',
    products: 'Productos',
    testimonials: 'Testimonios',
    faq: 'Preguntas frecuentes',
    pricing: 'Planes / Precios',
    gallery: 'Imágenes',
    team: 'Miembros del equipo',
  };
  return labels[sectionKey] || 'Elementos';
}

function getItemSingular(sectionKey: string): string {
  const labels: Record<string, string> = {
    services: 'servicio',
    products: 'producto',
    testimonials: 'testimonio',
    faq: 'pregunta',
    pricing: 'plan',
    gallery: 'imagen',
    team: 'miembro',
  };
  return labels[sectionKey] || 'elemento';
}

function getEmptyItem(sectionKey: string): Record<string, unknown> {
  switch (sectionKey) {
    case 'services':
    case 'products':
      return { name: '', description: '', price: '' };
    case 'testimonials':
      return { name: '', role: '', content: '' };
    case 'faq':
      return { question: '', answer: '' };
    case 'pricing':
      return { name: '', price: '', description: '' };
    case 'team':
      return { name: '', role: '', bio: '' };
    default:
      return { name: '', description: '' };
  }
}

function getItemFields(sectionKey: string, item: Record<string, unknown>) {
  const fields: { key: string; label: string; multiline?: boolean }[] = [];

  switch (sectionKey) {
    case 'services':
    case 'products':
      if ('name' in item) fields.push({ key: 'name', label: 'Nombre' });
      if ('description' in item) fields.push({ key: 'description', label: 'Descripción', multiline: true });
      if ('price' in item) fields.push({ key: 'price', label: 'Precio' });
      break;
    case 'testimonials':
      if ('name' in item) fields.push({ key: 'name', label: 'Nombre' });
      if ('role' in item) fields.push({ key: 'role', label: 'Rol / Cargo' });
      if ('content' in item) fields.push({ key: 'content', label: 'Testimonio', multiline: true });
      break;
    case 'faq':
      if ('question' in item) fields.push({ key: 'question', label: 'Pregunta' });
      if ('answer' in item) fields.push({ key: 'answer', label: 'Respuesta', multiline: true });
      break;
    case 'pricing':
      if ('name' in item) fields.push({ key: 'name', label: 'Nombre del plan' });
      if ('price' in item) fields.push({ key: 'price', label: 'Precio' });
      if ('description' in item) fields.push({ key: 'description', label: 'Descripción', multiline: true });
      break;
    case 'team':
      if ('name' in item) fields.push({ key: 'name', label: 'Nombre' });
      if ('role' in item) fields.push({ key: 'role', label: 'Cargo' });
      if ('bio' in item) fields.push({ key: 'bio', label: 'Biografía', multiline: true });
      break;
    default:
      Object.entries(item).forEach(([key, val]) => {
        if (typeof val === 'string' && key !== 'icon' && key !== 'image') {
          fields.push({ key, label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') });
        }
      });
  }

  return fields;
}
