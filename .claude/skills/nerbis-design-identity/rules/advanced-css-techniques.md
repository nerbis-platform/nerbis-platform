# Advanced CSS Techniques for Premium Interfaces (2025-2026)

Reference guide of modern CSS techniques used by top-tier design systems (Apple, Vercel, Linear, Stripe) to create distinctive, premium-feeling interfaces. Each technique includes production-ready code, performance notes, and browser support.

---

## 1. CSS Grain/Noise Texture Overlays

Subtle film grain adds analog warmth and tactile depth to digital surfaces. Premium design systems use this to break the "too-clean digital" feel, especially on dark backgrounds, hero sections, and cards.

### Technique A: Inline SVG Filter via Data URI (Recommended)

The lightest approach -- no external files, pure CSS with an embedded SVG filter in a pseudo-element:

```css
.grain-overlay {
  position: relative;
  overflow: hidden;
}

.grain-overlay::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 182px;
  opacity: 0.12;
  pointer-events: none;
  z-index: 1;
}

/* Content must sit above the grain */
.grain-overlay > * {
  position: relative;
  z-index: 2;
}
```

### Technique B: SVG Filter with Displacement (Richer Effect)

For gradients where you want grain integrated into the color rather than layered on top:

```html
<svg width="0" height="0" aria-hidden="true" style="position:fixed">
  <filter id="grain" color-interpolation-filters="sRGB"
          x="0" y="0" width="1" height="1">
    <feTurbulence type="fractalNoise" baseFrequency=".9713" numOctaves="4"/>
    <feDisplacementMap in="SourceGraphic" scale="150"
                       xChannelSelector="R"/>
    <feBlend in2="SourceGraphic"/>
  </filter>
</svg>
```

```css
.grainy-gradient {
  background: linear-gradient(90deg, #a9613a, #1e1816);
  clip-path: inset(0);
  filter: url(#grain);
}
```

### Tuning Parameters

| Parameter | Effect | Recommended Range |
|-----------|--------|-------------------|
| `baseFrequency` | Grain fineness (higher = finer) | 0.5 - 0.9 |
| `numOctaves` | Grain complexity | 3-4 (higher = more CPU) |
| `scale` | Displacement intensity | 40 (masks), 150 (gradients) |
| `opacity` | Subtlety of overlay | 0.05 - 0.15 |
| `background-size` | Texture tile size | 150px - 250px |

### Performance Notes

- SVG filters are resolution-independent and tiny (~200 bytes inline)
- Apply to pseudo-elements, never directly to elements with text (causes blur)
- Use `pointer-events: none` on the overlay so it does not block interactions
- Avoid applying to large viewport-covering elements on low-end devices

---

## 2. Glassmorphism with backdrop-filter

Production-ready in 2025-2026 with ~95% global browser support. The modern approach uses restraint -- subtle frosted glass, not heavy blur.

### Restrained Glassmorphism (Premium Approach)

```css
.glass-panel {
  background: color-mix(in oklch, var(--color-surface-default), transparent 70%);
  backdrop-filter: blur(12px) saturate(1.5);
  -webkit-backdrop-filter: blur(12px) saturate(1.5);
  border: 1px solid color-mix(in oklch, var(--color-border-default), transparent 80%);
  border-radius: 12px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 2px 8px rgba(0, 0, 0, 0.08);
}
```

### Dark Mode Glassmorphism

```css
[data-theme="dark"] .glass-panel {
  background: color-mix(in oklch, oklch(0.15 0 0), transparent 40%);
  backdrop-filter: blur(16px) saturate(1.8) brightness(0.8);
  -webkit-backdrop-filter: blur(16px) saturate(1.8) brightness(0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.03) inset,
    0 4px 24px rgba(0, 0, 0, 0.3);
}
```

### Glass Navigation Bar

```css
.glass-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in oklch, var(--color-surface-default), transparent 50%);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  border-bottom: 1px solid color-mix(in oklch, var(--color-border-default), transparent 70%);
  transition: background 150ms ease-out;
}

/* Increase opacity on scroll (pair with scroll-driven animation) */
.glass-nav.scrolled {
  background: color-mix(in oklch, var(--color-surface-default), transparent 20%);
}
```

### Performance Rules

