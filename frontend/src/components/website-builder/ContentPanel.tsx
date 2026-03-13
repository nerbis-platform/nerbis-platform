'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
import VariantSwitcher from './VariantSwitcher';
import ImagePicker from './ImagePicker';
import RichTextField from './RichTextField';
import HeaderEditor from './HeaderEditor';
import FooterEditor from './FooterEditor';
import SubComponentToggle from './SubComponentToggle';

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
  onSaveEdit: (content: SectionContent, mediaUpdates?: Record<string, unknown>, seoUpdates?: Record<string, unknown>) => void;
  onVariantChange?: (variant: string) => void;
  isVariantLoading?: boolean;
  onUploadMedia?: (file: File) => Promise<{ url: string }>;
  onFieldChange?: (sectionKey: string, field: string, value: unknown) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onContentChange?: (content: SectionContent) => void;
  saveRef?: React.RefObject<(() => void) | null>;
  contentSetRef?: React.RefObject<((content: SectionContent) => void) | null>;
  // Header/Footer specific
  mediaData?: Record<string, unknown>;
  seoData?: Record<string, unknown>;
  contactContent?: SectionContent;
  availableNavSections?: string[];
  onNavigateToSection?: (sectionId: string) => void;
  contactWhatsapp?: string;
  industry?: string;
}

