# Onboarding & First-Run Experience

## Philosophy

Onboarding is the first impression of the product. NERBIS follows Linear's approach: **learn by doing, not by reading**. No modal tours, no tooltip sequences, no "Welcome!" splash screens.

The goal: **time to first value in under 2 minutes**.

## Principles

1. **Task-driven, not tour-driven** — Users learn by completing real actions, not reading descriptions.
2. **Value before configuration** — Show the product working before asking for settings.
3. **Optional steps never block** — Integrations, invites, and advanced config appear early but never gate progress.
4. **Cosmetic personalization first** — Theme/appearance selection creates ownership before utility (Linear teaches this).
5. **Progressive disclosure** — Show only what's needed now. Surface advanced features contextually later.

## Onboarding Flow Structure

### Step 1: Authentication (minimal friction)
```
- Google/GitHub OAuth as primary (one click)
- Email/password as fallback (not primary)
- No CAPTCHA unless rate-limited
- No email verification before first use (verify later, don't block value)
```

### Step 2: Workspace Setup (30 seconds)
```
- Store/workspace name (required)
- Industry/type selection (helps AI generation)
- Auto-detect timezone and locale
- Skip everything else
```

### Step 3: Personalization (create ownership)
```
- Theme selection: light/dark (signals the product is configurable)
- Brand color picker (one color — feeds into tenant tokens)
- Optional: upload logo
- This is NOT decoration — it's the first moment the user sees THEIR product
```

### Step 4: First Value (the activation moment)
```
- For e-commerce: "Add your first product" (guided, 3 fields max)
- For bookings: "Create your first service" (guided)
- For websites: AI generates a starter site from industry + name
- The user sees a REAL result, not a demo or placeholder
```

### Step 5: Teach the Core Interaction
```
- Introduce the command palette (Cmd+K) or primary navigation pattern
- Teach BEFORE the workspace is populated (Linear's approach)
- One interaction, not a full tour
```

### Step 6: Checklist (persistent, not modal)
```
- Sidebar checklist of 3-5 tasks
- Completing tasks = learning the product
- Dismissable after completion
- Never blocks the main UI
```

## Onboarding Checklist Pattern

```tsx
<div className="flex flex-col gap-1 p-4 border border-subtle rounded-lg bg-surface-default">
  <h3 className="text-sm font-semibold mb-2">Get started</h3>

  {/* Completed task */}
  <div className="flex items-center gap-3 py-1.5 text-sm text-muted line-through">
    <div className="size-5 rounded-full bg-success/10 flex items-center justify-center">
      <IconCheck className="size-3 text-success" />
    </div>
    Create your store
  </div>

  {/* Current task — highlighted */}
  <div className="flex items-center gap-3 py-1.5 text-sm font-medium text-primary">
    <div className="size-5 rounded-full border-2 border-interactive flex items-center justify-center">
      <span className="size-1.5 rounded-full bg-interactive" />
    </div>
    Add your first product
  </div>

  {/* Future task — muted */}
  <div className="flex items-center gap-3 py-1.5 text-sm text-muted">
    <div className="size-5 rounded-full border border-subtle" />
    Customize your theme
  </div>

  {/* Progress */}
  <div className="mt-2 flex items-center gap-2">
    <div className="h-1 flex-1 rounded-full bg-surface-sunken overflow-hidden">
      <div className="h-full w-1/3 rounded-full bg-interactive transition-all duration-500" />
    </div>
    <span className="text-xs text-muted">1 of 3</span>
  </div>
</div>
```

## Empty State → First Action Bridge

Every section the user visits during onboarding should have a **contextual empty state** that bridges to the first action:

```tsx
// Products page — first visit
<EmptyState
  icon={<IconPackage className="size-10 stroke-1 text-muted" />}
  title="No products yet"
  description="Add your first product — it takes about 2 minutes."
  action={<Button>Add product</Button>}
  hint="You can also import products from a CSV file."
/>

// Orders page — before first sale
<EmptyState
  icon={<IconShoppingBag className="size-10 stroke-1 text-muted" />}
  title="No orders yet"
  description="Share your store link to get your first sale."
  action={<Button variant="outline">Copy store link</Button>}
/>

// Analytics — before enough data
<EmptyState
  icon={<IconBarChart className="size-10 stroke-1 text-muted" />}
  title="Not enough data yet"
  description="Analytics will appear after your first few orders."
/>
```

## Activation Events (by Module)

| Module | Activation Event | Why |
|--------|-----------------|-----|
| E-commerce | First product created + first order received | Full value loop |
| Bookings | First service created + first booking received | Full value loop |
| Websites | Site generated + first customization | Ownership + personalization |
| Dashboard | First metric with real data | Data = value |

## Loading States During Onboarding

AI site generation and initial setup may take time. Handle it premium:

```tsx
// During AI generation — show progress, not a spinner
<div className="flex flex-col items-center justify-center py-20 text-center">
  <div className="relative size-16 mb-6">
    {/* Animated brand icon or subtle pulse */}
    <div className="absolute inset-0 rounded-full bg-interactive/10 animate-ping" />
    <div className="relative size-16 rounded-full bg-interactive/5 flex items-center justify-center">
      <IconSparkles className="size-6 text-interactive" />
    </div>
  </div>
  <h3 className="text-lg font-semibold mb-1">Building your site</h3>
  <p className="text-sm text-secondary max-w-xs">
    Creating pages, setting up your theme, and configuring your store.
  </p>
  {/* Discrete progress steps */}
  <div className="flex items-center gap-2 mt-6 text-xs text-muted">
    <IconCheck className="size-3 text-success" /> Pages
    <IconCheck className="size-3 text-success" /> Theme
    <IconLoader className="size-3 animate-spin" /> Store config
  </div>
</div>
```

## Rules

1. **No modal tours.** Ever. Users close them immediately.
2. **No tooltip sequences.** They break flow and are impossible to return to.
3. **No "Welcome!" splash.** Go straight to the first action.
4. **No video walkthroughs as the primary path.** Link to docs/video as secondary.
5. **First value in under 2 minutes.** If it takes longer, simplify the flow.
6. **The checklist is a sidebar, not a modal.** It coexists with the main UI.
7. **Each checklist task teaches one feature.** Complete it = learned it.
8. **Skip buttons on every optional step.** Never trap the user.
9. **Show real results, not demos.** The user's own product/store/site, not sample data.
10. **Celebrate completion subtly.** A checkmark + "All set" — not confetti.

## Anti-Patterns

- Welcome modal with "Take the tour!" / "Skip" buttons
- Tooltip walkthrough that points at 8 UI elements in sequence
- Sample/demo data that the user has to delete later
- Requiring email verification before any interaction
- Wizard with 7+ steps before seeing the product
- "You're all set!" page that just links to the dashboard (show the dashboard)
- Auto-playing video explanation on first visit
- Gamification elements (badges, points, levels) in onboarding — NERBIS is premium, not a game
- Confetti or excessive celebration animations on task completion
