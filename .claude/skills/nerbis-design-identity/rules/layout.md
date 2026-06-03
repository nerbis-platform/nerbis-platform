# Layout & Spacing

## Spacing Scale (4px base unit)

```css
:root {
  --space-0: 0px;
  --space-0.5: 2px;
  --space-1: 4px;
  --space-1.5: 6px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-32: 128px;
}
```

Use Tailwind equivalents: `p-1` = 4px, `p-2` = 8px, `p-4` = 16px, etc.

## Border Radius Scale

```css
:root {
  --radius-sm: 4px;      /* Badges, tags, small chips */
  --radius-md: 8px;      /* Buttons, inputs, default */
  --radius-lg: 12px;     /* Cards, dropdowns */
  --radius-xl: 16px;     /* Modals, sheets */
  --radius-2xl: 24px;    /* Large containers, hero sections */
  --radius-full: 9999px; /* Avatars, pills ONLY */
}
```

**Default:** `--radius-md` (8px). Never apply `--radius-full` to rectangular elements.

## Container Strategy

### Marketing/Public Pages
```css
.container-marketing {
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: var(--space-6);  /* 24px */
}

/* Wider for hero sections */
.container-wide {
  max-width: 1400px;
  margin-inline: auto;
  padding-inline: var(--space-6);
}
```

### Dashboard/App Pages
```css
.container-dashboard {
  width: 100%;
  padding-inline: var(--space-6);
  /* No max-width — use full space */
}
```

## Grid System

### Page-Level Layout (CSS Grid)

```css
/* Standard two-column dashboard */
.layout-dashboard {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 56px 1fr;
  min-height: 100vh;
}

/* Marketing page sections */
.section {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
}
```

### Component-Level Layout (Flexbox)

```css
/* Horizontal group */
.flex-row {
  display: flex;
  align-items: center;
  gap: var(--space-3); /* 12px default gap */
}

/* Stack */
.flex-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-4); /* 16px default gap */
}
```

## Whitespace as Hierarchy

More important content gets MORE space around it:

| Content Importance | Vertical Padding |
|-------------------|------------------|
| Hero section | `py-24` to `py-32` (96-128px) |
| Major section | `py-16` to `py-20` (64-80px) |
| Sub-section | `py-10` to `py-12` (40-48px) |
| Card internal | `p-5` to `p-6` (20-24px) |
| Component group | `gap-4` to `gap-6` (16-24px) |
| Inline elements | `gap-2` to `gap-3` (8-12px) |

## Asymmetric Spacing

Sections should NOT have equal top and bottom padding. Use more space above to create breathing room:

```css
/* Good: asymmetric — more space above */
.section-features {
  padding-top: var(--space-20);   /* 80px */
  padding-bottom: var(--space-16); /* 64px */
}

/* Bad: symmetric everywhere */
.section-features {
  padding: var(--space-16) 0; /* Feels uniform, less hierarchy */
}
```

## Z-Index Scale

```css
:root {
  --z-base: 0;
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-overlay: 30;
  --z-modal: 40;
  --z-toast: 50;
  --z-tooltip: 60;
}
```

Never use arbitrary z-index values. Always reference the scale.

## Responsive Breakpoints

```css
/* Mobile first */
--breakpoint-sm: 640px;   /* Large phones */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Small laptops */
--breakpoint-xl: 1280px;  /* Desktops */
--breakpoint-2xl: 1536px; /* Large screens */
```

**Mobile-first approach:** Base styles for mobile, use `min-width` media queries to enhance.

## Shadow Scale

Prefer borders over shadows. When shadows are needed:

```css
:root {
  --shadow-xs: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.04);
  --shadow-md: 0 4px 6px rgb(0 0 0 / 0.06), 0 2px 4px rgb(0 0 0 / 0.04);
  --shadow-lg: 0 10px 15px rgb(0 0 0 / 0.08), 0 4px 6px rgb(0 0 0 / 0.04);
  --shadow-xl: 0 20px 25px rgb(0 0 0 / 0.10), 0 8px 10px rgb(0 0 0 / 0.04);
}

/* Dark mode: more opaque shadows */
[data-theme="dark"] {
  --shadow-xs: 0 1px 2px rgb(0 0 0 / 0.2);
  --shadow-sm: 0 1px 3px rgb(0 0 0 / 0.3), 0 1px 2px rgb(0 0 0 / 0.2);
  --shadow-md: 0 4px 6px rgb(0 0 0 / 0.25), 0 2px 4px rgb(0 0 0 / 0.15);
  --shadow-lg: 0 10px 15px rgb(0 0 0 / 0.3), 0 4px 6px rgb(0 0 0 / 0.15);
  --shadow-xl: 0 20px 25px rgb(0 0 0 / 0.4), 0 8px 10px rgb(0 0 0 / 0.2);
}
```

## Rules

1. **CSS Grid for page layout, Flexbox for component layout.** Not the other way around.
2. **`gap` for spacing between siblings.** Never use margin-bottom on children inside flex/grid.
3. **Whitespace is proportional to importance.** Hero > sections > cards > elements.
4. **Asymmetric padding on sections.** More space above than below.
5. **Containers: 1200px for marketing, full-width for dashboards.**
6. **Use the spacing scale.** No arbitrary values like `padding: 13px` or `margin: 37px`.
7. **Mobile-first responsive.** Base = mobile, enhance with `min-width`.
8. **Use the z-index scale.** No `z-index: 9999`.
9. **Borders over shadows** for subtle elevation. Shadows for floating elements (modals, dropdowns).

## Anti-Patterns

- Uniform padding on every section (no hierarchy)
- Using margin for everything instead of gap in flex/grid
- Fixed pixel breakpoints without considering content
- Missing `padding-inline` on containers (content touches viewport edges on mobile)
- Using shadows for card elevation when a subtle border works
- `position: absolute` for layout (use grid/flex)
- Hardcoded heights (let content determine height)
- Horizontal scroll on mobile (usually caused by elements exceeding container width)
