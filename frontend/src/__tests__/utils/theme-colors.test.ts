import { describe, it, expect } from 'vitest';
import {
  deriveHarmonicSecondary,
  wcagContrast,
  wcagLuminance,
} from '@/lib/utils/theme-colors';

const HEX = /^#[0-9a-f]{6}$/i;
const WHITE = '#FFFFFF';
const NEAR_BLACK = '#1A1A1A';
const WCAG_AA_TEXT = 4.5;

/** Mejor contraste contra blanco u oscuro — refleja la heurística del derivador. */
function bestForegroundContrast(hex: string): number {
  return Math.max(wcagContrast(hex, WHITE), wcagContrast(hex, NEAR_BLACK));
}

describe('wcagLuminance', () => {
  it('returns 0 for black and ~1 for white', () => {
    expect(wcagLuminance('#000000')).toBeCloseTo(0, 5);
    expect(wcagLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('wcagContrast', () => {
  it('computes the maximum 21:1 ratio between black and white', () => {
    expect(wcagContrast('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('is symmetric regardless of argument order', () => {
    expect(wcagContrast('#0D9488', '#FFFFFF')).toBeCloseTo(
      wcagContrast('#FFFFFF', '#0D9488'),
      5,
    );
  });

  it('returns 1 for identical colors', () => {
    expect(wcagContrast('#123456', '#123456')).toBeCloseTo(1, 5);
  });
});

describe('deriveHarmonicSecondary', () => {
  const primaries = [
    '#1C3B57', // navy NERBIS
    '#0D9488', // teal NERBIS
    '#DC2626', // rojo
    '#F59E0B', // ámbar claro
    '#7C3AED', // violeta
    '#059669', // verde
    '#FFFFFF', // borde: blanco puro
    '#000000', // borde: negro puro
  ];

  it('always returns a valid 6-digit hex', () => {
    for (const primary of primaries) {
      expect(deriveHarmonicSecondary(primary)).toMatch(HEX);
    }
  });

  it('produces a secondary distinct from the primary hue', () => {
    // El secundario nunca debe ser idéntico al primario (rotación de matiz).
    for (const primary of primaries) {
      const secondary = deriveHarmonicSecondary(primary);
      expect(secondary.toLowerCase()).not.toBe(primary.toLowerCase());
    }
  });

  it('meets WCAG AA (>=4.5:1) against white or dark text for typical brand colors', () => {
    const typical = ['#1C3B57', '#0D9488', '#DC2626', '#F59E0B', '#7C3AED', '#059669'];
    for (const primary of typical) {
      const secondary = deriveHarmonicSecondary(primary);
      expect(bestForegroundContrast(secondary)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    }
  });

  it('is deterministic for the same input', () => {
    for (const primary of primaries) {
      expect(deriveHarmonicSecondary(primary)).toBe(deriveHarmonicSecondary(primary));
    }
  });
});
