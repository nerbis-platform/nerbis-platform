# Color System

## Three-Layer Token Architecture

### Layer 1: Primitive Tokens (Raw Values)

These are the actual color values. Never reference these in components.

```css
:root {
  /* Neutrals — warm gray foundation (not cool/blue-tinted) */
  --primitive-white: #ffffff;
  --primitive-gray-50: #fafaf9;
  --primitive-gray-100: #f5f5f4;
  --primitive-gray-200: #e7e5e4;
  --primitive-gray-300: #d6d3d1;
  --primitive-gray-400: #a8a29e;
  --primitive-gray-500: #78716c;
  --primitive-gray-600: #57534e;
  --primitive-gray-700: #44403c;
  --primitive-gray-800: #292524;
  --primitive-gray-900: #1c1917;
  --primitive-gray-950: #0c0a09;
  --primitive-black: #000000;

  /* Brand — inject per tenant */
  --primitive-brand-50: #f0f9ff;
  --primitive-brand-100: #e0f2fe;
  --primitive-brand-200: #bae6fd;
  --primitive-brand-300: #7dd3fc;
  --primitive-brand-400: #38bdf8;
  --primitive-brand-500: #0ea5e9;
  --primitive-brand-600: #0284c7;
  --primitive-brand-700: #0369a1;
  --primitive-brand-800: #075985;
  --primitive-brand-900: #0c4a6e;

  /* Status — fixed, never overridden by tenants */
  --primitive-success-500: #22c55e;
  --primitive-success-600: #16a34a;
  --primitive-warning-500: #f59e0b;
  --primitive-warning-600: #d97706;
  --primitive-error-500: #ef4444;
  --primitive-error-600: #dc2626;
  --primitive-info-500: #3b82f6;
  --primitive-info-600: #2563eb;
}
```

### Layer 2: Semantic Tokens (Meaningful Mapping)

These define WHAT a color does, not WHAT it looks like.

```css
:root {
  /* Surfaces */
  --color-surface-default: var(--primitive-white);
  --color-surface-raised: var(--primitive-gray-50);
  --color-surface-sunken: var(--primitive-gray-100);
  --color-surface-overlay: var(--primitive-white);
  --color-surface-inverse: var(--primitive-gray-950);

  /* Text */
  --color-text-primary: var(--primitive-gray-950);
  --color-text-secondary: var(--primitive-gray-600);
  --color-text-muted: var(--primitive-gray-400);
  --color-text-disabled: var(--primitive-gray-300);
  --color-text-inverse: var(--primitive-white);
  --color-text-brand: var(--primitive-brand-600);

  /* Borders */
  --color-border-default: var(--primitive-gray-200);
  --color-border-subtle: var(--primitive-gray-100);
  --color-border-strong: var(--primitive-gray-300);
  --color-border-focus: var(--primitive-brand-500);

  /* Interactive */
  --color-interactive-default: var(--primitive-brand-600);
  --color-interactive-hover: var(--primitive-brand-700);
  --color-interactive-active: var(--primitive-brand-800);
  --color-interactive-disabled: var(--primitive-gray-300);

  /* Status */
  --color-status-success: var(--primitive-success-500);
  --color-status-success-bg: color-mix(in oklch, var(--primitive-success-500) 10%, transparent);
  --color-status-warning: var(--primitive-warning-500);
  --color-status-warning-bg: color-mix(in oklch, var(--primitive-warning-500) 10%, transparent);
  --color-status-error: var(--primitive-error-500);
  --color-status-error-bg: color-mix(in oklch, var(--primitive-error-500) 10%, transparent);
  --color-status-info: var(--primitive-info-500);
  --color-status-info-bg: color-mix(in oklch, var(--primitive-info-500) 10%, transparent);
}
```

### Layer 2b: Dark Mode

