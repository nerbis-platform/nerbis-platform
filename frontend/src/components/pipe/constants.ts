// ─── Pipe Identity — Constants ────────────────────────────
// Constantes globales para el sistema Pipe.
// Colores extraidos del NERBIS design system (no hardcodeados en componentes).

import type { PipeMood, PipeSizePreset } from './types';

/** Nombre del agente IA de NERBIS */
export const AGENT_NAME = 'Pipe' as const;

/** Mood por defecto cuando no se especifica */
export const DEFAULT_MOOD: PipeMood = 'idle';

/** Milisegundos antes de que Pipe haga un nudge por inactividad */
export const NUDGE_DELAY_MS = 3000;

/** Duracion de la transicion entre moods (en ms) */
export const MOOD_TRANSITION_MS = 300;

/** Delay de la animacion de "typing" en el chat (ms) */
export const TYPING_DELAY_MS = 500;

/** Delay inicial del primer mensaje en onboarding (ms) */
export const FIRST_MESSAGE_DELAY_MS = 800;

/**
 * Colores del sistema de Pipe, alineados con el NERBIS design system.
 *
 * Estos se usan como constantes para SVG inline donde CSS custom properties
 * no estan disponibles (como dentro de <svg> fill/stroke).
 * En componentes normales, usar los tokens semanticos CSS.
 */
export const PIPE_COLORS = {
  /** Teal primario de NERBIS — color principal de Pipe */
  teal: '#0D9488',
  /** Teal claro — gradiente de la cara */
  tealLight: '#14B8A6',
  /** Navy — pupilas, sombras, texto */
  navy: '#1C3B57',
  /** Cyan — antena y efectos de glow */
  cyan: '#5EEAD4',
  /** Cyan brillante — glow intenso de la antena */
  cyanBright: '#2DD4BF',
  /** Blanco — ojos, boca */
  white: '#FFFFFF',
  /** Fondo calido claro */
  warmGray50: '#FAFAF8',
  /** Fondo calido */
  warmGray100: '#F5F5F0',
  /** Bordes suaves */
  warmGray200: '#E8E6E1',
  /** Texto secundario */
  warmGray400: '#A8A29E',
  /** Texto medio */
  warmGray500: '#78716C',
  /** Texto principal secundario */
  warmGray600: '#57534E',
  /** Texto principal */
  warmGray800: '#292524',
} as const;

/**
 * Presets de tamano del avatar de Pipe.
 * Usar estos en vez de valores arbitrarios para mantener consistencia.
 */
export const PIPE_SIZES: Record<'sm' | 'md' | 'lg' | 'xl', PipeSizePreset> = {
  sm: { size: 36, label: 'Pequeno — inline, chat bubbles' },
  md: { size: 48, label: 'Mediano — sidebar, tooltips' },
  lg: { size: 64, label: 'Grande — onboarding, modals' },
  xl: { size: 96, label: 'Extra grande — hero, splash' },
} as const;

/**
 * Gradiente SVG del rostro de Pipe (teal claro a teal).
 * Definido como constante para reusar en todos los tamanos.
 */
export const PIPE_FACE_GRADIENT = {
  x1: '0',
  y1: '0',
  x2: '1',
  y2: '1',
  stops: [
    { offset: '0%', color: PIPE_COLORS.tealLight },
    { offset: '100%', color: PIPE_COLORS.teal },
  ],
} as const;

/**
 * Gradiente de brillo (shine) del rostro de Pipe.
 */
export const PIPE_SHINE_GRADIENT = {
  x1: '0.3',
  y1: '0',
  x2: '0.7',
  y2: '1',
  stops: [
    { offset: '0%', color: PIPE_COLORS.white, opacity: 0.15 },
    { offset: '100%', color: PIPE_COLORS.white, opacity: 0 },
  ],
} as const;

/**
 * Proporciones del avatar de Pipe (relativas al tamano total).
 * Preservadas exactas del quick-start para compatibilidad visual.
 */
export const PIPE_PROPORTIONS = {
  /** Offset de la cabeza respecto al borde */
  headOffset: 0.12,
  /** Tamano de la cabeza */
  headSize: 0.76,
  /** Radio del borde redondeado de la cabeza */
  headRadius: 0.24,
  /** Posicion Y del centro de los ojos */
  eyeCenterY: 0.42,
  /** Posicion X del ojo izquierdo */
  eyeLeftX: 0.36,
  /** Posicion X del ojo derecho */
  eyeRightX: 0.64,
  /** Ancho base del ojo */
  eyeWidth: 0.11,
  /** Alto base del ojo */
  eyeHeight: 0.13,
  /** Posicion Y de la boca */
  mouthY: 0.64,
  /** Radio base de la pupila */
  pupilRadius: 0.035,
  /** Movimiento maximo de la pupila siguiendo el cursor */
  maxPupilMove: 0.025,
  /** Ancho del tallo de la antena */
  antennaWidth: 0.03,
  /** Radio del punto de la antena */
  antennaDotRadius: 0.045,
  /** Posicion Y del inicio de la antena (base) */
  antennaBaseY: 0.13,
  /** Posicion Y del fin de la antena (punta) */
  antennaTipY: 0.03,
  /** Posicion Y del punto de la antena */
  antennaDotY: 0.02,
  /** Offset de la sombra */
  shadowOffset: 0.03,
} as const;
