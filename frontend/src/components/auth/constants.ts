// src/components/auth/constants.ts
// Static data and shared styles for auth components.

import type React from 'react';

export interface IndustryOption {
  value: string;
  label: string;
}

export interface CountryOption {
  value: string;
  label: string;
  flag: string;
  code: string;
}

export const industries: IndustryOption[] = [
  { value: 'beauty', label: 'Salón de Belleza / Barbería' },
  { value: 'spa', label: 'Spa / Centro de Bienestar' },
  { value: 'nails', label: 'Uñas / Nail Bar' },
  { value: 'gym', label: 'Gimnasio / Fitness' },
  { value: 'yoga', label: 'Yoga / Pilates / Danza' },
  { value: 'clinic', label: 'Clínica / Consultorio Médico' },
  { value: 'dental', label: 'Odontología' },
  { value: 'psychology', label: 'Psicología / Terapias' },
  { value: 'nutrition', label: 'Nutrición / Dietética' },
  { value: 'veterinary', label: 'Veterinaria / Pet Shop' },
  { value: 'restaurant', label: 'Restaurante / Cafetería' },
  { value: 'bakery', label: 'Panadería / Pastelería' },
  { value: 'store', label: 'Tienda / Retail' },
  { value: 'fashion', label: 'Moda / Boutique' },
  { value: 'education', label: 'Academia / Educación' },
  { value: 'coworking', label: 'Coworking / Oficina' },
  { value: 'photography', label: 'Fotografía / Videografía' },
  { value: 'architecture', label: 'Arquitectura / Diseño' },
  { value: 'legal', label: 'Abogados / Consultoría Legal' },
  { value: 'accounting', label: 'Contabilidad / Finanzas' },
  { value: 'marketing', label: 'Marketing / Publicidad' },
  { value: 'tech', label: 'Tecnología / Software' },
  { value: 'real_estate', label: 'Inmobiliaria' },
  { value: 'automotive', label: 'Automotriz / Taller Mecánico' },
  { value: 'events', label: 'Eventos / Wedding Planner' },
  { value: 'travel', label: 'Turismo / Agencia de Viajes' },
  { value: 'services', label: 'Servicios Profesionales' },
  { value: 'other', label: 'Otro' },
];

export const countries: CountryOption[] = [
  { value: 'Colombia', label: 'Colombia', flag: '\u{1F1E8}\u{1F1F4}', code: '+57' },
  { value: 'Mexico', label: 'México', flag: '\u{1F1F2}\u{1F1FD}', code: '+52' },
  { value: 'Espana', label: 'España', flag: '\u{1F1EA}\u{1F1F8}', code: '+34' },
  { value: 'Peru', label: 'Perú', flag: '\u{1F1F5}\u{1F1EA}', code: '+51' },
  { value: 'Chile', label: 'Chile', flag: '\u{1F1E8}\u{1F1F1}', code: '+56' },
  { value: 'Argentina', label: 'Argentina', flag: '\u{1F1E6}\u{1F1F7}', code: '+54' },
  { value: 'Ecuador', label: 'Ecuador', flag: '\u{1F1EA}\u{1F1E8}', code: '+593' },
  { value: 'Estados Unidos', label: 'Estados Unidos', flag: '\u{1F1FA}\u{1F1F8}', code: '+1' },
  { value: 'Brasil', label: 'Brasil', flag: '\u{1F1E7}\u{1F1F7}', code: '+55' },
  { value: 'Costa Rica', label: 'Costa Rica', flag: '\u{1F1E8}\u{1F1F7}', code: '+506' },
  { value: 'Panama', label: 'Panamá', flag: '\u{1F1F5}\u{1F1E6}', code: '+507' },
  { value: 'Uruguay', label: 'Uruguay', flag: '\u{1F1FA}\u{1F1FE}', code: '+598' },
  { value: 'Paraguay', label: 'Paraguay', flag: '\u{1F1F5}\u{1F1FE}', code: '+595' },
  { value: 'Bolivia', label: 'Bolivia', flag: '\u{1F1E7}\u{1F1F4}', code: '+591' },
  { value: 'Venezuela', label: 'Venezuela', flag: '\u{1F1FB}\u{1F1EA}', code: '+58' },
  { value: 'Guatemala', label: 'Guatemala', flag: '\u{1F1EC}\u{1F1F9}', code: '+502' },
  { value: 'Honduras', label: 'Honduras', flag: '\u{1F1ED}\u{1F1F3}', code: '+504' },
  { value: 'El Salvador', label: 'El Salvador', flag: '\u{1F1F8}\u{1F1FB}', code: '+503' },
  { value: 'Nicaragua', label: 'Nicaragua', flag: '\u{1F1F3}\u{1F1EE}', code: '+505' },
  { value: 'Republica Dominicana', label: 'República Dominicana', flag: '\u{1F1E9}\u{1F1F4}', code: '+1' },
  { value: 'Puerto Rico', label: 'Puerto Rico', flag: '\u{1F1F5}\u{1F1F7}', code: '+1' },
  { value: 'Cuba', label: 'Cuba', flag: '\u{1F1E8}\u{1F1FA}', code: '+53' },
];

// ─── Auth-specific constants ────────────────────────────────────

/** Default phone country for new registrations */
export const DEFAULT_PHONE_COUNTRY = 'Colombia';

/** API debounce delay in ms for name/email existence checks */
export const DEBOUNCE_DELAY_MS = 600;

/** OTP code length */
export const OTP_LENGTH = 6;

/** Shared form label styling for all auth forms */
export const LABEL_CLASS = 'text-[0.8125rem] font-normal';
export const LABEL_STYLE: React.CSSProperties = {
  color: 'var(--auth-text-muted)',
  fontFamily: 'var(--auth-font-body)',
};

/** Auth gradient for the brand panel (dark side) */
export const AUTH_GRADIENT =
  'linear-gradient(135deg, #1C3B57 0%, #1a3450 40%, #1e4a5e 70%, #265e6a 100%)';

/** Radial glow overlay for brand panel */
export const AUTH_RADIAL_GLOW =
  'radial-gradient(ellipse at 20% 80%, rgba(13, 148, 136, 0.15) 0%, transparent 60%)';
