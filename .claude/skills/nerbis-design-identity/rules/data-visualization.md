# Data Visualization & Dashboards

## Philosophy

Data visualization in NERBIS follows the same principles as the rest of the system: **content first, restraint over decoration, every element must communicate**.

No rainbow dashboards. No 3D charts. No animated pie charts that spin on load.

## Chart Color Palette

### Primary Series (ordered)

Use these colors in sequence for multi-series charts:

```css
:root {
  --chart-1: var(--color-interactive-default);  /* Brand color — always first */
  --chart-2: #8b5cf6;  /* Violet — distinct from brand */
  --chart-3: #f59e0b;  /* Amber — warm contrast */
  --chart-4: #06b6d4;  /* Cyan — cool balance */
  --chart-5: #ec4899;  /* Pink — if 5th series needed */
}

/* Status (fixed, never reassigned) */
:root {
  --chart-positive: var(--color-status-success);  /* Green — always means good */
  --chart-negative: var(--color-status-error);    /* Red — always means bad */
  --chart-neutral: var(--color-text-muted);       /* Gray — baseline/comparison */
}
```

### Dark Mode

In dark mode, chart colors should be **slightly desaturated** and **brighter** to maintain contrast against dark backgrounds:

```css
[data-theme="dark"] {
  --chart-1: var(--color-interactive-default);
  --chart-2: #a78bfa;  /* Lighter violet */
  --chart-3: #fbbf24;  /* Lighter amber */
  --chart-4: #22d3ee;  /* Lighter cyan */
  --chart-5: #f472b6;  /* Lighter pink */
}
```

### Rules
- **Red = bad, Green = good. Always.** Never reverse this for "style."
- **Brand color is always the primary series.** Establishes visual connection to the product.
- **Maximum 5 colors in a single chart.** If more are needed, group smaller categories into "Other."
- **Never use color alone** — pair with labels, patterns, or position.
- **Test with a color blindness simulator** before shipping.

## Chart Types & When to Use

| Data Type | Chart | When |
|-----------|-------|------|
| Trend over time | **Line chart** | Revenue, orders, visitors over days/weeks/months |
| Comparison | **Bar chart** (vertical) | Compare categories (products, channels, regions) |
| Composition | **Stacked bar** | Part-of-whole breakdown (traffic sources, order types) |
| Single metric + change | **Stat card** | KPIs: revenue, orders, conversion rate |
| Progress | **Progress bar** | Goal completion, capacity usage |
| Distribution | **Histogram** | Order values, session durations |
| Quick trend | **Sparkline** | Inline trend in tables or stat cards |

### Charts to NEVER Use
- **Pie charts** — hard to compare, wasted space. Use horizontal bar instead.
- **3D charts** — distortion, no information gain.
- **Gauge/speedometer** — use a progress bar or stat card.
- **Radar/spider charts** — confusing, hard to read.
- **Animated data on load** — data should appear, not perform.

## Stat Cards (KPI Metrics)

The most common dashboard element. Structure:

```tsx
<div className="flex flex-col gap-1 p-5 border border-subtle rounded-lg bg-surface-default">
  {/* Label — small, muted */}
  <span className="text-xs font-medium text-muted uppercase tracking-wider">
    Revenue
  </span>

  {/* Value — large, primary */}
  <span className="text-3xl font-semibold tracking-tight tabular-nums">
    $12,847
  </span>

  {/* Change indicator — contextual color */}
  <div className="flex items-center gap-1 text-sm">
    <span className="text-success flex items-center gap-0.5">
      <IconTrendUp className="size-3.5" />
      +23%
    </span>
    <span className="text-muted">vs last month</span>
  </div>

  {/* Optional: sparkline */}
  <Sparkline data={last30Days} className="h-8 mt-2" />
</div>
```

