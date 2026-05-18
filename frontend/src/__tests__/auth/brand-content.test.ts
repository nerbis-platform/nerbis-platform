import { describe, it, expect } from 'vitest';
import { brandSlides } from '@/components/auth/brand-content';

describe('brandSlides', () => {
  it('contains at least one slide', () => {
    expect(brandSlides.length).toBeGreaterThan(0);
  });

  it('every slide has required fields', () => {
    for (const slide of brandSlides) {
      expect(slide.id).toBeTruthy();
      expect(typeof slide.id).toBe('string');
      expect(slide.headline).toBeTruthy();
      expect(slide.subtitle).toBeTruthy();
      expect(Array.isArray(slide.features)).toBe(true);
      expect(slide.features.length).toBeGreaterThan(0);
    }
  });

  it('all slide ids are unique', () => {
    const ids = brandSlides.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('features are non-empty strings', () => {
    for (const slide of brandSlides) {
      for (const feature of slide.features) {
        expect(typeof feature).toBe('string');
        expect(feature.length).toBeGreaterThan(0);
      }
    }
  });
});
