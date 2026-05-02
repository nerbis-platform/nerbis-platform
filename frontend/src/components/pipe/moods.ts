// ─── Pipe Identity — Mood Configurations ─────────────────
// Configuracion SVG y de animacion para cada mood de Pipe.
// Los valores de mouth/eyes usan multiplicadores relativos al tamano del avatar (s).
// Ejemplo: mouth path con s*0.4 significa 40% del tamano total.

import type { MoodConfig, MoodTransitionRule, PipeMood } from './types';

/**
 * Configuraciones de cada mood de Pipe.
 *
 * Cada mood define: boca (SVG), ojos, antena y animacion del cuerpo.
 * Los 7 moods originales se preservan exactos del quick-start.
 * Los 6 nuevos extienden la expresividad de Pipe.
 */
export const MOOD_CONFIGS: Record<PipeMood, MoodConfig> = {
  // ─── Moods originales (7) ──────────────────────────────

  idle: {
    mouth: { type: 'path', d: 'M 0.4 MOUTH Q 0.5 MOUTH+0.08 0.6 MOUTH', strokeWidth: 0.035 },
    eyes: { rxScale: 1, ryScale: 1, blinks: true },
    antenna: { animation: 'pipe-antenna', duration: '2s', stalkOpacity: 0.8 },
    bodyAnimation: 'pipe-float',
    bodyAnimationDuration: '4s',
  },

  listening: {
    mouth: { type: 'path', d: 'M 0.4 MOUTH Q 0.5 MOUTH+0.08 0.6 MOUTH', strokeWidth: 0.035 },
    eyes: { rxScale: 1, ryScale: 1, blinks: true },
    antenna: { animation: 'pipe-antenna', duration: '2s', stalkOpacity: 0.8 },
    bodyAnimation: 'pipe-tilt',
    bodyAnimationDuration: '3s',
  },

  thinking: {
    mouth: {
      type: 'ellipse',
      rx: 0.045,
      ry: 0.04,
      offsetY: 0.02,
      opacity: 0.9,
    },
    eyes: { rxScale: 1, ryScale: 1, blinks: true },
    antenna: { animation: 'pipe-antenna', duration: '1.5s', stalkOpacity: 1 },
    bodyAnimation: 'pipe-bob',
    bodyAnimationDuration: '2s',
  },

  happy: {
    mouth: { type: 'path', d: 'M 0.35 MOUTH Q 0.5 MOUTH+0.15 0.65 MOUTH', strokeWidth: 0.04 },
    eyes: { rxScale: 1, ryScale: 1, blinks: true },
    antenna: { animation: 'pipe-antenna', duration: '1.5s', stalkOpacity: 1 },
    bodyAnimation: 'pipe-float',
    bodyAnimationDuration: '3s',
  },

  surprised: {
    mouth: { type: 'ellipse', rx: 0.06, ry: 0.07, offsetY: 0.02, opacity: 0.9 },
    eyes: { rxScale: 1.27, ryScale: 1.23, blinks: false },
    antenna: { animation: 'pipe-antenna', duration: '1s', stalkOpacity: 1 },
    bodyAnimation: 'pipe-jump',
    bodyAnimationDuration: '0.4s',
    bodyAnimationIteration: '1',
  },

  reading: {
    mouth: {
      type: 'line',
      x1: 0.42,
      x2: 0.58,
      offsetY: 0.02,
      opacity: 0.8,
    },
    eyes: { rxScale: 1, ryScale: 0.46, blinks: false, pupilOffsetY: 0.01 },
    antenna: { animation: 'pipe-antenna', duration: '3s', stalkOpacity: 0.6 },
    bodyAnimation: 'pipe-nod',
    bodyAnimationDuration: '2.5s',
  },

  nudge: {
    mouth: {
      type: 'path',
      d: 'M 0.37 MOUTH Q 0.5 MOUTH+0.12 0.63 MOUTH',
      fill: 'rgba(255,255,255,0.3)',
      strokeWidth: 0.038,
    },
    eyes: { rxScale: 1.27, ryScale: 1.23, blinks: false, pupilScale: 1.14 },
    antenna: { animation: 'pipe-antenna', duration: '1s', stalkOpacity: 1 },
    bodyAnimation: 'pipe-nudge',
    bodyAnimationDuration: '0.8s',
    bodyAnimationIteration: '1',
  },

  // ─── Moods nuevos (6) ──────────────────────────────────

  celebrating: {
    mouth: { type: 'path', d: 'M 0.32 MOUTH Q 0.5 MOUTH+0.18 0.68 MOUTH', strokeWidth: 0.04 },
    eyes: { rxScale: 1.1, ryScale: 0.7, blinks: false },
    antenna: { animation: 'pipe-antenna', duration: '0.8s', stalkOpacity: 1 },
    bodyAnimation: 'pipe-celebrate',
    bodyAnimationDuration: '0.6s',
    bodyAnimationIteration: '3',
  },

  confused: {
    mouth: {
      type: 'path',
      d: 'M 0.4 MOUTH+0.03 Q 0.45 MOUTH 0.5 MOUTH+0.04 Q 0.55 MOUTH 0.6 MOUTH+0.02',
      strokeWidth: 0.035,
    },
    eyes: { rxScale: 1.1, ryScale: 1.1, blinks: true, pupilScale: 0.9 },
    antenna: { animation: 'pipe-antenna', duration: '2.5s', stalkOpacity: 0.6 },
    bodyAnimation: 'pipe-wobble',
    bodyAnimationDuration: '1.2s',
    bodyAnimationIteration: '2',
  },

  encouraging: {
    mouth: { type: 'path', d: 'M 0.37 MOUTH Q 0.5 MOUTH+0.1 0.63 MOUTH', strokeWidth: 0.038 },
    eyes: { rxScale: 1.05, ryScale: 1.05, blinks: true },
    antenna: {
      animation: 'pipe-pulse-glow',
      duration: '1.5s',
      stalkOpacity: 0.9,
      glowColor: '#5EEAD4',
    },
    bodyAnimation: 'pipe-float',
    bodyAnimationDuration: '3s',
  },

  focused: {
    mouth: { type: 'line', x1: 0.43, x2: 0.57, offsetY: 0.01, opacity: 0.7 },
    eyes: { rxScale: 0.9, ryScale: 0.85, blinks: false, pupilOffsetY: 0.005 },
    antenna: { animation: 'pipe-antenna', duration: '3s', stalkOpacity: 0.5 },
    bodyAnimation: 'pipe-focus-breathe',
    bodyAnimationDuration: '4s',
  },

  sleepy: {
    mouth: { type: 'path', d: 'M 0.42 MOUTH Q 0.5 MOUTH+0.04 0.58 MOUTH', strokeWidth: 0.03 },
    eyes: { rxScale: 0.8, ryScale: 0.25, blinks: false },
    antenna: { animation: 'pipe-antenna', duration: '4s', stalkOpacity: 0.3 },
    bodyAnimation: 'pipe-drift',
    bodyAnimationDuration: '5s',
  },

  proud: {
    mouth: { type: 'path', d: 'M 0.36 MOUTH Q 0.5 MOUTH+0.13 0.64 MOUTH', strokeWidth: 0.04 },
    eyes: { rxScale: 1, ryScale: 0.85, blinks: true },
    antenna: {
      animation: 'pipe-antenna',
      duration: '1.5s',
      stalkOpacity: 1,
      glowColor: '#2DD4BF',
    },
    bodyAnimation: 'pipe-swell',
    bodyAnimationDuration: '1s',
    bodyAnimationIteration: '1',
  },
} as const satisfies Record<PipeMood, MoodConfig>;

