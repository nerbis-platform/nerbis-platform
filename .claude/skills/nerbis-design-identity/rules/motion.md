# Motion & Animation

## Duration Standards

| Interaction | Duration | Easing |
|------------|----------|--------|
| Button hover | 150ms | `ease-out` |
| Button press/active | 100ms | `ease-out` |
| Button focus ring | 150ms | `ease-out` |
| Tooltip appear | 200ms | `ease-out` |
| Tooltip disappear | 150ms | `ease-in` |
| Dropdown open | 200ms | `ease-out` |
| Dropdown close | 150ms | `ease-in` |
| Modal enter | 250ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Modal exit | 200ms | `ease-in` |
| Page transition | 300ms | `ease-in-out` |
| Skeleton shimmer | 1.5s | `ease-in-out` (infinite) |
| Toast enter | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Toast exit | 200ms | `ease-in` |
| Sidebar expand/collapse | 250ms | `ease-in-out` |
| Card hover lift | 200ms | `ease-out` |
| Tab switch | 150ms | `ease-in-out` |
| Form validation appear | 200ms | `ease-out` |

## CSS Custom Properties

```css
:root {
  /* Durations */
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-moderate: 250ms;
  --duration-slow: 300ms;
  --duration-deliberate: 500ms;

  /* Easings */
  --ease-default: ease-out;
  --ease-in: ease-in;
  --ease-in-out: ease-in-out;
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Composed transitions */
  --transition-colors: color var(--duration-fast) var(--ease-default),
                       background-color var(--duration-fast) var(--ease-default),
                       border-color var(--duration-fast) var(--ease-default);
  --transition-transform: transform var(--duration-normal) var(--ease-default);
  --transition-opacity: opacity var(--duration-normal) var(--ease-default);
  --transition-shadow: box-shadow var(--duration-fast) var(--ease-default);
}
```

## GPU-Accelerated Properties ONLY

**ANIMATE:**
- `transform` (translate, scale, rotate)
- `opacity`
- `filter` (blur, brightness)
- `clip-path`

**NEVER ANIMATE:**
- `width`, `height` (use `transform: scale()`)
- `top`, `left`, `right`, `bottom` (use `transform: translate()`)
- `margin`, `padding` (causes reflow)
- `border-width` (use `box-shadow` or `outline`)
- `font-size` (use `transform: scale()`)
- `color` is acceptable but not GPU-accelerated — use `transition-colors` token

## Interaction Patterns

### Button Hover & Active States

```css
.button {
  transition: var(--transition-colors), var(--transition-transform), var(--transition-shadow);
}

/* Primary button */
.button-primary:hover {
  background-color: var(--button-primary-hover);
  /* Subtle lift — premium feel */
  transform: translateY(-1px);
  box-shadow: 0 2px 8px color-mix(in oklch, var(--button-primary-bg) 25%, transparent);
}

.button-primary:active {
  background-color: var(--button-primary-active);
  transform: translateY(0);
  box-shadow: none;
}

/* Secondary button */
.button-secondary:hover {
  background-color: var(--button-secondary-hover-bg);
  border-color: var(--color-border-strong);
}

.button-secondary:active {
  background-color: var(--color-surface-sunken);
}

/* Ghost button */
.button-ghost:hover {
  background-color: var(--button-ghost-hover-bg);
}

.button-ghost:active {
  background-color: var(--color-surface-sunken);
}
```

### Card Hover

```css
.card-interactive {
  transition: var(--transition-transform), var(--transition-shadow),
              border-color var(--duration-fast) var(--ease-default);
}

.card-interactive:hover {
  transform: translateY(-2px);
  border-color: var(--card-hover-border);
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.08);
}

/* Dark mode: use lighter shadow */
[data-theme="dark"] .card-interactive:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.3);
}
```

### Link Hover

```css
.link {
  color: var(--color-text-brand);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: color-mix(in oklch, currentColor 30%, transparent);
  transition: text-decoration-color var(--duration-fast) var(--ease-default);
}

.link:hover {
  text-decoration-color: currentColor;
}
```

### Focus States

```css
/* Universal focus ring — NEVER hide focus */
:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
  border-radius: inherit;
}

/* Input focus */
.input:focus-visible {
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px var(--input-focus-ring);
  outline: none; /* border + ring replaces outline */
}
```

## Loading States

### Skeleton Screen (preferred over spinners)

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface-raised) 0%,
    var(--color-surface-sunken) 50%,
    var(--color-surface-raised) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### When to Use Spinners (exceptions)

Only use a spinner when:
- An action was triggered and the result replaces the ENTIRE view
- A file is uploading (with progress indicator)
- Never for page loads, data fetching, or partial content updates

## Page/Route Transitions

```css
/* Fade + subtle slide */
.page-enter {
  opacity: 0;
  transform: translateY(8px);
}

.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity var(--duration-slow) var(--ease-default),
              transform var(--duration-slow) var(--ease-spring);
}

.page-exit {
  opacity: 1;
}

.page-exit-active {
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-in);
}
```

## Accessibility — prefers-reduced-motion

**MANDATORY on every project:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Replacement strategies:**
- Loading spinner → "Loading..." text
- Fade-in alerts → always visible alerts
- Auto-rotating carousels → manual navigation
- Shake animation → persistent error text with icon
- Stagger reveal → all content visible immediately

## Rules

1. **Every animation must answer: "What state change does this communicate?"** If no answer, remove it.
2. **No animation exceeds 500ms.** Users perceive >500ms as sluggish.
3. **No flashing exceeds 3 times per second.** Seizure risk (WCAG).
4. **Auto-playing animations over 5 seconds MUST have pause/stop controls.**
5. **Skeleton screens for data loading. Spinners only for user-triggered full-view actions.**
6. **`prefers-reduced-motion` is not optional.** Test with it enabled.
7. **60fps minimum (16.7ms per frame budget).** If an animation drops frames, simplify or remove it.

## Anti-Patterns

- Elaborate entrance animations on every element (stagger reveals on 20+ items)
- Bounce/elastic easing on UI elements (feels toyish, not premium)
- Parallax scrolling (performance cost, accessibility issue, dated trend)
- Animated gradient backgrounds (CPU-intensive, decorative)
- Loading spinner as the default loading state
- Same generic fade-in on every component
- Animations that block interaction (user must wait for animation to complete)
