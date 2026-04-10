# Anti-Patterns — The AI-Slop Checklist

## Purpose

Before submitting any UI work, run through this checklist. If ANY item is true, redesign that element.

## The Checklist

### Typography

- [ ] **Using Inter as a conscious choice** — It's the #1 AI default font. Use Geist Sans or a distinctive alternative.
- [ ] **Same font size on everything** — No visible type hierarchy between headings, body, and captions.
- [ ] **Default letter-spacing on large headings** — Premium headings have negative tracking (-0.02em to -0.04em).
- [ ] **Body text spans full width** — No `max-width: 65ch` or similar constraint. Fatiguing to read.

### Color

- [ ] **Purple-to-blue gradient** — The single biggest indicator of AI-generated design. Any purple-blue gradient on hero, CTA, or background.
- [ ] **Tailwind default blue** — `bg-blue-500` without customization. Every AI tool defaults to this exact shade.
- [ ] **Random gradient decorations** — Gradients that don't serve a functional or brand purpose.
- [ ] **Cool gray everywhere** — Using zinc/slate instead of warm stone/warm gray.
- [ ] **No dark mode consideration** — Light-only design in 2026 signals AI generation.

### Layout

- [ ] **Hero → 3 Cards → Testimonials → Pricing → CTA** — The "statistically average" layout. Instantly recognizable as template-generated.
- [ ] **Bento grid for features** — Overused to the point of cliche. Find a different layout.
- [ ] **Uniform padding everywhere** — Same py-16 on every section. No spatial hierarchy.
- [ ] **Centered everything** — Text, cards, buttons — all centered. Real designs use alignment variation.
- [ ] **Equal-height cards in a row** — Especially 3 cards with icon + title + description + button. The #1 AI layout.

### Components

- [ ] **Gradient buttons** — Solid-fill buttons are the premium standard. Gradients = dated/AI.
- [ ] **Oversized hero CTA** — Button is disproportionately large compared to surrounding text.
- [ ] **Generic "Get Started" / "Learn More" buttons** — Copy should be specific to the action.
- [ ] **Card shadows for resting state** — Premium cards use subtle borders, shadows only on hover.
- [ ] **Rounded-full on non-avatar elements** — Pill shapes everywhere signals template.
- [ ] **Missing hover states** — Interactive elements with no visual feedback on hover.
- [ ] **Missing focus states** — No visible focus-visible ring on keyboard navigation.

### Copy & Content

- [ ] **"Build the future of [X]"** — Generic aspirational headline with no specificity.
- [ ] **"Your all-in-one platform"** — Says nothing. What does it actually do?
- [ ] **"Scale without limits"** — Meaningless marketing jargon.
- [ ] **"Trusted by 10,000+ companies"** — Without actual logos or specifics.
- [ ] **"Seamlessly integrate with..."** — Without showing real integrations.
- [ ] **Lorem ipsum or placeholder text** — Obviously, but also placeholder-quality real text.

### Imagery

- [ ] **AI-generated illustrations** — Too smooth, too symmetrical, plastic quality.
- [ ] **Stock photos of diverse groups at laptops** — The AI default.
- [ ] **Abstract 3D blobs/shapes** — The 2023-era AI decoration trend.
- [ ] **Decorative SVG backgrounds** — Wave patterns, blob patterns that serve no purpose.
- [ ] **Mock dashboard screenshots** — Obviously fake data in product screenshots.

### Animation

- [ ] **Same fade-in on every element** — Identical entrance animation applied uniformly.
- [ ] **Stagger reveal on 20+ items** — Loading feels slow, not premium.
- [ ] **Parallax scrolling** — Dated, accessibility-hostile, performance-expensive.
- [ ] **Animated gradient backgrounds** — CPU-intensive decoration.
- [ ] **Auto-rotating carousels** — Users hate them. Convert to manual or static.

### Technical

- [ ] **No semantic HTML** — Divs for everything instead of `<nav>`, `<main>`, `<section>`, `<article>`.
- [ ] **No ARIA attributes** — Custom components without accessibility markup.
- [ ] **No prefers-reduced-motion** — Animations ignore user preferences.
- [ ] **No prefers-color-scheme** — System theme preference ignored.
- [ ] **Inline styles mixed with Tailwind** — Inconsistent styling approach.

## What Premium Sites Do Instead

| AI-Slop Pattern | Premium Alternative |
|----------------|---------------------|
| Purple-blue gradient hero | Restrained neutral + one intentional accent color |
| 3 equal feature cards | Asymmetric layout with varied content sizes |
| Generic stock imagery | Real product screenshots, custom illustrations, or no imagery |
| "Get Started Free" button | Specific action: "Create your store", "Import your data" |
| Bento grid features | Focused feature sections with dedicated space each |
| Animated gradient bg | Subtle texture, grain, or interactive WebGL background |
| Same fade-in everywhere | Purposeful motion only on key elements |
| Inter font default | Distinctive typography (Geist, custom, or intentional serif) |
| Uniform 16px radius | Varied radius: 8px buttons, 12px cards, 16px modals |
| Heavy card shadows | Subtle borders + bg elevation, shadow only on hover |

## The 5-Second Test

Show your design to someone for 5 seconds. If they say any of these, redesign:
- "Looks like a template"
- "Looks like every other SaaS site"
- "Did AI make this?"
- "Looks like a Tailwind template"
- "I've seen this layout before"

## The Intentionality Test

For every design element, ask:
1. **Why this color?** (Not "it looked nice" — what does it communicate?)
2. **Why this spacing?** (Not "Tailwind default" — what hierarchy does it create?)
3. **Why this animation?** (Not "it's cool" — what state change does it signal?)
4. **Why this layout?** (Not "it's standard" — does it serve THIS content?)
5. **Why this font?** (Not "it's clean" — does it match the brand personality?)

If any answer is "because it's the default" or "because other sites do it" — redesign.