/**
 * Reglas de transicion entre moods.
 * Define las transiciones validas para evitar cambios bruscos de expresion.
 * 'idle' es el hub central — todos los moods pueden ir a idle.
 */
export const MOOD_TRANSITIONS: readonly MoodTransitionRule[] = [
  { from: 'idle', to: ['listening', 'thinking', 'happy', 'nudge', 'sleepy', 'focused'] },
  { from: 'listening', to: ['idle', 'thinking', 'happy', 'surprised', 'confused'] },
  { from: 'thinking', to: ['idle', 'happy', 'surprised', 'reading', 'confused', 'focused'] },
  { from: 'happy', to: ['idle', 'celebrating', 'proud', 'encouraging', 'surprised'] },
  { from: 'surprised', to: ['idle', 'happy', 'confused', 'celebrating'] },
  { from: 'reading', to: ['idle', 'thinking', 'happy', 'focused'] },
  { from: 'nudge', to: ['idle', 'listening', 'happy'] },
  { from: 'celebrating', to: ['idle', 'happy', 'proud'] },
  { from: 'confused', to: ['idle', 'thinking', 'encouraging'] },
  { from: 'encouraging', to: ['idle', 'happy', 'proud'] },
  { from: 'focused', to: ['idle', 'thinking', 'happy', 'reading'] },
  { from: 'sleepy', to: ['idle', 'surprised', 'listening'] },
  { from: 'proud', to: ['idle', 'happy', 'celebrating'] },
] as const;

/**
 * Verifica si una transicion de mood es valida.
 */
export function isValidTransition(from: PipeMood, to: PipeMood): boolean {
  if (to === 'idle') return true; // siempre se puede volver a idle
  const rule = MOOD_TRANSITIONS.find((r) => r.from === from);
  return rule ? rule.to.includes(to) : false;
}
