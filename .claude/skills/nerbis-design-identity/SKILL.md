---
name: nerbis-design-identity
description: |
  NERBIS design system identity — premium, distinctive UI/UX patterns inspired by Apple, Vercel, Linear, and Stripe.
  Triggers when building UI components, pages, layouts, landing pages, dashboards, or any visual interface for NERBIS.
  Also triggers when reviewing design quality or checking if a design "looks AI-generated".
metadata:
  author: NERBIS
  version: 1.0.0
---

# NERBIS Design Identity

A design system that produces interfaces indistinguishable from hand-crafted premium SaaS products. Every decision is intentional, every pixel purposeful.

## Philosophy

NERBIS follows three core principles derived from the best in the industry:

1. **Content First, UI Second** (Apple's "Deference") — The interface serves content, never competes with it. UI chrome recedes; data, text, and actions take center stage.
2. **Performance IS Design** (Vercel's philosophy) — Speed is a feature. A 100ms button transition beats a 500ms elaborate animation. Skeleton screens over spinners. Optimistic UI over loading states.
3. **Restraint Over Decoration** (Linear's approach) — Supporting elements recede. Whitespace is structural. Animation is functional. "Most of what makes software feel good is what you aren't likely to see."

## When to Use This Skill

- Building any UI component, page, or layout for NERBIS
- Creating landing pages, marketing pages, or public-facing interfaces
- Designing dashboard views, admin panels, or data-heavy screens
- Reviewing existing UI for design quality
- Checking if a design looks "AI-generated" or generic

## Design Identity at a Glance

| Aspect | NERBIS Approach |
|--------|----------------|
| **Tone** | Confident, clean, precise — never flashy |
| **Typography** | Geist Sans (UI) + Geist Mono (code). Tight heading tracking, generous body line-height |
| **Color** | Neutral foundation + one accent color. Semantic, not decorative |
| **Spacing** | 4px base unit. Generous whitespace. Asymmetric hierarchy |
| **Radius** | 8px default, 12px cards, 16px modals. Never fully round (except avatars) |
| **Shadows** | Minimal. Prefer subtle borders + background elevation |
| **Motion** | Under 300ms. GPU-only properties. Always respect prefers-reduced-motion |
| **Dark Mode** | First-class. Not a filter — a separate, intentional palette |
| **Density** | Information-dense dashboards, spacious marketing pages |

## Critical Rules

Before writing any UI code, internalize these rules. Each links to a detailed guide:

### 1. [Typography System](rules/typography.md)
- Geist Sans for UI, Geist Mono for code/data
- Strict hierarchy: display → heading → body → caption → code
- Negative letter-spacing on headings (-0.02em to -0.04em)
- Body line-height 1.5-1.6, headings 1.1-1.2
- Max line length: `max-width: 65ch`
- `clamp()` for responsive sizing
- **NEVER use Inter, Arial, or system defaults without intention**

### 2. [Color System](rules/color-system.md)
- Three-layer token architecture: primitive → semantic → component
- CSS custom properties with functional naming (`--color-surface-default`, not `--gray-100`)
- Dark mode via `[data-theme="dark"]` selector, not `.dark` class
- Multi-tenant: neutral foundation + tenant-injectable accent via CSS variables
- WCAG 2.1 AA contrast ratios enforced at token level
- Status colors: success (green), warning (amber), error (red), info (blue)
- **NEVER use decorative gradients. Gradients must be functional or brand-specific.**

### 3. [Motion & Animation](rules/motion.md)
- Hover: 150ms. Click: 100ms. Page transitions: 300ms max
- ONLY animate: `transform`, `opacity`, `filter` (GPU-accelerated)
- NEVER animate: `width`, `height`, `top`, `left`, `margin`, `padding`
- `ease-out` for entrances, `ease-in` for exits, `ease-in-out` for state transitions
- Skeleton screens for loading (shimmer gradient), never spinners
- `@media (prefers-reduced-motion: reduce)` is mandatory
- **NEVER add animation that doesn't communicate state or direct attention**

### 4. [Layout & Spacing](rules/layout.md)
- 4px base unit: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px
- Whitespace as structural element — more important content gets more space around it
- CSS Grid for page layout, Flexbox for component layout
- Asymmetric spacing creates visual hierarchy (not uniform padding)
- Container: `max-width: 1200px` with `px-6` (marketing), full-width (dashboards)
- **NEVER use equal padding on all sides of a section unless it's a card**

### 5. [Component Patterns](rules/components.md)
- Follow shadcn/ui conventions (see shadcn skill for specifics)
- Empty states: functional instructions, not decorative illustrations
- Cards: subtle border + background elevation, never heavy shadows
- Buttons: 3 variants max (primary, secondary, ghost). No gradient buttons.
- Forms: inline validation, immediate feedback, clear error states
- Tables: zebra striping only if >10 rows. Sticky headers. Monospace numbers.
- **NEVER create a component that could be composed from existing shadcn primitives**

### 6. [Advanced CSS Techniques](rules/advanced-css-techniques.md)
- CSS grain/noise texture overlays (SVG feTurbulence, no images)
- Glassmorphism with restrained backdrop-filter
- Scroll-driven animations (animation-timeline: scroll()/view())
- View Transitions API (page transitions without JS frameworks)
- Container queries (component-responsive design)
- color-mix() for dynamic palette generation from one brand color
- Subgrid for aligned card grids and form layouts
- :has() for parent-aware styling (form validation, adaptive layouts)
- Anchor positioning for tooltips/popovers
- Animated mesh gradients (CSS-only, no WebGL)
- Custom cursors, ::selection branding, scrollbar styling, :focus-within patterns
- Progressive enhancement strategy with @supports and accessibility

### 7. [Micro-Copy & Voice](rules/micro-copy.md)
- NERBIS voice: confident, specific, concise, helpful, calm
- Button copy: name the action ("Create product" not "Submit")
- Error messages: what happened → what to do
- Empty states: actionable, not decorative
- Confirmation dialogs: state impact, specific button labels
- No "Oops!", no exclamation marks in errors, no marketing language in UI
- **EVERY word in the UI should be intentional and NERBIS-specific**

### 8. [Signature Elements](rules/signature-elements.md)
- Warm grain texture on dark surfaces (SVG feTurbulence overlay)
- Warm stone gray foundation (not cool zinc/slate)
- Restrained glass accents on floating elements only
- Tight display typography (-0.04em tracking)
- Subtle hover lift on interactive elements (translateY -2px)
- Brand-colored ::selection and custom scrollbar
- Focus ring with brand color
- **These 7 elements = NERBIS identity without the logo**

### 9. [Data Visualization & Dashboards](rules/data-visualization.md)
- Brand color as primary chart series, max 5 colors per chart
- Red = bad, Green = good. Always. No exceptions.
- Stat cards: label → value → change indicator. Max 4 per row.
- No pie charts, no 3D, no animated chart rendering on load
- Dashboard layout: KPIs first, main chart 2/3 width, table at bottom
- Sparklines for inline trends (24-32px height, no axes)
- Skeleton loading for charts, never spinners
- **If a dashboard looks like a bento grid, redesign it.**

### 10. [Onboarding & First-Run Experience](rules/onboarding.md)
- Task-driven, not tour-driven. Learn by doing.
- Value before configuration — show the product working first
- Flow: Auth → Workspace → Personalization (theme/color) → First Value → Teach core interaction → Checklist
- Sidebar checklist (3-5 tasks), never modal tours or tooltip sequences
- Empty states bridge to first action in every section
- AI generation loading: show progress steps, not spinners
- **First value in under 2 minutes. If longer, simplify the flow.**

### 11. [Responsive Patterns](rules/responsive-patterns.md)
- Components TRANSFORM across breakpoints, not just stack
- Nav: bottom tabs (mobile) → collapsed sidebar (tablet) → full sidebar (desktop)
- Tables become card lists on mobile
- Modals become bottom sheets on mobile
- Stat cards: 2x2 grid (mobile) → 4-column (desktop)
- Container queries for reusable components, viewport queries for page layout
- **Mobile is a first-class platform, not a responsive afterthought**

### 12. [Email Templates](rules/email-templates.md)
- Same voice as the app: confident, specific, concise
- One CTA per email. Max 560px width. Table-based layout.
- Copy patterns for: welcome, order confirmation, password reset, invites, receipts
- Multi-tenant: tenant logo + brand color, "Powered by NERBIS" in footer
- Inline CSS, system font stack, preheader text
- **No "We're excited!", no emojis in subjects, no marketing in transactional emails**

### 13. [Mobile Patterns](rules/mobile-patterns.md)
- Thumb zone: primary actions at bottom, destructive at top
- Bottom sheets over modals. FAB for primary creation action.
- 44px minimum touch targets. 48px for primary inputs.
- 16px minimum font on inputs (prevents iOS zoom)
- `inputMode` + `enterKeyHint` on every input
- Swipe gestures with button alternatives
- Safe area padding for notches/home indicators
- **Every gesture has a visible button alternative**

### 14. [Anti-Patterns — The AI-Slop Checklist](rules/anti-patterns.md)
- No purple-to-blue gradients
- No "Hero → 3 Cards → Testimonials → Pricing → CTA" layout
- No vague copy ("Build the future of work", "Your all-in-one platform")
- No uniform border-radius/padding on everything
- No decorative bento grids
- No stock illustrations or AI-generated imagery
- No animations that serve no functional purpose
- **If you recognize it from a v0/bolt/lovable template, redesign it.**

## Related Skills — How They Work Together

This skill is the **source of truth for WHAT NERBIS looks like**. The other skills handle HOW to implement it correctly.

| Skill | Role | When to Use | Relationship |
|-------|------|-------------|--------------|
| **nerbis-design-identity** (this) | Visual identity, UX patterns, brand voice | ALWAYS — before creating any UI | **Master** — defines the design standard |
| **shadcn** | Component API correctness, installation, composition | When using shadcn/ui components | **Implementation** — how to build components that follow our identity |
| **vercel-react-best-practices** | React/Next.js performance optimization | When writing React code | **Performance** — ensures our premium design is also fast |
| **web-design-guidelines** | Audit against Web Interface Guidelines | When reviewing existing UI code | **Validation** — catches accessibility and UX violations we might miss |
| **frontend-design** | Creative aesthetic direction for distinctive UI | When designing new pages/features from scratch | **Creative** — provides aesthetic inspiration, but NERBIS identity overrides when they conflict |
| **code-quality** | Clean code, tech debt, NERBIS-specific patterns | When reviewing code quality | **Quality** — ensures the code behind the UI is maintainable |
| **multi-tenancy** | Django multi-tenant patterns | When touching tenant-scoped frontend data | **Data** — ensures tenant isolation in frontend API calls and state |

### Priority When Skills Conflict

1. **nerbis-design-identity** — visual decisions (colors, typography, spacing, motion)
2. **shadcn** — component API and composition patterns
3. **vercel-react-best-practices** — performance patterns
4. **web-design-guidelines** — accessibility and UX standards
5. **frontend-design** — creative direction (only when this skill doesn't specify)

**Rule:** If `frontend-design` suggests an aesthetic choice (e.g., "use brutalist typography") that contradicts this skill (e.g., "use Geist Sans with -0.04em tracking"), **this skill wins**. `frontend-design` is for creative inspiration on layout and composition; this skill defines the NERBIS brand.

## Workflow

When building any UI for NERBIS:

1. **Read this skill** — internalize the identity and signature elements
2. **Check the relevant rules** — typography, color, motion, layout, components, micro-copy
3. **Use shadcn skill** — for correct component API and composition
4. **Use vercel-react-best-practices** — for React/Next.js performance patterns
5. **Use frontend-design** — for creative layout inspiration (within NERBIS constraints)
6. **Validate with web-design-guidelines** — audit against Web Interface Guidelines
7. **Run the anti-patterns checklist** — before submitting, verify zero AI-slop indicators
8. **Validate accessibility** — keyboard nav, contrast ratios, screen reader compatibility
9. **Test dark mode** — it's not optional, it's the primary experience
10. **Test mobile** — bottom nav, touch targets, responsive transformations

## Multi-Tenant Considerations

NERBIS is multi-tenant. The design system must support:

- **Tenant-injectable accent color** via CSS custom property (`--color-brand-primary`)
- **Neutral foundation** that works with any accent color
- **Logo placement** that accommodates different aspect ratios
- **Theme switching** between NERBIS default and tenant-branded experiences
- Tokens at the semantic layer handle all theme variations — never hardcode colors in components

## Accessibility as Premium

Accessibility is not a checklist — it's a premium signal:

- WCAG 2.1 AA minimum (aim for AAA where practical)
- Keyboard navigation for ALL interactive elements
- Focus indicators visible and styled (not browser default, not hidden)
- `aria-*` attributes on all custom components
- Color never used alone to convey meaning (always + icon/text)
- `prefers-reduced-motion` respected everywhere
- `prefers-color-scheme` detected and honored
- Minimum 16px body text, 44px touch targets on mobile