- Keep blur values between **8-16px** (higher values are exponentially more expensive)
- **Never** apply `backdrop-filter` to large areas or many simultaneous elements
- Always include `-webkit-backdrop-filter` for Safari
- Use `will-change: backdrop-filter` only if you see stutter during transitions
- Provide a solid-background fallback for unsupported browsers:

```css
@supports not (backdrop-filter: blur(1px)) {
  .glass-panel {
    background: var(--color-surface-default);
  }
}
```

---

## 3. CSS Scroll-Driven Animations

Replace JavaScript scroll listeners with pure CSS. Animations progress based on scroll position rather than time. Runs on the compositor thread for buttery 60fps performance.

### Reading Progress Bar

```css
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-brand-primary);
  transform-origin: left center;
  z-index: 100;
  animation: progress-scale linear;
  animation-timeline: scroll(root block);
}

@keyframes progress-scale {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

### Fade-In on Scroll (View Timeline)

```css
.fade-in-section {
  opacity: 0;
  animation: fade-up ease-out forwards;
  animation-timeline: view();
  animation-range: entry 0% entry 40%;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Parallax Background (No JS)

```css
.hero-bg {
  position: absolute;
  inset: 0;
  background: url("hero.webp") center / cover;
  animation: parallax linear;
  animation-timeline: view();
  animation-range: entry 0% exit 100%;
}

@keyframes parallax {
  from { transform: translateY(0) scale(1.15); }
  to { transform: translateY(-80px) scale(1); }
}
```

### Staggered Card Reveal

```css
.card {
  opacity: 0;
  animation: card-enter ease-out forwards;
  animation-timeline: view();
  animation-range: entry 0% entry 50%;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(32px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### Image Curtain Reveal

```css
.image-reveal {
  position: relative;
  overflow: hidden;
}

.image-reveal::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--color-surface-default);
  transform-origin: left;
  animation: curtain ease-in-out;
  animation-timeline: view();
  animation-range: entry 10% entry 80%;
}

@keyframes curtain {
  0% { transform: scaleX(1); }
  100% { transform: scaleX(0); }
}
```

### Named Scroll Timeline (Horizontal Gallery)

```css
.gallery-wrapper {
  overflow-x: auto;
  scroll-timeline-name: --gallery;
  scroll-timeline-axis: inline;
}

.gallery-item {
  animation: gallery-scale linear;
  animation-timeline: --gallery;
}

@keyframes gallery-scale {
  0%, 100% { transform: scale(0.85); filter: brightness(0.7); }
  50% { transform: scale(1); filter: brightness(1); }
}
```

### Feature Detection + Accessibility

```css
@supports (animation-timeline: scroll()) {
  /* scroll-driven animations here */
}

@supports not (animation-timeline: scroll()) {
  /* fallback: time-based animation or no animation */
  .fade-in-section {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    animation-timeline: auto !important;
  }
}
```

### Browser Support

- Chrome 115+, Edge 115+, Opera 101+
- Safari 26+ (shipped late 2025)
- Firefox: behind flag (check caniuse)

---

## 4. View Transitions API

Native page transitions without JavaScript animation frameworks. Works for both SPAs and MPAs (multi-page apps).

### Enable for Multi-Page Apps (MPA)

```css
@view-transition {
  navigation: auto;
}
```

### Name Elements for Individual Transitions

```css
.page-title {
  view-transition-name: page-title;
}

.hero-image {
  view-transition-name: hero-image;
}

.main-content {
  view-transition-name: main-content;
}
```

### Custom Page Transition (Slide Up)

```css
@keyframes slide-out-up {
  from { transform: translateY(0%); }
  to { transform: translateY(-100%); }
}

@keyframes slide-in-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0%); }
}

::view-transition-old(root) {
  animation: 0.35s ease-in both slide-out-up;
}

::view-transition-new(root) {
  animation: 0.35s ease-out both slide-in-up;
}
```

### Cross-Fade with Custom Duration

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 300ms;
}
```

### Element-Specific Morph Transition

```css
::view-transition-group(hero-image) {
  animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Scale effect on specific element */
::view-transition-old(page-title) {
  animation: 250ms ease-in both shrink-x;
}

::view-transition-new(page-title) {
  animation: 250ms 250ms ease-out both grow-x;
}

@keyframes shrink-x {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

@keyframes grow-x {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

### SPA Trigger (JavaScript)

```javascript
document.startViewTransition(async () => {
  // Update the DOM here
  await updateContent();
});
```

### React 19 Integration

```tsx
import { unstable_ViewTransition as ViewTransition } from "react";

