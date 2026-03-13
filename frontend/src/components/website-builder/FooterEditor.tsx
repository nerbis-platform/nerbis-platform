'use client';

import { ArrowRight, Phone, Mail, MapPin, MessageCircle, Clock, Newspaper } from 'lucide-react';
import SocialLinksEditor from './SocialLinksEditor';
import SubComponentToggle from './SubComponentToggle';

interface SectionContent {
  [key: string]: unknown;
}

interface FooterEditorProps {
  content: SectionContent;
  contactContent: SectionContent;
  socialLinks: Record<string, string>;
  onChange: (content: SectionContent) => void;
  onSocialLinksChange: (links: Record<string, string>) => void;
  onNavigateToSection?: (sectionId: string) => void;
}

const CONTACT_FIELDS = [
  { key: 'phone', label: 'Teléfono', icon: Phone },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'address', label: 'Dirección', icon: MapPin },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'hours', label: 'Horario', icon: Clock },
] as const;

export default function FooterEditor({
  content,
  contactContent,
  socialLinks,
  onChange,
  onSocialLinksChange,
  onNavigateToSection,
}: FooterEditorProps) {
  const updateField = (key: string, value: unknown) => {
    onChange({ ...content, [key]: value });
  };

  const inputClass = 'w-full mt-1.5 h-10 px-3 rounded-lg border border-gray-200 text-[0.88rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 transition-colors';
  const labelClass = 'text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide';

  return (
    <div className="space-y-5">
      {/* ─── Contenido del footer ─────────────────── */}
      <div>
        <p className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Contenido
        </p>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>Descripción</label>
            <textarea
              value={String(content.description || '')}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Visítanos y descubre todo lo que tenemos para ofrecerte."
              rows={2}
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg border border-gray-200 text-[0.88rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 resize-none transition-colors"
            />
          </div>

          <div>
            <label className={labelClass}>Copyright</label>
            <input
              type="text"
              value={String(content.copyright_text || '')}
              onChange={(e) => updateField('copyright_text', e.target.value)}
              placeholder="2026 Tu Negocio. Todos los derechos reservados."
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Enlace de privacidad</label>
            <input
              type="text"
              value={String(content.privacy_label || '')}
              onChange={(e) => updateField('privacy_label', e.target.value)}
              placeholder="Política de privacidad"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ─── Redes sociales ───────────────────────── */}
      <div>
        <p className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Redes Sociales
        </p>

        <SocialLinksEditor
          links={socialLinks}
          onChange={onSocialLinksChange}
        />
      </div>

      {/* ─── Componentes opcionales ──────────────────── */}
      <div>
        <p className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Componentes opcionales
        </p>

        <SubComponentToggle
          label="Formulario de newsletter"
          description="Campo de email para suscripción al boletín"
          icon={Newspaper}
          enabled={!!content.newsletter_enabled}
          onToggle={(v) => updateField('newsletter_enabled', v)}
        >
          <div>
            <label className={labelClass}>Título</label>
            <input
              type="text"
              value={String(content.newsletter_title || '')}
              onChange={(e) => updateField('newsletter_title', e.target.value)}
              placeholder="Suscríbete a nuestro boletín"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Placeholder del campo</label>
            <input
              type="text"
              value={String(content.newsletter_placeholder || '')}
              onChange={(e) => updateField('newsletter_placeholder', e.target.value)}
              placeholder="Tu correo electrónico"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Texto del botón</label>
            <input
              type="text"
              value={String(content.newsletter_button_text || '')}
              onChange={(e) => updateField('newsletter_button_text', e.target.value)}
              placeholder="Suscribirse"
              className={inputClass}
            />
          </div>
        </SubComponentToggle>
      </div>

      {/* ─── Datos de contacto (read-only) ────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wider">
            Datos de Contacto
          </p>
          {onNavigateToSection && (
            <button
              type="button"
              onClick={() => onNavigateToSection('contact')}
              className="flex items-center gap-1 text-[0.72rem] text-[#1C3B57] font-medium hover:underline cursor-pointer"
            >
              Editar
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="bg-gray-50/80 rounded-xl p-3 space-y-2">
          {CONTACT_FIELDS.map(({ key, label, icon: Icon }) => {
            const val = contactContent[key];
            if (!val) return null;
            return (
              <div key={key} className="flex items-center gap-2.5">
                <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="text-[0.72rem] text-gray-400 w-16 shrink-0">{label}</span>
                <span className="text-[0.82rem] text-gray-600 truncate">{String(val)}</span>
              </div>
            );
          })}
          {CONTACT_FIELDS.every(({ key }) => !contactContent[key]) && (
            <p className="text-[0.78rem] text-gray-400 italic text-center py-2">
              No hay datos de contacto configurados
            </p>
          )}
        </div>

        <p className="text-[0.65rem] text-gray-400 mt-2">
          Los datos de contacto se editan en la sección Contacto y se muestran automáticamente en el footer
        </p>
      </div>
    </div>
  );
}
