// ─── Pipe Identity — Type Definitions ─────────────────────
// Tipos base para el sistema de personalidad de Pipe.

/**
 * Estados de animo de Pipe. Cada mood determina la expresion facial,
 * animacion del cuerpo y comportamiento de la antena.
 */
export type PipeMood =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'happy'
  | 'surprised'
  | 'reading'
  | 'nudge'
  | 'celebrating'
  | 'confused'
  | 'encouraging'
  | 'focused'
  | 'sleepy'
  | 'proud';

/**
 * Contextos de la app donde Pipe puede aparecer.
 * El tono y comportamiento se ajustan segun el contexto.
 */
export type PipeContext = 'onboarding' | 'dashboard' | 'editor' | 'error';

/**
 * Tipo de mensaje que Pipe puede enviar.
 */
export type PipeMessageType =
  | 'greeting'
  | 'tip'
  | 'encouragement'
  | 'question'
  | 'celebration'
  | 'error'
  | 'nudge'
  | 'progress';

/**
 * SVG para la boca de Pipe. Puede ser un path (curvas) o una elipse.
 */
export type MouthShape =
  | { type: 'path'; d: string; fill?: string; strokeWidth?: number }
  | { type: 'ellipse'; rx: number; ry: number; offsetY?: number; opacity?: number }
  | { type: 'line'; x1: number; x2: number; offsetY?: number; opacity?: number };

/**
 * Expresion de los ojos para un mood dado.
 * Los valores son multiplicadores relativos al tamano base.
 */
export interface EyeExpression {
  /** Multiplicador del radio X del ojo (1 = normal) */
  rxScale: number;
  /** Multiplicador del radio Y del ojo (1 = normal) */
  ryScale: number;
  /** Si los ojos parpadean en este mood */
  blinks: boolean;
  /** Offset Y adicional de la pupila (para mirar abajo al leer, etc.) */
  pupilOffsetY?: number;
  /** Multiplicador del tamano de la pupila */
  pupilScale?: number;
}

/**
 * Comportamiento de la antena para un mood dado.
 */
export interface AntennaBehavior {
  /** Nombre de la animacion CSS de la antena */
  animation: string;
  /** Duracion de la animacion */
  duration: string;
  /** Opacidad base del tallo */
  stalkOpacity: number;
  /** Color de glow (override del default cyan) */
  glowColor?: string;
}

/**
 * Configuracion completa de un mood de Pipe.
 */
export interface MoodConfig {
  /** Forma de la boca (path SVG, elipse, o linea) */
  mouth: MouthShape;
  /** Expresion de los ojos */
  eyes: EyeExpression;
  /** Comportamiento de la antena */
  antenna: AntennaBehavior;
  /** Nombre de la animacion CSS del cuerpo */
  bodyAnimation: string;
  /** Duracion de la animacion del cuerpo */
  bodyAnimationDuration: string;
  /** Iteracion de la animacion (infinite, 1, etc.) */
  bodyAnimationIteration?: string;
}

/**
 * Calibracion de tono segun contexto.
 */
export interface ToneCalibration {
  /** Nivel de calidez (0-1, donde 1 = muy calido) */
  warmth: number;
  /** Nivel de formalidad (0-1, donde 1 = muy formal) */
  formality: number;
  /** Frecuencia de emojis (0-1, donde 0 = nunca) */
  emojiFrequency: number;
  /** Largo maximo de mensajes (caracteres aprox) */
  maxMessageLength: number;
  /** Ejemplo de tono en este contexto */
  toneExample: string;
}

/**
 * Definicion completa del personaje Pipe.
 */
export interface PipeCharacter {
  /** Nombre del agente */
  name: string;
  /** Arquetipo del personaje */
  archetype: string;
  /** Descripcion breve */
  description: string;
  /** Rasgos de personalidad */
  traits: readonly string[];
  /** Reglas de tono */
  toneRules: readonly string[];
  /** Frases firma de Pipe */
  signaturePhrases: readonly string[];
  /** Lo que Pipe NUNCA hace */
  boundaries: readonly string[];
  /** Manierismos del personaje */
  mannerisms: readonly string[];
  /** Calibracion de tono por contexto */
  toneByContext: Record<PipeContext, ToneCalibration>;
}

/**
 * Regla de transicion entre moods.
 * Define desde que mood se puede ir a cuales otros.
 */
export interface MoodTransitionRule {
  from: PipeMood;
  to: readonly PipeMood[];
}

/**
 * Preset de tamano para el avatar de Pipe.
 */
export interface PipeSizePreset {
  /** Tamano en pixeles */
  size: number;
  /** Label descriptivo */
  label: string;
}