function App() {
  return (
    <ViewTransition>
      <Routes />
    </ViewTransition>
  );
}
```

### Pseudo-Element Tree Reference

```
::view-transition
  ::view-transition-group(name)
    ::view-transition-image-pair(name)
      ::view-transition-old(name)
      ::view-transition-new(name)
```

### Browser Support

- Chrome 111+, Edge 111+, Opera 97+
- Safari 18+ (same-document), Safari 18.2+ (cross-document)
- Firefox 144+ (Interop 2025 focus area)

---

## 5. Container Queries

Component-responsive design: components adapt to their container size, not the viewport. This is the shift from "responsive design" to "intrinsic design."

### Basic Setup

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Compact layout */
@container card (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .card-image {
    aspect-ratio: 16 / 9;
  }
}

/* Horizontal layout */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 16px;
  }
}

/* Feature-rich layout */
@container card (min-width: 600px) {
  .card {
    grid-template-columns: 280px 1fr auto;
  }
  .card-actions {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}
```

### Navigation Component

```css
.nav-wrapper {
  container-type: inline-size;
  container-name: nav;
}

/* Hamburger mode */
@container nav (max-width: 599px) {
  .nav-links {
    display: none;
  }
  .nav-toggle {
    display: block;
  }
}

/* Full navigation */
@container nav (min-width: 600px) {
  .nav-links {
    display: flex;
    gap: 24px;
  }
  .nav-toggle {
    display: none;
  }
}
```

### Style Queries (Experimental -- Chrome 111+/Edge 111+ only)

```css
.card-container {
  --variant: default;
}

@container style(--variant: featured) {
  .card {
    border: 2px solid var(--color-brand-primary);
    background: color-mix(in oklch, var(--color-brand-primary), transparent 95%);
  }
}
```

### Container Query Units

```css
/* cqw = container query width, cqh = container query height */
.responsive-text {
  font-size: clamp(0.875rem, 3cqw, 1.25rem);
}

.responsive-padding {
  padding: clamp(12px, 4cqw, 32px);
}
```

### Browser Support

- Size queries: Chrome 105+, Firefox 110+, Safari 16+, Edge 105+ (95%+ global, 2026)
- Style queries: Chrome 111+, Edge 111+ only (Firefox/Safari still developing)

---

## 6. CSS color-mix()

Dynamic color manipulation directly in CSS -- no Sass, no JS, no hardcoded hex variants.

### Hover/Active State Generation

```css
:root {
  --brand: oklch(0.65 0.2 250);
}

.btn-primary {
  background: var(--brand);
}

.btn-primary:hover {
  background: color-mix(in oklch, var(--brand), black 15%);
}

.btn-primary:active {
  background: color-mix(in oklch, var(--brand), black 25%);
}

.btn-primary:disabled {
  background: color-mix(in oklch, var(--brand), transparent 60%);
}
```

### Full Palette from One Brand Color

```css
:root {
  --brand: oklch(0.65 0.2 250);

  /* Lighter variants */
  --brand-50:  color-mix(in oklch, var(--brand), white 90%);
  --brand-100: color-mix(in oklch, var(--brand), white 80%);
  --brand-200: color-mix(in oklch, var(--brand), white 60%);
  --brand-300: color-mix(in oklch, var(--brand), white 40%);
  --brand-400: color-mix(in oklch, var(--brand), white 20%);

  /* Base */
  --brand-500: var(--brand);

  /* Darker variants */
  --brand-600: color-mix(in oklch, var(--brand), black 15%);
  --brand-700: color-mix(in oklch, var(--brand), black 30%);
  --brand-800: color-mix(in oklch, var(--brand), black 50%);
  --brand-900: color-mix(in oklch, var(--brand), black 70%);
}
```

### Semantic Surface Tokens with Transparency

```css
:root {
  --surface-overlay: color-mix(in oklch, var(--color-surface-default), transparent 50%);
  --surface-hover: color-mix(in oklch, var(--color-surface-default), var(--brand) 5%);
  --surface-active: color-mix(in oklch, var(--color-surface-default), var(--brand) 10%);
  --border-subtle: color-mix(in oklch, var(--color-border-default), transparent 70%);
}
```

### Multi-Tenant Dynamic Theming

