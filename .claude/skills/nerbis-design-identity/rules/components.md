# Component Patterns

## Buttons

### Variants (3 only — never more)

| Variant | Use Case | Visual |
|---------|----------|--------|
| **Primary** | Main action per section (1 per area) | Solid brand color, white text |
| **Secondary** | Alternative/supporting actions | Transparent bg, border, dark text |
| **Ghost** | Tertiary actions, navigation, inline | No bg, no border, muted text |

### Sizes

| Size | Height | Padding | Font | Use |
|------|--------|---------|------|-----|
| `sm` | 32px | `px-3` | `text-sm` | Inline, table actions, dense UI |
| `md` | 40px | `px-4` | `text-sm` | Default — most buttons |
| `lg` | 48px | `px-6` | `text-base` | CTAs, hero actions, standalone |

### Hover & Active States

```tsx
// Primary button — subtle lift on hover, press down on active
<Button className="
  transition-all duration-150 ease-out
  hover:translate-y-[-1px] hover:shadow-md
  active:translate-y-0 active:shadow-none
" />

// Secondary button — bg fill on hover
<Button variant="outline" className="
  transition-colors duration-150 ease-out
  hover:bg-surface-raised hover:border-strong
  active:bg-surface-sunken
" />

// Ghost button — subtle bg on hover
<Button variant="ghost" className="
  transition-colors duration-150 ease-out
  hover:bg-surface-raised
  active:bg-surface-sunken
" />
```

### Button Rules
- **One primary button per visible area.** Multiple primaries = no hierarchy.
- **Never use gradient buttons.** Solid fill only.
- **Icon buttons need `aria-label`.** Always.
- **Loading state:** Replace text with spinner + "Loading..." (keep button width stable).
- **Disabled state:** `opacity-50 cursor-not-allowed`. Never remove from DOM.
- **Minimum touch target:** 44x44px on mobile (add invisible padding if needed).

### Button Icon Patterns

```tsx
// Icon before text (most common)
<Button><IconPlus data-icon /> Add Item</Button>

// Icon after text (external links, forward navigation)
<Button>Learn More <IconArrowRight data-icon /></Button>

// Icon only (always needs aria-label)
<Button variant="ghost" size="icon" aria-label="Delete item">
  <IconTrash data-icon />
</Button>
```

## Cards

### Structure

```tsx
<Card className="border border-subtle bg-surface-default rounded-lg">
  <CardHeader className="p-5 pb-3">
    <CardTitle className="text-lg font-semibold tracking-tight">Title</CardTitle>
    <CardDescription className="text-sm text-secondary">Description</CardDescription>
  </CardHeader>
  <CardContent className="p-5 pt-0">
    {/* Content */}
  </CardContent>
  <CardFooter className="p-5 pt-3 border-t border-subtle">
    {/* Actions */}
  </CardFooter>
</Card>
```

### Interactive Cards (clickable)

```tsx
<Card className="
  border border-subtle bg-surface-default rounded-lg cursor-pointer
  transition-all duration-200 ease-out
  hover:translate-y-[-2px] hover:border-default hover:shadow-md
  active:translate-y-0 active:shadow-none
  focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2
" role="link" tabIndex={0}>
```

### Card Rules
- **Border + bg elevation, not shadows** for resting state.
- **Shadow only on hover** for interactive cards.
- **Consistent internal padding:** `p-5` (20px) default, `p-6` (24px) for spacious.
- **Never nest cards inside cards.**

## Forms

### Input Fields

```tsx
<div className="space-y-1.5">
  <Label htmlFor="email" className="text-sm font-medium">
    Email address
  </Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
    className="
      h-10 rounded-md border border-default bg-surface-default px-3
      text-sm placeholder:text-muted
      transition-all duration-150
      focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25
      aria-[invalid=true]:border-error aria-[invalid=true]:ring-error/25
    "
  />
  {/* Error message — only visible when invalid */}
  <p className="text-xs text-error" role="alert">
    Please enter a valid email address.
  </p>
</div>
```

### Form Rules
- **Labels are mandatory.** Never use placeholder-only fields.
- **Inline validation** — validate on blur, show errors immediately.
- **Error messages below the field**, not in tooltips or toasts.
- **Focus ring visible and styled** — 2px brand color + subtle ring shadow.
- **Tab order must be logical.** Test keyboard navigation.