### Rules
- **Label above, value prominent, change below.** Always this order.
- **Tabular nums** on all numeric values (`font-variant-numeric: tabular-nums`).
- **Relative change needs context** — "+23%" alone is meaningless. "+23% vs last month" is useful.
- **Color the change, not the value.** The number is neutral; the delta is positive/negative.
- **4 stat cards max per row.** More than 4 = information overload.

## Dashboard Layout

### NOT Bento Grids

Bento grids are the 2024-2025 AI cliché. NERBIS dashboards use **content-driven layouts**:

```text
┌─────────────────────────────────────────────┐
│  4 Stat Cards (KPIs)                        │
├─────────────────────────┬───────────────────┤
│                         │                   │
│  Main Chart             │  Secondary Chart  │
│  (2/3 width)            │  (1/3 width)      │
│                         │                   │
├─────────────────────────┴───────────────────┤
│  Data Table (full width, scrollable)        │
│                                             │
└─────────────────────────────────────────────┘
```

### Layout Rules
- **KPIs first** — the most important numbers at the top.
- **Main chart gets 2/3 width.** The primary story dominates.
- **Tables full-width at the bottom.** Detail data for drilling down.
- **No equal-sized grid cells.** Size = importance.
- **Responsive: stack vertically on mobile**, KPIs in 2x2, charts full-width.

## Chart Styling

### Axes & Grid

```css
/* Grid lines — barely visible */
.chart-grid line {
  stroke: var(--color-border-subtle);
  stroke-dasharray: 4 4;
}

/* Axis labels — small, muted */
.chart-axis-label {
  font-family: var(--font-sans);
  font-size: 11px;
  fill: var(--color-text-muted);
}

/* Axis lines — subtle */
.chart-axis line {
  stroke: var(--color-border-default);
}
```

### Tooltips

```css
.chart-tooltip {
  background: var(--color-surface-overlay);
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  box-shadow: var(--shadow-md);
  /* Appear instantly — no delay on data tooltips */
}
```

### Skeleton Loading for Charts

```tsx
// Chart loading state — NOT a spinner
<div className="h-64 w-full rounded-lg bg-surface-raised animate-pulse" />

// Stat card loading
<div className="flex flex-col gap-2 p-5">
  <div className="h-3 w-16 rounded bg-surface-raised animate-pulse" />
  <div className="h-8 w-28 rounded bg-surface-raised animate-pulse" />
  <div className="h-3 w-24 rounded bg-surface-raised animate-pulse" />
</div>
```

## Sparklines

Tiny inline charts for tables and stat cards:

```tsx
<svg viewBox="0 0 100 24" className="h-6 w-full" preserveAspectRatio="none">
  {/* Area fill — very subtle */}
  <path d={areaPath} fill="var(--chart-1)" opacity="0.1" />
  {/* Line — thin, brand color */}
  <path d={linePath} fill="none" stroke="var(--chart-1)" strokeWidth="1.5" />
</svg>
```

- **No axes, no labels, no grid.** Just the trend line.
- **Height: 24-32px.** Compact enough for table cells.
- **Single color** — brand for positive, status for contextual.

## Accessibility in Charts

- **All chart data available in a table format** (expandable/toggle).
- **aria-label on SVG charts** describing the data trend.
- **Never use color alone** — label each series, use different stroke patterns if needed.
- **Keyboard navigable** — arrow keys move between data points, tooltip appears on focus.
- **prefers-reduced-motion** — disable animated chart drawings, show data immediately.
- **High contrast mode** — ensure all lines/bars meet 3:1 contrast against background.

## Anti-Patterns

- Rainbow color palettes in charts (too many colors, no hierarchy)
- Animated chart rendering on every page load (data doesn't need to "draw in")
- Pie charts for anything (use horizontal bar for composition)
- 3D effects on charts (distortion, no information value)
- Dense dashboards with 10+ cards in a grid (focus on what matters)
- Charts without context ("$12,847" without "Revenue" or "vs last month")
- Different chart libraries across the app (inconsistent styling)
- Tooltips that obscure the data they're explaining