```css
/* Tenant accent injected as CSS variable */
:root {
  --tenant-accent: oklch(0.65 0.2 250); /* overridden per tenant */
}

.tenant-branded {
  --btn-bg: var(--tenant-accent);
  --btn-hover: color-mix(in oklch, var(--tenant-accent), black 12%);
  --btn-ring: color-mix(in oklch, var(--tenant-accent), transparent 70%);
  --surface-tinted: color-mix(in oklch, var(--tenant-accent), transparent 95%);
  --border-accent: color-mix(in oklch, var(--tenant-accent), transparent 60%);
}
```

### Why OKLCH over sRGB

Mixing complementary colors in sRGB produces muddy results. OKLCH produces perceptually uniform, vibrant mixes. Always use `color-mix(in oklch, ...)` for design system tokens.

### Browser Support

- Chrome 111+, Firefox 113+, Safari 16.4+, Edge 111+ -- Baseline Widely Available (2025)

---

## 7. CSS Subgrid

Nested grid children align to the parent's grid tracks. Eliminates the alignment inconsistency plague in card grids, form layouts, and dashboards.

### Aligned Card Grid

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 4; /* Reserve: image, title, description, CTA */
  gap: 0;
}

.card-image { /* row 1 */ }
.card-title { padding: 16px 16px 8px; /* row 2 */ }
.card-description { padding: 0 16px; /* row 3 */ }
.card-cta {
  padding: 16px;
  align-self: end; /* row 4 -- always aligned across cards */
}
```

### Form with Aligned Labels and Inputs

```css
.form-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px 16px;
}

.form-field {
  display: grid;
  grid-column: span 2;
  grid-template-columns: subgrid;
  align-items: center;
}

.form-field label {
  text-align: right;
}
```

### Table-Like Layout with Semantic HTML

```css
.data-list {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 1px;
}

.data-row {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border-default);
}
```

### Dashboard Panel Layout

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto auto 1fr;
  gap: 16px;
}

.widget {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 2; /* header + content */
}

.widget-header { /* inherits parent row sizing */ }
.widget-content { /* inherits parent row sizing */ }
```

### Feature Detection Fallback

```css
@supports not (grid-template-columns: subgrid) {
  .card {
    display: flex;
    flex-direction: column;
  }
  .card-cta {
    margin-top: auto;
  }
}
```

### Browser Support

- Chrome 117+, Firefox 71+, Safari 16+, Edge 117+ -- 97%+ global coverage (2026)

---

## 8. CSS :has() Selector

The "parent selector" CSS always needed. Style parents based on children, style elements based on siblings. Most-loved CSS feature in State of CSS 2025.

### Form Validation (No JS)

```css
/* Highlight group when input is focused */
.form-group:has(input:focus) {
  border-color: var(--color-brand-primary);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-brand-primary), transparent 85%);
}

/* Error state when invalid and user has typed */
.form-group:has(input:invalid:not(:placeholder-shown)) {
  border-color: var(--color-error);
}

/* Floating label */
.form-group:has(input:not(:placeholder-shown)) label,
.form-group:has(input:focus) label {
  transform: translateY(-1.5rem) scale(0.85);
  color: var(--color-brand-primary);
}

/* Disable submit until all required fields filled */
form:has(input:required:placeholder-shown) button[type="submit"] {
  opacity: 0.5;
  pointer-events: none;
}
```

### Adaptive Card Layouts

```css
/* Cards with images get horizontal layout */
.card:has(img) {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 16px;
}

/* Cards without images get vertical layout */
.card:not(:has(img)) {
  display: flex;
  flex-direction: column;
}
```

### Conditional Page Layout

```css
/* Two-column when sidebar exists */
.content:has(aside) {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 32px;
}

/* Centered prose when no sidebar */
.content:not(:has(aside)) {
  max-width: 65ch;
  margin-inline: auto;
}
```

### Dark Mode Toggle (Pure CSS)

```css
body:has(#dark-toggle:checked) {
  --color-surface-default: oklch(0.15 0 0);
  --color-text-default: oklch(0.9 0 0);
  --color-border-default: oklch(0.25 0 0);
}
```

### Previous Sibling Styling

```css
/* Style the item BEFORE the hovered item */
li:has(+ li:hover) {
  opacity: 0.7;
  transform: scale(0.98);
}
```

