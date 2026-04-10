# Responsive Patterns

## Philosophy

Responsive design is NOT "stack everything vertically on mobile." Components should **transform intelligently** across breakpoints — changing layout, density, and interaction patterns, not just shrinking.

## Breakpoints (reminder)

```css
--breakpoint-sm:  640px;   /* Large phones */
--breakpoint-md:  768px;   /* Tablets */
--breakpoint-lg:  1024px;  /* Small laptops */
--breakpoint-xl:  1280px;  /* Desktops */
--breakpoint-2xl: 1536px;  /* Large screens */
```

**Mobile-first:** Base styles = mobile. Enhance with `min-width`.

## Component Transformations

### Navigation

| Breakpoint | Pattern |
|-----------|---------|
| Mobile (<768px) | Bottom tab bar (5 items max) + hamburger for secondary nav |
| Tablet (768-1024px) | Collapsed sidebar (icons only, 56px) + expand on hover/click |
| Desktop (>1024px) | Full sidebar (240px) with labels |

```tsx
// Bottom tab bar — mobile only
<nav className="fixed bottom-0 inset-x-0 z-20 border-t border-subtle bg-surface-default
                flex items-center justify-around h-14 px-2
                md:hidden">
  <NavTab icon={<IconHome />} label="Home" />
  <NavTab icon={<IconPackage />} label="Products" />
  <NavTab icon={<IconShoppingBag />} label="Orders" />
  <NavTab icon={<IconBarChart />} label="Analytics" />
  <NavTab icon={<IconMenu />} label="More" />
</nav>

// Sidebar — tablet+ only
<aside className="hidden md:flex flex-col border-r border-subtle
                  w-14 lg:w-60 transition-all duration-200">
  {/* Icon-only on tablet, full on desktop */}
</aside>
```

### Stat Cards

| Breakpoint | Layout |
|-----------|--------|
| Mobile | 2x2 grid, compact (small text, no sparkline) |
| Tablet | 2x2 grid, full size |
| Desktop | 4 in a row, full size with sparklines |

```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
  <StatCard
    label="Revenue"
    value="$12,847"
    change="+23%"
    sparkline={/* hidden on mobile */}
    className="[&_.sparkline]:hidden lg:[&_.sparkline]:block"
  />
</div>
```

### Data Tables

| Breakpoint | Pattern |
|-----------|---------|
| Mobile (<640px) | Card list (stacked key-value pairs) |
| Tablet (640-1024px) | Table with horizontal scroll, 3-4 visible columns |
| Desktop (>1024px) | Full table, all columns visible, sticky header |

```tsx
// Mobile: card list
<div className="sm:hidden space-y-3">
  {orders.map(order => (
    <div key={order.id} className="p-4 border border-subtle rounded-lg space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-medium">{order.customer}</span>
        <Badge variant={order.status}>{order.status}</Badge>
      </div>
      <div className="flex justify-between text-sm text-secondary">
        <span>{order.date}</span>
        <span className="tabular-nums font-mono">{order.total}</span>
      </div>
    </div>
  ))}
</div>

// Tablet+: real table
<div className="hidden sm:block overflow-x-auto">
  <Table>...</Table>
</div>
```

### Forms

| Breakpoint | Pattern |
|-----------|---------|
| Mobile | Single column, full-width inputs, large touch targets (48px height) |
| Tablet | Single column, medium inputs |
| Desktop | Two-column for related fields (First name / Last name), labels above |

```tsx
<form className="space-y-4">
  {/* Related fields side by side on desktop */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Field label="First name" />
    <Field label="Last name" />
  </div>

  {/* Full width fields stay full width */}
  <Field label="Email address" />
  <Field label="Message" type="textarea" />
</form>
```

**Mobile input height:** 48px minimum (44px touch target + 4px padding).

### Modals & Dialogs

| Breakpoint | Pattern |
|-----------|---------|
| Mobile | Full-screen sheet (slide up from bottom) |
| Tablet+ | Centered dialog with overlay |

```tsx
// Use Sheet on mobile, Dialog on desktop
<ResponsiveDialog>
  {/* On mobile: renders as Sheet (bottom → up, full width) */}
  {/* On desktop: renders as Dialog (centered, max-w-md) */}
</ResponsiveDialog>
```

### Charts

