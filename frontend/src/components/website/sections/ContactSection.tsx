'use client';

import type { SectionData } from '@/contexts/WebsiteContentContext';
import { CONTACT_ICONS, CONTACT_LABELS, CONTACT_KEYS, getWhatsAppLink } from './shared';

export function ContactSection({ data }: { data: SectionData }) {
  const variant = data._variant || 'cards-grid';
  switch (variant) {
    case 'split-form': return <ContactSplitForm data={data} />;
    case 'centered-minimal': return <ContactCenteredMinimal data={data} />;
    default: return <ContactCardsGrid data={data} />;
  }
}

function ContactCardsGrid({ data }: { data: SectionData }) {
  const waLink = getWhatsAppLink(data);

  return (
    <section className="section" data-section="contact">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Contacto</span>
          <h2 className="section-title">{data.title || 'Contacto'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        <div className="contact-grid anim-fade-up stagger">
          {CONTACT_KEYS.map((key) => {
            const val = data[key];
            if (!val) return null;
            return (
              <div key={key} className="contact-item">
                <div className="ci-icon">{CONTACT_ICONS[key]}</div>
                <div>
                  <div className="ci-label">{CONTACT_LABELS[key]}</div>
                  <div className="ci-value">{val}</div>
                </div>
              </div>
            );
          })}
        </div>
        {waLink && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary whatsapp-cta">
              {CONTACT_ICONS.whatsapp} Escríbenos por WhatsApp
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function ContactSplitForm({ data }: { data: SectionData }) {
  const waLink = getWhatsAppLink(data);

  return (
    <section className="section" data-section="contact">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Contacto</span>
          <h2 className="section-title">{data.title || 'Contáctanos'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        <div className="contact-split anim-fade-up">
          <div className="contact-split-info">
            {CONTACT_KEYS.map((key) => {
              const val = data[key];
              if (!val) return null;
              return (
                <div key={key} className="contact-split-item">
                  <div className="ci-icon">{CONTACT_ICONS[key]}</div>
                  <div>
                    <div className="ci-label">{CONTACT_LABELS[key]}</div>
                    <div className="ci-value">{val}</div>
                  </div>
                </div>
              );
            })}
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary whatsapp-cta" style={{ marginTop: 16 }}>
                {CONTACT_ICONS.whatsapp} WhatsApp
              </a>
            )}
          </div>
          <div className="contact-split-form">
            <div className="contact-form-placeholder">
              <div className="contact-form-field">
                <label>Nombre</label>
                <div className="contact-form-input" />
              </div>
              <div className="contact-form-field">
                <label>Email</label>
                <div className="contact-form-input" />
              </div>
              <div className="contact-form-field">
                <label>Mensaje</label>
                <div className="contact-form-input contact-form-textarea" />
              </div>
              <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
                Enviar mensaje
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactCenteredMinimal({ data }: { data: SectionData }) {
  const waLink = getWhatsAppLink(data);

  return (
    <section className="section" data-section="contact">
      <div className="container">
        <div className="contact-centered anim-fade-up">
          <span className="section-label">Contacto</span>
          <h2 className="section-title">{data.title || 'Hablemos'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
          <div className="contact-centered-items">
            {CONTACT_KEYS.map((key) => {
              const val = data[key];
              if (!val) return null;
              const isLink = key === 'phone' || key === 'email' || key === 'whatsapp';
              const href = key === 'phone' ? `tel:${val}` : key === 'email' ? `mailto:${val}` : key === 'whatsapp' ? waLink : undefined;
              return (
                <div key={key} className="contact-centered-item">
                  <span className="ci-icon">{CONTACT_ICONS[key]}</span>
                  {isLink && href ? (
                    <a href={href} target={key === 'whatsapp' ? '_blank' : undefined} rel={key === 'whatsapp' ? 'noopener noreferrer' : undefined} className="contact-centered-link">{val}</a>
                  ) : (
                    <span className="ci-value">{val}</span>
                  )}
                </div>
              );
            })}
          </div>
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary whatsapp-cta" style={{ marginTop: 28 }}>
              {CONTACT_ICONS.whatsapp} Escríbenos por WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
