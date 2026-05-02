// ─── Pipe Identity — Barrel Export ────────────────────────
// Re-exporta todo el sistema de identidad de Pipe.

// Tipos
export type {
  PipeMood,
  PipeContext,
  PipeMessageType,
  MouthShape,
  EyeExpression,
  AntennaBehavior,
  MoodConfig,
  ToneCalibration,
  PipeCharacter,
  MoodTransitionRule,
  PipeSizePreset,
} from './types';

// Character sheet
export { PIPE_CHARACTER } from './character';

// Mood configurations
export { MOOD_CONFIGS, MOOD_TRANSITIONS, isValidTransition } from './moods';

// Animations
export { PIPE_KEYFRAMES, PIPE_ANIMATION_NAMES } from './animations';
export type { PipeAnimationName } from './animations';

// Constants
export {
  AGENT_NAME,
  DEFAULT_MOOD,
  NUDGE_DELAY_MS,
  MOOD_TRANSITION_MS,
  TYPING_DELAY_MS,
  FIRST_MESSAGE_DELAY_MS,
  PIPE_COLORS,
  PIPE_SIZES,
  PIPE_FACE_GRADIENT,
  PIPE_SHINE_GRADIENT,
  PIPE_PROPORTIONS,
} from './constants';

// ─── Components ────────────────────────────────────────────

export { PipeAvatar } from './pipe-avatar';
export { PipeMessage, PipeMessageLoading, TypingIndicator } from './pipe-message';
export { PipeBubble } from './pipe-bubble';
export { PipePill } from './pipe-pill';
export { PipeEditorSidebar } from './pipe-editor-sidebar';

// ─── Hooks ─────────────────────────────────────────────────

export { usePipeMood } from './use-pipe-mood';