### Combined with Container Queries

```css
@container card (min-width: 400px) {
  .card:has(img) {
    grid-template-columns: 150px 1fr;
  }
}
```

### Performance Rules

1. **Never** use `body:has(.class)` -- forces full DOM scan
2. **Always** use child combinator: `.parent:has(> .child)` over `.parent:has(.child)`
3. Avoid deeply nested `:has()` chains
4. Cannot nest `:has()` inside another `:has()`

### Browser Support

- Chrome 105+, Safari 15.4+, Firefox 121+, Edge 105+ -- 95%+ global (2026)

---

## 9. CSS Anchor Positioning

Position tooltips, popovers, and dropdowns relative to their trigger elements using pure CSS. No more JavaScript positioning libraries (Popper.js, Floating UI).

### Basic Tooltip

```css
.trigger {
  anchor-name: --tooltip-trigger;
}

.tooltip {
  position: absolute;
  position-anchor: --tooltip-trigger;
  position-area: top center;
  margin-bottom: 8px;

  /* Automatic flip when no space */
  position-try-fallbacks: flip-block;
}
```

### Dropdown Menu

```css
.dropdown-trigger {
  anchor-name: --dropdown;
}

.dropdown-menu {
  position: absolute;
  position-anchor: --dropdown;
  position-area: bottom span-right;
  margin-top: 4px;

  /* Try multiple positions */
  position-try-fallbacks: flip-block, flip-inline, bottom span-left;
}
```

### With Popover API (Accessible)

```html
<button popovertarget="info" style="anchor-name: --info-btn">Info</button>

<div id="info" popover style="position-anchor: --info-btn; position-area: top center;">
  Tooltip content here
</div>
```

```css
[popover] {
  position: absolute;
  margin: 0;
  padding: 8px 12px;
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  background: var(--color-surface-elevated);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);

  /* Entrance animation */
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 150ms ease-out,
              transform 150ms ease-out,
              display 150ms allow-discrete;

  &:popover-open {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Position Area Grid Reference

```
/*  The anchor sits in the center of a 3x3 grid:
 *
 *  top left     |  top center     |  top right
 *  center left  |  [ANCHOR]       |  center right
 *  bottom left  |  bottom center  |  bottom right
 */
```

### Browser Support

- Chrome 125+, Edge 125+ -- **Experimental, not yet recommended for production**
- Safari/Firefox: not yet supported (2026)
- Use progressive enhancement with JS fallback

---

## 10. Animated Mesh Gradients

Premium background animations without WebGL. Multiple techniques from universally supported to cutting-edge.

### Technique A: Background-Position Pan (99%+ Support)

```css
.mesh-gradient {
  background: linear-gradient(
    -45deg,
    oklch(0.7 0.15 30),
    oklch(0.6 0.2 350),
    oklch(0.65 0.15 250),
    oklch(0.7 0.12 160)
  );
  background-size: 400% 400%;
  animation: gradient-shift 20s ease infinite;
}

@keyframes gradient-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

### Technique B: Multi-Layer Radial Mesh

```css
.mesh-gradient-rich {
  position: relative;
  overflow: hidden;
}

.mesh-gradient-rich::before,
.mesh-gradient-rich::after {
  content: "";
  position: absolute;
  inset: -50%;
  border-radius: 40%;
}

.mesh-gradient-rich::before {
  background: radial-gradient(circle at 30% 40%,
    oklch(0.7 0.18 250) 0%, transparent 60%);
  animation: mesh-rotate 25s linear infinite;
}

.mesh-gradient-rich::after {
  background: radial-gradient(circle at 70% 60%,
    oklch(0.65 0.2 350) 0%, transparent 60%);
  animation: mesh-rotate 30s linear infinite reverse;
}

@keyframes mesh-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### Technique C: CSS Houdini @property (Actual Color Animation)

The only method that truly animates gradient color stops. No Firefox support as of early 2026.

```css
@property --gradient-a {
  syntax: "<color>";
  initial-value: oklch(0.7 0.15 30);
  inherits: false;
}

@property --gradient-b {
  syntax: "<color>";
  initial-value: oklch(0.6 0.2 350);
  inherits: false;
}

.houdini-mesh {
  background: linear-gradient(135deg, var(--gradient-a), var(--gradient-b));
  animation: color-cycle 12s ease-in-out infinite;
}

