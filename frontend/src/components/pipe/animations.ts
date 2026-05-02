// ─── Pipe Identity — Animation Keyframes ─────────────────
// Todas las animaciones CSS de Pipe como string constante.
// Se inyectan via <style> tag para evitar problemas con styled-jsx y Turbopack.
//
// Reglas NERBIS de motion:
// - Solo propiedades GPU-accelerated (transform, opacity, filter)
// - Nada supera 500ms por iteracion (excepto loops lentos como float/drift)
// - prefers-reduced-motion es obligatorio

/**
 * Keyframes existentes del quick-start (preservados exactos).
 */
const EXISTING_KEYFRAMES = `
@keyframes pipe-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

@keyframes pipe-bob {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.03); }
}

@keyframes pipe-tilt {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(4deg); }
  75% { transform: rotate(-3deg); }
}

@keyframes pipe-blink {
  0%, 42%, 44%, 100% { transform: scaleY(1); }
  43% { transform: scaleY(0.1); }
}

@keyframes pipe-antenna {
  0%, 100% { opacity: 0.5; filter: drop-shadow(0 0 1px #5EEAD4); }
  50% { opacity: 1; filter: drop-shadow(0 0 4px #5EEAD4); }
}

@keyframes pipe-glow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

@keyframes pipe-mouth-think {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.8); }
}

@keyframes pipe-jump {
  0% { transform: translateY(0) scale(1); }
  40% { transform: translateY(-5px) scale(1.08); }
  70% { transform: translateY(-2px) scale(1.03); }
  100% { transform: translateY(0) scale(1); }
}

@keyframes pipe-nod {
  0%, 100% { transform: rotate(0) translateY(0); }
  30% { transform: rotate(0) translateY(1px); }
  50% { transform: rotate(0) translateY(-1px); }
  70% { transform: rotate(0) translateY(1px); }
}

@keyframes pipe-nudge {
  0% { transform: translateX(0) rotate(0); }
  15% { transform: translateX(-3px) rotate(-6deg); }
  30% { transform: translateX(3px) rotate(6deg); }
  45% { transform: translateX(-2px) rotate(-4deg); }
  60% { transform: translateX(2px) rotate(4deg); }
  75% { transform: translateX(-1px) rotate(-2deg); }
  100% { transform: translateX(0) rotate(0); }
}
`;

/**
 * Keyframes nuevos para los 6 moods adicionales.
 *
 * - celebrate: rebote + escala (la alegria de un logro grande)
 * - wobble: oscilacion lateral (confusion genuina, no juguetona)
 * - pulse-glow: resplandor suave de la antena (aliento sutil)
 * - focus-breathe: respiracion lenta (concentracion profunda)
 * - drift: movimiento lento lateral (somnolencia)
 * - swell: escala ascendente (orgullo contenido)
 */
const NEW_KEYFRAMES = `
@keyframes pipe-celebrate {
  0% { transform: translateY(0) scale(1) rotate(0deg); }
  25% { transform: translateY(-6px) scale(1.1) rotate(3deg); }
  50% { transform: translateY(-2px) scale(1.05) rotate(-2deg); }
  75% { transform: translateY(-5px) scale(1.08) rotate(2deg); }
  100% { transform: translateY(0) scale(1) rotate(0deg); }
}

@keyframes pipe-wobble {
  0%, 100% { transform: rotate(0deg) translateX(0); }
  20% { transform: rotate(-5deg) translateX(-2px); }
  40% { transform: rotate(4deg) translateX(2px); }
  60% { transform: rotate(-3deg) translateX(-1px); }
  80% { transform: rotate(2deg) translateX(1px); }
}

@keyframes pipe-pulse-glow {
  0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 2px #5EEAD4); }
  50% { opacity: 1; filter: drop-shadow(0 0 6px #5EEAD4); }
}

@keyframes pipe-focus-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.015); }
}

@keyframes pipe-drift {
  0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
  25% { transform: translateX(-1px) translateY(-1px) rotate(-1deg); }
  75% { transform: translateX(1px) translateY(-1px) rotate(1deg); }
}

@keyframes pipe-swell {
  0% { transform: scale(1); }
  50% { transform: scale(1.06); }
  100% { transform: scale(1.02); }
}
`;

/**
 * Regla de reduced-motion. Desactiva todas las animaciones de Pipe.
 */
const REDUCED_MOTION = `
@media (prefers-reduced-motion: reduce) {
  .pipe-avatar,
  .pipe-avatar * {
    animation: none !important;
    transition: none !important;
  }
}
`;

/**
 * String completo de CSS keyframes de Pipe.
 * Inyectar en un <style> tag dentro del componente PipeAvatar.
 */
export const PIPE_KEYFRAMES: string = [EXISTING_KEYFRAMES, NEW_KEYFRAMES, REDUCED_MOTION].join(
  '\n'
);

/**
 * Nombres de todas las animaciones disponibles, para referencia y validacion.
 */
export const PIPE_ANIMATION_NAMES = [
  // Existentes
  'pipe-float',
  'pipe-bob',
  'pipe-tilt',
  'pipe-blink',
  'pipe-antenna',
  'pipe-glow',
  'pipe-mouth-think',
  'pipe-jump',
  'pipe-nod',
  'pipe-nudge',
  // Nuevos
  'pipe-celebrate',
  'pipe-wobble',
  'pipe-pulse-glow',
  'pipe-focus-breathe',
  'pipe-drift',
  'pipe-swell',
] as const;

export type PipeAnimationName = (typeof PIPE_ANIMATION_NAMES)[number];