```css
[data-theme="dark"] {
  /* Surfaces */
  --color-surface-default: var(--primitive-gray-950);
  --color-surface-raised: var(--primitive-gray-900);
  --color-surface-sunken: var(--primitive-black);
  --color-surface-overlay: var(--primitive-gray-800);
  --color-surface-inverse: var(--primitive-white);

  /* Text */
  --color-text-primary: var(--primitive-gray-50);
  --color-text-secondary: var(--primitive-gray-400);
  --color-text-muted: var(--primitive-gray-500);
  --color-text-disabled: var(--primitive-gray-700);
  --color-text-inverse: var(--primitive-gray-950);
  --color-text-brand: var(--primitive-brand-400);

  /* Borders */
  --color-border-default: var(--primitive-gray-800);
  --color-border-subtle: var(--primitive-gray-900);
  --color-border-strong: var(--primitive-gray-700);
  --color-border-focus: var(--primitive-brand-400);

  /* Interactive */
  --color-interactive-default: var(--primitive-brand-500);
  --color-interactive-hover: var(--primitive-brand-400);
  --color-interactive-active: var(--primitive-brand-300);
  --color-interactive-disabled: var(--primitive-gray-700);
}
```

### Layer 3: Component Tokens (Scoped Application)

```css
:root {
  /* Button */
  --button-primary-bg: var(--color-interactive-default);
  --button-primary-text: var(--color-text-inverse);
  --button-primary-hover: var(--color-interactive-hover);
  --button-primary-active: var(--color-interactive-active);

  --button-secondary-bg: transparent;
  --button-secondary-text: var(--color-text-primary);
  --button-secondary-border: var(--color-border-default);
  --button-secondary-hover-bg: var(--color-surface-raised);

  --button-ghost-bg: transparent;
  --button-ghost-text: var(--color-text-secondary);
  --button-ghost-hover-bg: var(--color-surface-raised);

  /* Card */
  --card-bg: var(--color-surface-default);
  --card-border: var(--color-border-subtle);
  --card-hover-border: var(--color-border-default);

  /* Input */
  --input-bg: var(--color-surface-default);
  --input-border: var(--color-border-default);
  --input-focus-border: var(--color-border-focus);
  --input-focus-ring: color-mix(in oklch, var(--color-border-focus) 25%, transparent);
  --input-placeholder: var(--color-text-muted);
  --input-error-border: var(--color-status-error);
}
```

## Multi-Tenant Theming

NERBIS uses **runtime injection** via `theme-colors.ts` — NOT CSS `[data-tenant]` selectors.

The `TenantContext` fetches tenant config on mount and calls `applyThemeToDOM()` which
injects CSS custom properties directly into `:root` via `document.documentElement.style.setProperty()`.

```typescript
// theme-colors.ts — how it works
import { deriveThemeVariables, applyThemeToDOM } from "@/lib/utils/theme-colors";

// TenantContext calls this on mount with tenant's primary + secondary colors:
const theme = deriveThemeVariables(tenant.primary_color, tenant.secondary_color);
applyThemeToDOM(theme);
// This sets ~25 CSS custom properties on :root (--primary, --secondary, --background, etc.)
```

### How to add a new tenant-injectable token

1. Add the derived variable in `deriveThemeVariables()` in `theme-colors.ts`
2. Add the CSS custom property name to the return object
3. Reference it in your components via `var(--your-new-token)`
4. The semantic and component layers propagate automatically — no per-component changes needed

### Published websites use scoped injection

For published tenant websites, `WebsiteShell.tsx` injects CSS variables as **inline styles**
on the `.published-website` wrapper div — NOT on `:root`. This prevents cross-contamination
between the admin dashboard and the published storefront.

## Rules

1. **Never reference primitive tokens in components.** Always use semantic or component tokens.
2. **Never hardcode hex/rgb values in components.** Always use CSS custom properties.
3. **Status colors are fixed.** Red = error, green = success, amber = warning, blue = info. Tenants cannot override these.
4. **Test every component in both light and dark mode.** Not optional.
5. **Contrast ratios: 4.5:1 minimum for text, 3:1 for large text and UI elements.**
6. **Never use color alone to convey meaning.** Always pair with icon, text label, or pattern.
7. **Gradients are earned, not default.** Only use for: brand hero backgrounds, interactive state highlights, data visualization. Never decorative.
8. **Warm grays, not cool grays.** NERBIS uses stone/warm gray (not zinc/slate/cool gray). This creates warmth and approachability.

## Anti-Patterns

- Using Tailwind color classes directly instead of semantic tokens (`text-gray-600` → `text-secondary`)
- Purple-to-blue gradient on heroes, CTAs, or backgrounds (the #1 AI-generated indicator)
- Different gray scales across the app (mixing zinc + slate + gray)
- Dark mode as an afterthought (inverted colors without intentional palette)
- Using opacity for disabled states without checking contrast
- Decorative color that communicates nothing