@keyframes color-cycle {
  0%, 100% {
    --gradient-a: oklch(0.7 0.15 30);
    --gradient-b: oklch(0.6 0.2 350);
  }
  33% {
    --gradient-a: oklch(0.65 0.15 250);
    --gradient-b: oklch(0.7 0.12 160);
  }
  66% {
    --gradient-a: oklch(0.6 0.2 290);
    --gradient-b: oklch(0.7 0.15 30);
  }
}
```

### Performance Rules

- Duration: 15-30 seconds for subtle ambient effects
- Avoid multiple simultaneous gradient animations
- Use `will-change: background-position` only when stuttering is observed
- Always implement `@media (prefers-reduced-motion: reduce)`

---

## 11. Custom Cursor Styles

Subtle brand touches through cursor customization. Use sparingly -- only on specific interactive surfaces.

### Brand Cursor via SVG Data URI

```css
.interactive-canvas {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='10' fill='none' stroke='%23666' stroke-width='1.5'/%3E%3Ccircle cx='12' cy='12' r='3' fill='%23666'/%3E%3C/svg%3E") 12 12, crosshair;
}
```

### Cursor State Changes

```css
/* Drag handle */
.draggable {
  cursor: grab;
}
.draggable:active {
  cursor: grabbing;
}

/* Zoom interaction */
.zoomable {
  cursor: zoom-in;
}
.zoomable.zoomed {
  cursor: zoom-out;
}

/* Loading state */
.btn.loading {
  cursor: wait;
  pointer-events: none;
}

/* Disabled elements */
.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
```

### Custom Cursor with Follow Effect (Minimal JS)

```css
.cursor-dot {
  position: fixed;
  width: 8px;
  height: 8px;
  background: var(--color-brand-primary);
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  transition: transform 80ms ease-out;
  mix-blend-mode: difference;
}

.cursor-dot.hovering-link {
  transform: scale(4);
  opacity: 0.5;
}
```

### Rules

- **Never** replace the default cursor globally
- Custom cursors must include a fallback: `cursor: url(...), auto`
- Keep SVG cursors under 32x32px for cross-browser compatibility
- Use only on specific interactive zones (canvas, galleries, drag surfaces)

---

## 12. Selection Styling (::selection)

Brand the text selection color. Small detail that signals intentional design.

```css
::selection {
  background: color-mix(in oklch, var(--color-brand-primary), transparent 70%);
  color: var(--color-text-default);
  -webkit-text-fill-color: var(--color-text-default);
}

/* Dark mode */
[data-theme="dark"] ::selection {
  background: color-mix(in oklch, var(--color-brand-primary), transparent 60%);
  color: oklch(0.95 0 0);
}

/* Code blocks -- different selection color */
pre::selection,
pre *::selection,
code::selection {
  background: color-mix(in oklch, var(--color-brand-primary), transparent 80%);
}
```

### Rules

- Background opacity should be 30-50% -- never fully opaque
- Ensure sufficient contrast between selection background and text
- Test with both light and dark themes
- Only `color`, `background-color`, and `text-shadow` work in `::selection`

---

## 13. Scrollbar Styling

Custom scrollbars that match the design system. Two approaches needed for cross-browser coverage.

### Modern Standard (All Browsers, 2025+)

```css
/* Global scrollbar */
html {
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-default) transparent;
}

/* Specific containers */
.scrollable-panel {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklch, var(--color-text-muted), transparent 50%) transparent;
}

/* Hidden but still scrollable */
.clean-scroll {
  scrollbar-width: none;
}
```

### WebKit Enhancement (Chrome, Safari, Edge)

```css
/* Pair with standard properties for full coverage */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: color-mix(in oklch, var(--color-text-muted), transparent 60%);
  border-radius: 100px;
  border: 2px solid transparent;
  background-clip: content-box;
}

::-webkit-scrollbar-thumb:hover {
  background: color-mix(in oklch, var(--color-text-muted), transparent 30%);
  background-clip: content-box;
}
```

### Auto-Hiding Scrollbar Pattern

```css
.auto-hide-scroll {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  transition: scrollbar-color 300ms ease-out;
}

.auto-hide-scroll:hover {
  scrollbar-color: color-mix(in oklch, var(--color-text-muted), transparent 50%) transparent;
}
```

### Scrollbar Gutter (Prevent Layout Shift)

```css
.sidebar {
  overflow-y: auto;
  scrollbar-gutter: stable;
}

