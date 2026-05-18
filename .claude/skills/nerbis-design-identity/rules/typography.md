# Typography System

## Font Stack

```css
:root {
  --font-sans: 'Geist Sans', 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
}
```

**Primary:** Geist Sans — optimized for small sizes (12-14px), tabular numbers, distinct character shapes.
**Code/Data:** Geist Mono — aligned columns, technical content, terminal output.

If Geist is unavailable, Inter is acceptable ONLY as fallback — never as first choice.

## Type Scale (Major Second — 1.125 ratio)

Use `clamp()` for all sizes. Never use fixed pixel values.

```css
--text-xs:      clamp(0.694rem, 0.66rem + 0.17vw, 0.75rem);    /* ~11-12px */
--text-sm:      clamp(0.833rem, 0.79rem + 0.22vw, 0.875rem);   /* ~13-14px */
--text-base:    clamp(1rem, 0.95rem + 0.25vw, 1.063rem);       /* ~16-17px */
--text-lg:      clamp(1.125rem, 1.05rem + 0.38vw, 1.25rem);    /* ~18-20px */
--text-xl:      clamp(1.266rem, 1.15rem + 0.58vw, 1.5rem);     /* ~20-24px */
--text-2xl:     clamp(1.424rem, 1.25rem + 0.87vw, 1.875rem);   /* ~23-30px */
--text-3xl:     clamp(1.602rem, 1.35rem + 1.26vw, 2.25rem);    /* ~26-36px */
--text-4xl:     clamp(1.802rem, 1.45rem + 1.76vw, 2.813rem);   /* ~29-45px */
--text-5xl:     clamp(2.027rem, 1.55rem + 2.39vw, 3.5rem);     /* ~32-56px */
--text-display: clamp(2.566rem, 1.8rem + 3.83vw, 4.5rem);      /* ~41-72px */
```

## Hierarchy

| Level | Size | Weight | Tracking | Line Height | Use |
|-------|------|--------|----------|-------------|-----|
| Display | `--text-display` | 700 | -0.04em | 1.0 | Hero headlines, page titles |
| H1 | `--text-5xl` | 700 | -0.03em | 1.1 | Page headings |
| H2 | `--text-4xl` | 600 | -0.02em | 1.15 | Section headings |
| H3 | `--text-3xl` | 600 | -0.02em | 1.2 | Subsection headings |
| H4 | `--text-2xl` | 600 | -0.01em | 1.25 | Card titles |
| H5 | `--text-xl` | 600 | 0 | 1.3 | Small headings |
| Body Large | `--text-lg` | 400 | 0 | 1.6 | Lead paragraphs |
| Body | `--text-base` | 400 | 0 | 1.6 | Default text |
| Body Small | `--text-sm` | 400 | 0.01em | 1.5 | Secondary text |
| Caption | `--text-xs` | 500 | 0.02em | 1.4 | Labels, metadata |
| Code | `--text-sm` | 400 | 0 | 1.5 | Inline code, monospace data |
| Overline | `--text-xs` | 600 | 0.1em | 1.4 | ALL CAPS labels, categories |

## Rules

1. **One H1 per page.** Always. No exceptions.
2. **Never skip heading levels.** H1 → H2 → H3, not H1 → H3.
3. **Body text: `max-width: 65ch`.** Optimal readability is 45-75 characters per line.
4. **Negative tracking on headings.** Tighten letter-spacing as size increases (-0.02em to -0.04em).
5. **Positive tracking on overlines.** ALL CAPS text needs 0.05-0.15em letter-spacing.
6. **Use `text-wrap: balance` on headings.** Prevents orphan words on multi-line headings.
7. **Use `text-wrap: pretty` on captions.** Better line breaks on short text.
8. **Monospace for numbers in tables.** Use `font-variant-numeric: tabular-nums` or Geist Mono.
9. **Font loading: WOFF2 + `font-display: swap` + preload.** Performance is design.
10. **No more than 3 weights per font.** 400 (regular), 600 (semibold), 700 (bold).

## Anti-Patterns

- Using Inter as a conscious choice (it's the AI default — use Geist or something distinctive)
- Fixed pixel font sizes without responsive scaling
- Same font size for everything (no hierarchy)
- Headings without negative letter-spacing (looks loose and amateur)
- Body text wider than 75 characters (fatiguing to read)
- Using `font-weight: 800-900` for body text (reserve for display only)
- Loading 5+ font weights (performance cost, minimal visual benefit)
