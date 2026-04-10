# Signature Elements — What Makes NERBIS Recognizable

Every premium brand has visual signatures that make it instantly identifiable without seeing the logo. Stripe has its diagonal gradient. Apple has rounded rectangles + frosted glass. Vercel has pure black + the triangle. Linear has warm muted grays.

NERBIS needs its own signature language.

## NERBIS Visual Signatures

### 1. Warm Grain Texture

A subtle film-grain overlay on hero sections, dark surfaces, and feature backgrounds. This breaks the "too-clean digital" feel and adds analog warmth that AI-generated sites never have.

```css
/* Apply to hero sections, dark panels, featured cards */
.nerbis-grain {
  position: relative;
  overflow: hidden;
}

.nerbis-grain::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 182px;
  opacity: 0.08;
  pointer-events: none;
  z-index: 1;
  mix-blend-mode: overlay;
}
```

**When to use:** Hero sections, dark backgrounds, featured cards, page headers.
**When NOT to use:** Body content, forms, tables, light backgrounds (too subtle to matter).

### 2. Warm Neutral Foundation

NERBIS uses **stone/warm gray** (not zinc, slate, or cool gray). This is a conscious choice that communicates approachability + sophistication — like a well-lit café, not a cold tech office.

```css
/* The NERBIS gray scale — warm undertones */
--primitive-gray-50:  #fafaf9;  /* stone-50 */
--primitive-gray-100: #f5f5f4;  /* stone-100 */
--primitive-gray-200: #e7e5e4;  /* stone-200 */
--primitive-gray-900: #1c1917;  /* stone-900 */
--primitive-gray-950: #0c0a09;  /* stone-950 */
```

**How to tell if you're using the wrong gray:** If the background feels cold, clinical, or blue-ish — switch to stone.

### 3. Restrained Glass Accents

Glassmorphism used ONLY on floating/overlay elements — never as the default surface treatment. This creates depth where it matters (modals, floating nav, command palette) while keeping the base UI clean.

```css
/* Only for: modals, floating nav, command palette, mobile drawer */
.nerbis-glass {
  background: color-mix(in oklch, var(--color-surface-default), transparent 70%);
  backdrop-filter: blur(12px) saturate(1.5);
  -webkit-backdrop-filter: blur(12px) saturate(1.5);
  border: 1px solid color-mix(in oklch, var(--color-border-default), transparent 80%);
}
```

**Rule:** If you're applying glass to more than 2 elements on a page, you're overusing it.

### 4. Tight Display Typography

Headlines with **aggressive negative letter-spacing** (-0.03em to -0.04em) create a dense, premium feel that AI tools never produce (they default to loose spacing).

```css
.nerbis-display {
  font-family: var(--font-sans);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.0;
  text-wrap: balance;
}
```

### 5. Subtle Hover Lift

Interactive cards and buttons get a **1-2px translateY** on hover with a soft shadow bloom. This tactile micro-interaction is the NERBIS "touch" — it makes everything feel like a physical object you can press.

```css
.nerbis-interactive {
  transition: transform 150ms ease-out, box-shadow 150ms ease-out;
}

.nerbis-interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in oklch, var(--color-interactive-default) 15%, transparent);
}

.nerbis-interactive:active {
  transform: translateY(0);
  box-shadow: none;
}
```

### 6. Brand Selection & Scrollbar

Small touches that make the experience feel cohesive even in overlooked areas:

```css
/* Selection color — brand-tinted */
::selection {
  background: color-mix(in oklch, var(--color-interactive-default) 20%, transparent);
  color: var(--color-text-primary);
}

/* Scrollbar — minimal, appears on hover */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--color-border-default);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-strong);
}

/* Standard (Firefox, future Chrome) */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-default) transparent;
}
```

### 7. Focus Ring with Brand Color

Every focusable element gets a **brand-colored focus ring** — not the browser default blue, not invisible. This signals accessibility AND brand consistency.

```css
:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}
```

## The Signature Test

When someone sees a NERBIS page without the logo, they should recognize it by:

1. **Warm gray tones** (not cold/blue)
2. **Subtle grain texture** on dark surfaces
3. **Tight, confident headlines** with negative tracking
4. **Glass accents** on floating elements only
5. **Hover lift** on interactive elements
6. **Brand-colored selection** and custom scrollbar
7. **Functional, specific copy** (no "Get Started", no "Oops!")

## What NERBIS is NOT

| NERBIS is NOT | NERBIS IS |
|---------------|-----------|
| Flashy gradients | Restrained color with one intentional accent |
| Rounded pills everywhere | Consistent 8-12px radius, round only for avatars |
| Animated everything | Motion only where it communicates state |
| Dark for dark's sake | Dark as intentional, premium default |
| Minimal to the point of empty | Information-dense with clear hierarchy |
| A template with a logo swap | A distinctive system recognizable without the logo |

## Multi-Tenant Adaptation

When tenants inject their brand color, the signatures adapt:

- **Grain texture**: unchanged (neutral, not colored)
- **Warm grays**: unchanged (foundation, not brandable)
- **Glass accents**: border tint shifts to tenant brand
- **Display type**: unchanged (system-level, not tenant)
- **Hover lift shadow**: tinted with tenant's brand color
- **Selection color**: uses tenant's brand color
- **Scrollbar**: unchanged (neutral)
- **Focus ring**: uses tenant's brand color