/* Both sides for centered content */
.centered-scroll {
  overflow-y: auto;
  scrollbar-gutter: stable both-edges;
}
```

### Dark Mode

```css
[data-theme="dark"] {
  scrollbar-color: oklch(0.35 0 0) transparent;
}

[data-theme="dark"] ::-webkit-scrollbar-thumb {
  background: oklch(0.35 0 0);
  border: 2px solid transparent;
  background-clip: content-box;
}
```

---

## 14. Focus-Within Patterns

Style containers based on any descendant having focus. Critical for form UX and card interactions.

### Form Group Enhancement

```css
.form-group {
  padding: 12px 16px;
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
}

.form-group:focus-within {
  border-color: var(--color-brand-primary);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-brand-primary), transparent 85%);
}

.form-group:focus-within label {
  color: var(--color-brand-primary);
}
```

### Search Bar Expansion

```css
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  width: 240px;
  transition: width 200ms ease-out, border-color 150ms ease-out;
}

.search-bar:focus-within {
  width: 360px;
  border-color: var(--color-brand-primary);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-brand-primary), transparent 85%);
}

.search-bar:focus-within .search-icon {
  color: var(--color-brand-primary);
}
```

### Interactive Card

```css
.interactive-card {
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  padding: 24px;
  transition: border-color 150ms ease-out, box-shadow 200ms ease-out;
}

.interactive-card:focus-within {
  border-color: var(--color-brand-primary);
  box-shadow:
    0 0 0 1px var(--color-brand-primary),
    0 4px 16px rgba(0, 0, 0, 0.08);
}

/* Show actions only when card has focus */
.interactive-card .card-actions {
  opacity: 0;
  transition: opacity 150ms ease-out;
}

.interactive-card:focus-within .card-actions {
  opacity: 1;
}
```

### Dropdown/Select Container

```css
.select-wrapper {
  position: relative;
}

.select-wrapper:focus-within .dropdown-options {
  display: block;
  opacity: 1;
  transform: translateY(0);
}

.select-wrapper:focus-within .chevron-icon {
  transform: rotate(180deg);
}
```

### Combined with :has() for Advanced Patterns

```css
/* Style form group differently if it contains an invalid focused input */
.form-group:focus-within:has(input:invalid:not(:placeholder-shown)) {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-error), transparent 85%);
}

.form-group:focus-within:has(input:invalid:not(:placeholder-shown)) label {
  color: var(--color-error);
}
```

---

## Browser Support Summary (April 2026)

| Feature | Chrome | Firefox | Safari | Edge | Global % |
|---------|--------|---------|--------|------|----------|
| Grain (SVG feTurbulence) | All | All | All | All | 99% |
| backdrop-filter | 76+ | 103+ | 9+ | 17+ | 95% |
| Scroll-driven animations | 115+ | Flag | 26+ | 115+ | ~75% |
| View Transitions (SPA) | 111+ | 144+ | 18+ | 111+ | ~85% |
| View Transitions (MPA) | 126+ | Partial | 18.2+ | 126+ | ~75% |
| Container queries (size) | 105+ | 110+ | 16+ | 105+ | 95% |
| color-mix() | 111+ | 113+ | 16.4+ | 111+ | 95% |
| Subgrid | 117+ | 71+ | 16+ | 117+ | 97% |
| :has() | 105+ | 121+ | 15.4+ | 105+ | 95% |
| Anchor positioning | 125+ | No | No | 125+ | ~65% |
| @property (Houdini) | 85+ | No | 15.4+ | 85+ | ~80% |
| scrollbar-width/color | 121+ | 64+ | n/a | 121+ | ~85% |
| ::selection | All | All | All | All | 99% |
| :focus-within | 60+ | 52+ | 10.1+ | 79+ | 98% |

## Progressive Enhancement Strategy

Always layer these techniques with feature detection:

```css
/* Base experience (works everywhere) */
.component { /* solid, functional styles */ }

/* Enhanced experience */
@supports (animation-timeline: scroll()) {
  .component { /* scroll-driven animations */ }
}

@supports (container-type: inline-size) {
  .component { /* container-responsive styles */ }
}

@supports (anchor-name: --a) {
  .tooltip { /* anchor positioning */ }
}

/* Accessibility always */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