// ─── Main component ──────────────────────────────────────────
export default function ContentPanel({
  sectionKey,
  content,
  onSaveEdit,
  onVariantChange,
  isVariantLoading,
  onUploadMedia,
  onFieldChange,
  onDirtyChange,
  onContentChange,
  saveRef,
  contentSetRef,
  mediaData,
  seoData,
  contactContent,
  availableNavSections,
  onNavigateToSection,
  contactWhatsapp,
  industry,
}: ContentPanelProps) {
  const [editedContent, setEditedContent] = useState<SectionContent>(content);
  const [pendingMediaUpdates, setPendingMediaUpdates] = useState<Record<string, unknown>>({});
  const [pendingSeoUpdates, setPendingSeoUpdates] = useState<Record<string, unknown>>({});

  // Sync edited content when section changes or saved content updates
  // Use JSON key to avoid resetting on every render (content is a new object ref each time)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const contentKey = JSON.stringify(content);
  useEffect(() => {
    setEditedContent({ ...content });
    setPendingMediaUpdates({});
    setPendingSeoUpdates({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey, contentKey]);

  // Notify parent of content changes (for undo/redo tracking)
  useEffect(() => {
    onContentChange?.(editedContent);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedContent]);

  const handleSave = () => {
    onSaveEdit(editedContent, pendingMediaUpdates, pendingSeoUpdates);
    setPendingMediaUpdates({});
    setPendingSeoUpdates({});
  };

  // Expose save and setEditedContent to parent via refs
  useEffect(() => {
    if (saveRef) {
      (saveRef as React.MutableRefObject<(() => void) | null>).current = handleSave;
    }
    if (contentSetRef) {
      (contentSetRef as React.MutableRefObject<((c: SectionContent) => void) | null>).current = setEditedContent;
    }
  });

  // Detect unsaved changes and notify parent
  const hasChanges = useMemo(() => {
    if (Object.keys(pendingMediaUpdates).length > 0) return true;
    if (Object.keys(pendingSeoUpdates).length > 0) return true;
    return JSON.stringify(editedContent) !== JSON.stringify(content);
  }, [editedContent, content, pendingMediaUpdates, pendingSeoUpdates]);

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  return (
    <div className="mt-1.5 space-y-3">
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
      <div className="space-y-4">
        {sectionKey === 'header' ? (
          <HeaderEditor
            content={editedContent}
            logoUrl={mediaData?.logo_url ? String(mediaData.logo_url) : ''}
            onChange={(updated) => setEditedContent(updated)}
            onLogoUrlChange={(url) => setPendingMediaUpdates((prev) => ({ ...prev, logo_url: url || '' }))}
            onUploadMedia={onUploadMedia || (async () => ({ url: '' }))}
            availableNavSections={availableNavSections || []}
            contactWhatsapp={contactWhatsapp}
            industry={industry}
            contactContent={contactContent}
            socialLinks={(seoData?.social_links as Record<string, string>) || {}}
          />
        ) : sectionKey === 'footer' ? (
          <FooterEditor
            content={editedContent}
            contactContent={contactContent || {}}
            socialLinks={(seoData?.social_links as Record<string, string>) || {}}
            onChange={(updated) => setEditedContent(updated)}
            onSocialLinksChange={(links) => setPendingSeoUpdates((prev) => ({ ...prev, social_links: links }))}
            onNavigateToSection={onNavigateToSection}
          />
        ) : (
          <>
            <SectionFields
              sectionKey={sectionKey}
              content={editedContent}
              onChange={(updated) => setEditedContent(updated)}
              onUploadMedia={onUploadMedia}
              onFieldChange={onFieldChange}
            />
            {sectionKey === 'contact' && (
              <div className="pt-2">
                <p className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Componentes opcionales
                </p>
                <SubComponentToggle
                  label="Mapa de ubicación"
                  description="Mapa de Google embebido con tu dirección"
                  icon={MapPin}
                  enabled={!!editedContent.map_enabled}
                  onToggle={(v) => setEditedContent({ ...editedContent, map_enabled: v })}
                >
                  <div>
                    <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide">
                      Dirección para el mapa
                    </label>
                    <input
                      type="text"
                      value={String(editedContent.map_address || '')}
                      onChange={(e) => setEditedContent({ ...editedContent, map_address: e.target.value })}
                      placeholder="Calle 123, Ciudad, País"
                      className="w-full mt-1.5 h-10 px-3 rounded-lg border border-gray-200 text-[0.88rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 transition-colors"
                    />
                    {editedContent.address && !editedContent.map_address && (
                      <button
                        type="button"
                        onClick={() => setEditedContent({ ...editedContent, map_address: String(editedContent.address) })}
                        className="mt-1.5 text-[0.72rem] text-[#1C3B57] font-medium hover:underline cursor-pointer"
                      >
                        Usar dirección de contacto: {String(editedContent.address)}
                      </button>
                    )}
                  </div>
                </SubComponentToggle>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Section fields renderer ─────────────────────────────────
function SectionFields({
  sectionKey,
  content,
  onChange,
  onUploadMedia,
  onFieldChange,
}: {
  sectionKey: string;
  content: SectionContent;
  onChange: (updated: SectionContent) => void;
  onUploadMedia?: (file: File) => Promise<{ url: string }>;
  onFieldChange?: (sectionKey: string, field: string, value: unknown) => void;
}) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...content, [field]: value });
    onFieldChange?.(sectionKey, field, value);
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
  const imageFields = getSectionImageFields(sectionKey, content);

  return (
    <div className="space-y-5">
      {/* Image fields */}
      {onUploadMedia && imageFields.map(({ key, label }) => (
        <ImagePicker
          key={key}
          currentUrl={content[key] ? String(content[key]) : undefined}
          label={label}
          onUpload={onUploadMedia}
          onChange={(url) => updateField(key, url || '')}
        />
      ))}

      {/* Simple text fields */}
      {textFields.map(({ key, label, value, multiline }) => (
        <div key={key}>
          <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide">
            {label}
          </label>
          {multiline ? (
            <RichTextField
              value={String(value || '')}
              onChange={(v) => updateField(key, v)}
              rows={3}
            />
          ) : (
            <input
              type="text"
              value={String(value || '')}
              onChange={(e) => updateField(key, e.target.value)}
              className="w-full mt-1.5 h-10 px-3 rounded-lg border border-gray-200 text-[0.88rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 transition-colors"
            />
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
              </div>
            ))}
            <button
              type="button"
              onClick={addHighlight}
              className="flex items-center gap-1.5 text-[0.78rem] text-[#1C3B57] font-medium hover:underline cursor-pointer mt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar punto
            </button>
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
                onUpdate={(field, value) => updateItem(i, field, value)}
                onRemove={() => removeItem(i)}
                onUploadMedia={onUploadMedia}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 mt-3 text-[0.78rem] text-[#1C3B57] font-medium hover:underline cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar {getItemSingular(sectionKey)}
          </button>
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
  onUpdate,
  onRemove,
  onUploadMedia,
}: {
  sectionKey: string;
  item: Record<string, unknown>;
  index: number;
  onUpdate: (field: string, value: string) => void;
  onRemove: () => void;
  onUploadMedia?: (file: File) => Promise<{ url: string }>;
}) {
  const [expanded, setExpanded] = useState(index < 3);

  const fields = getItemFields(sectionKey, item);
  const itemImage = getItemImageField(sectionKey, item);
  const title = String(item.name || item.question || item.title || `Elemento ${index + 1}`);

  return (
    <div className="rounded-lg border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            {itemImage && typeof item[itemImage.key] === 'string' && item[itemImage.key] ? (
              <img
                src={item[itemImage.key] as string}
                alt=""
                className="w-8 h-8 rounded-md object-cover border border-gray-100"
              />
            ) : null}
            <span className="text-[0.85rem] font-medium text-gray-700">{title}</span>
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-2 mr-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
          {/* Item image picker */}
          {onUploadMedia && itemImage && (
            <ImagePicker
              currentUrl={item[itemImage.key] ? String(item[itemImage.key]) : undefined}
              label={itemImage.label}
              compact
              onUpload={onUploadMedia}
              onChange={(url) => onUpdate(itemImage.key, url || '')}
            />
          )}

          {fields.map(({ key, label, multiline }) => (
            <div key={key}>
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide">
                {label}
              </label>
              {multiline ? (
                <RichTextField
                  value={String(item[key] || '')}
                  onChange={(v) => onUpdate(key, v)}
                  rows={2}
                  compact
                />
              ) : (
                <input
                  type="text"
                  value={String(item[key] || '')}
                  onChange={(e) => onUpdate(key, e.target.value)}
                  className="w-full mt-1 h-8 px-2.5 rounded-lg border border-gray-200 text-[0.82rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] transition-colors"
                />
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

// ─── Image field helpers ────────────────────────────────────

const IMAGE_FIELD_LABELS: Record<string, string> = {
  image: 'Imagen',
  _image: 'Imagen',
  background_image: 'Imagen de fondo',
  bg_image: 'Imagen de fondo',
  cover_image: 'Portada',
  photo: 'Foto',
  avatar: 'Avatar',
};

function getSectionImageFields(
  sectionKey: string,
  content: SectionContent
): { key: string; label: string }[] {
  const fields: { key: string; label: string }[] = [];
  const found = new Set<string>();

  // Detect existing image-like fields in content
  for (const key of Object.keys(content)) {
    if (key.startsWith('_') && key !== '_image') continue;
    if (key in IMAGE_FIELD_LABELS || key.endsWith('_image')) {
      const val = content[key];
      if (typeof val === 'string' || val === null || val === undefined) {
        found.add(key);
        fields.push({
          key,
          label: IMAGE_FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        });
      }
    }
  }

  // For sections that should always have an image picker
  const defaultImageSections: Record<string, string> = {
    hero: 'Imagen principal',
    about: 'Imagen',
  };
  if (sectionKey in defaultImageSections && !found.has('image')) {
    fields.unshift({ key: 'image', label: defaultImageSections[sectionKey] });
  }

  return fields;
}

function getItemImageField(
  sectionKey: string,
  item: Record<string, unknown>
): { key: string; label: string } | null {
  // Check if item already has an image-like field
  const imageKeys = ['image', 'photo', 'avatar', 'picture', 'thumbnail'];
  for (const key of imageKeys) {
    if (key in item) {
      return { key, label: IMAGE_FIELD_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1) };
    }
  }

  // For known sections, offer image upload even if field doesn't exist yet
  const sectionDefaults: Record<string, { key: string; label: string }> = {
    services: { key: 'image', label: 'Imagen' },
    products: { key: 'image', label: 'Imagen' },
    team: { key: 'photo', label: 'Foto' },
    testimonials: { key: 'avatar', label: 'Avatar' },
    gallery: { key: 'image', label: 'Imagen' },
  };

  return sectionDefaults[sectionKey] || null;
}