## Tables

### Data Tables

```tsx
<Table>
  <TableHeader className="bg-surface-raised">
    <TableRow>
      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted">
        Name
      </TableHead>
      <TableHead className="text-right tabular-nums">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="
      transition-colors duration-100
      hover:bg-surface-raised
    ">
      <TableCell className="font-medium">Product Name</TableCell>
      <TableCell className="text-right tabular-nums font-mono text-sm">
        $1,234.56
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Table Rules
- **Sticky headers** for scrollable tables.
- **Monospace/tabular nums** for numeric columns (`font-variant-numeric: tabular-nums`).
- **Right-align numbers**, left-align text.
- **Row hover:** subtle bg change (`bg-surface-raised`), not a colored highlight.
- **Zebra striping** only if >10 rows.
- **No horizontal borders between cells** unless data is extremely dense.

## Empty States

**Functional, not decorative:**

```tsx
// Good: actionable empty state
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="text-muted mb-3">
    <IconInbox className="size-10 stroke-1" />
  </div>
  <h3 className="text-lg font-semibold mb-1">No projects yet</h3>
  <p className="text-sm text-secondary mb-4 max-w-sm">
    Create your first project to get started.
  </p>
  <Button>
    <IconPlus data-icon /> Create Project
  </Button>
</div>

// Bad: generic decorative empty state
<div>
  <img src="/empty-illustration.svg" />  {/* AI-generated illustration */}
  <p>Nothing to see here!</p>             {/* Vague, not actionable */}
</div>
```

## Navigation

### Sidebar Navigation

```tsx
<nav className="flex flex-col gap-1 p-3">
  <NavItem
    className="
      flex items-center gap-3 rounded-md px-3 py-2 text-sm
      text-secondary transition-colors duration-100
      hover:bg-surface-raised hover:text-primary
      data-[active]:bg-surface-raised data-[active]:text-primary data-[active]:font-medium
    "
  >
    <IconDashboard data-icon className="size-4" />
    Dashboard
  </NavItem>
</nav>
```

### Nav Rules
- **Active state:** bg change + text weight increase. Never color-only.
- **Hover:** subtle bg fill. Same pattern as ghost button.
- **Icons:** 16px (size-4) in nav items. Consistent stroke width.
- **Keyboard navigable** with arrow keys within nav groups.

## Modals & Dialogs

```tsx
<Dialog>
  <DialogContent className="
    rounded-xl border border-subtle bg-surface-default shadow-xl
    animate-in fade-in-0 zoom-in-95 duration-250
    data-[state=closed]:animate-out data-[state=closed]:fade-out-0
    data-[state=closed]:zoom-out-95 data-[state=closed]:duration-200
  ">
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>This action cannot be undone.</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter className="flex justify-end gap-3">
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Modal Rules
- **Always have a title** (accessibility requirement).
- **Overlay:** semi-transparent black (`bg-black/60`).
- **Entrance:** fade-in + scale from 95% (250ms, spring easing).
- **Exit:** fade-out + scale to 95% (200ms, ease-in).
- **Close on Escape.** Always.
- **Trap focus** inside modal when open.
- **Actions right-aligned:** Cancel (secondary) then Confirm (primary).

## Toasts / Notifications

- Use **sonner** (not custom toast implementations).
- Position: **bottom-right** for app notifications, **top-center** for marketing.
- Duration: 5s default, persistent for errors.
- Include dismiss button.
- Never use for form validation errors (use inline).

## Badges & Tags

```tsx
// Status badge
<Badge variant="success" className="
  inline-flex items-center gap-1 rounded-sm px-2 py-0.5
  text-xs font-medium
  bg-status-success-bg text-success border border-success/20
">
  <span className="size-1.5 rounded-full bg-current" />
  Active
</Badge>
```

- **Rounded-sm** (4px), not fully round (pills look dated).
- **Status dot** before text for color-blind accessibility.
- **Background at 10% opacity** of the status color.

## Global Anti-Patterns

- Creating custom components when shadcn provides a primitive
- Inconsistent hover patterns across similar elements
- Missing focus-visible states on interactive elements
- Using `div` + `onClick` instead of `button` or `a` (accessibility)
- Mixing border-radius values (8px button next to 16px input)
- Different padding patterns on similar components
- Colored backgrounds for emphasis instead of whitespace + typography