| Breakpoint | Pattern |
|-----------|---------|
| Mobile | Simplified: stat card with sparkline, or horizontal bar chart |
| Tablet | Medium chart with fewer data points, horizontal scroll if needed |
| Desktop | Full chart with all data points, hover tooltips, legend |

```tsx
// Mobile: simplified stat + sparkline
<div className="lg:hidden">
  <StatCard value="$12,847" change="+23%" sparkline={data} />
</div>

// Desktop: full line chart
<div className="hidden lg:block h-64">
  <LineChart data={data} />
</div>
```

### Buttons & CTAs

| Breakpoint | Pattern |
|-----------|---------|
| Mobile | Full-width buttons, stacked vertically, 48px height |
| Desktop | Inline buttons, auto-width, 40px height |

```tsx
<div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
  <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
  <Button className="w-full sm:w-auto">Save product</Button>
</div>
```

### Hero Sections (Marketing)

| Breakpoint | Pattern |
|-----------|---------|
| Mobile | Text centered, stacked, image below (or hidden) |
| Desktop | Text left (60%) + visual right (40%), or text centered with bg |

```tsx
<section className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-16 items-center py-16 lg:py-24">
  <div className="lg:col-span-3 text-center lg:text-left">
    <h1 className="text-4xl lg:text-display font-bold tracking-tighter">...</h1>
    <p className="text-lg text-secondary mt-4 max-w-xl mx-auto lg:mx-0">...</p>
    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
      <Button size="lg">Create your store</Button>
      <Button size="lg" variant="outline">See demo</Button>
    </div>
  </div>
  <div className="lg:col-span-2">
    {/* Product screenshot or interactive demo */}
  </div>
</section>
```

## Container Queries (Component-Responsive)

For components that appear in different contexts (sidebar, main content, modal):

```css
/* The card adapts to its container, not the viewport */
.product-card-container {
  container-type: inline-size;
}

@container (min-width: 300px) {
  .product-card {
    /* Horizontal layout */
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: 12px;
  }
}

@container (max-width: 299px) {
  .product-card {
    /* Vertical/compact layout */
    display: flex;
    flex-direction: column;
  }
}
```

## Touch Targets

| Element | Minimum Size | Spacing |
|---------|-------------|---------|
| Buttons | 44x44px | 8px between |
| Links in nav | 44px height | 4px between |
| Checkboxes/radios | 44x44px (hit area) | 12px between |
| Table rows (interactive) | 48px height | 0 (borders separate) |
| Icon buttons | 44x44px (add padding if icon is smaller) | 8px between |

**Rule:** The visual element can be smaller, but the **tap target** must be 44x44px minimum. Use transparent padding to extend hit areas.

## Gestures (Mobile Web)

| Gesture | Use Case |
|---------|----------|
| Swipe left/right | Navigate between tabs, dismiss cards |
| Pull down | Refresh data (with haptic feedback if supported) |
| Long press | Show context menu (as alternative to right-click) |
| Pinch | Zoom on images/charts only |

**Rule:** Every gesture must have a visible alternative (button, menu item). Gestures are shortcuts, not the only path.

## Rules

1. **Mobile-first CSS.** Base = mobile, enhance with `min-width`.
2. **Tables become card lists on mobile.** Horizontal scroll is a last resort.
3. **Modals become bottom sheets on mobile.** Center dialogs feel wrong on small screens.
4. **Navigation moves to bottom on mobile.** Thumbs reach the bottom, not the top.
5. **44px minimum touch targets.** No exceptions on mobile.
6. **Full-width buttons on mobile, auto-width on desktop.**
7. **Container queries for reusable components.** Viewport queries for page layout.
8. **Test on real devices, not just browser resize.** Touch, scroll, keyboard behaviors differ.
9. **Hide complexity, not content.** Mobile users need the same info, just presented differently.
10. **No horizontal scroll on the page.** Individual components (tables, code blocks) may scroll horizontally.

## Anti-Patterns

- Hiding important content on mobile with `hidden sm:block` (hide chrome, not content)
- Desktop nav at the top on mobile (unreachable with one hand)
- Tiny tap targets (< 44px) justified by "it's just a link"
- Hover-dependent interactions with no mobile alternative
- Fixed-position elements that cover content on mobile keyboards
- Horizontal scroll on the main page layout
- Same padding on mobile and desktop (mobile needs less horizontal, more vertical)
- Testing only in Chrome DevTools mobile emulator (doesn't catch real touch/scroll issues)
