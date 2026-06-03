# Mobile Patterns

## Philosophy

Mobile is not a shrunken desktop. It's a different context: one-handed use, variable attention, touch interaction, smaller viewport. NERBIS treats mobile as a **first-class platform**, not a responsive afterthought.

## Thumb Zone

```
┌─────────────────┐
│   HARD TO REACH  │  ← Top bar: only status/branding, no primary actions
│                  │
│   OK TO REACH    │  ← Content area: scrollable, readable
│                  │
│  ████████████    │
│  █ EASY ZONE █   │  ← Bottom: primary actions, navigation, FAB
│  ████████████    │
└─────────────────┘
```

**Rule:** Primary actions go at the bottom. Navigation at the bottom. Destructive actions at the top (harder to hit accidentally).

## Bottom Navigation

```tsx
<nav className="fixed bottom-0 inset-x-0 z-20 md:hidden
                border-t border-subtle bg-surface-default/95 backdrop-blur-sm
                safe-area-bottom"
     aria-label="Primary">
  <div className="flex items-center justify-around h-14 max-w-md mx-auto">
    <NavTab
      icon={<IconHome className="size-5" />}
      label="Home"
      active={current === "home"}
      aria-current={current === "home" ? "page" : undefined}
      className="flex flex-col items-center gap-0.5 px-3 py-1
                 text-[10px] font-medium
                 data-[active]:text-interactive text-muted
                 transition-colors duration-100"
    />
    {/* Max 5 tabs */}
  </div>
</nav>
```

### Rules
- **5 tabs maximum.** If more, use a "More" tab with a secondary menu.
- **Label every tab.** Icon-only nav is ambiguous on mobile.
- **Active state: color change + slightly larger icon or fill change.** Not just underline.
- **Safe area padding** for phones with home indicators (iPhone, modern Android):
  ```css
  .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
  ```

## Bottom Sheets

The primary mobile pattern for secondary content, filters, and actions:

```tsx
// Use Drawer from shadcn/ui (Vaul)
<Drawer>
  <DrawerContent className="max-h-[85vh]">
    {/* Drag handle — visual affordance */}
    <div className="mx-auto mt-2 mb-4 h-1 w-12 rounded-full bg-border-default" />

    <DrawerHeader>
      <DrawerTitle>Filter orders</DrawerTitle>
    </DrawerHeader>

    <div className="px-4 pb-4 overflow-y-auto">
      {/* Content */}
    </div>

    <DrawerFooter className="border-t border-subtle">
      <Button className="w-full">Apply filters</Button>
      <Button variant="ghost" className="w-full">Clear all</Button>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

### When to Use Bottom Sheets
- Filters and sort options
- Context menus (long press or "..." button)
- Sharing/export options
- Quick edit forms
- Confirmation with details

### When NOT to Use Bottom Sheets
- Full forms (use a full-screen page)
- Complex content (use navigation to a new page)
- Critical confirmations (use a dialog — centered, impossible to dismiss accidentally)

## Swipe Gestures

```tsx
// Swipeable list item — reveal actions
<SwipeableRow
  leftAction={{ icon: <IconCheck />, color: "success", label: "Complete" }}
  rightAction={{ icon: <IconTrash />, color: "error", label: "Delete" }}
>
  <OrderRow order={order} />
</SwipeableRow>
```

### Rules
- **Right-to-left swipe:** destructive actions (delete, archive)
- **Left-to-right swipe:** positive actions (complete, approve)
- **Visual feedback during swipe:** color reveal + icon
- **Snap threshold:** 40% of width to confirm, otherwise snap back
- **Always provide a non-gesture alternative** (menu, button)

## Pull-to-Refresh

```tsx
<PullToRefresh onRefresh={handleRefresh}>
  <OrderList orders={orders} />
</PullToRefresh>
```

- Show a subtle spinner at the top during refresh
- Haptic feedback on pull threshold (if supported)
- Maximum refresh indicator height: 60px
- Auto-dismiss after data loads

## Mobile Form Patterns

### Input Focus Behavior
```tsx
// When an input is focused, scroll it into view with keyboard consideration
<Input
  className="h-12 text-base"  /* 48px height, 16px font (prevents iOS zoom) */
  inputMode="email"           /* Show appropriate keyboard */
  autoComplete="email"        /* Enable autofill */
  enterKeyHint="next"         /* Show "Next" on keyboard instead of "Return" */
/>
```

### Important Input Attributes for Mobile

| Attribute | Use Case | Keyboard |
|-----------|----------|----------|
| `inputMode="email"` | Email fields | @ key prominent |
| `inputMode="tel"` | Phone numbers | Numeric keypad |
| `inputMode="numeric"` | Amounts, quantities | Numbers only |
| `inputMode="url"` | URL fields | .com key, no space |
| `inputMode="search"` | Search boxes | Search/submit key |
| `enterKeyHint="next"` | Multi-field forms | "Next" button |
| `enterKeyHint="done"` | Last field in form | "Done" button |
| `enterKeyHint="send"` | Chat/message input | "Send" button |
| `enterKeyHint="search"` | Search input | "Search" button |

### Rules
- **Minimum 16px font on inputs.** Prevents iOS auto-zoom on focus.
- **48px input height** on mobile (vs 40px on desktop).
- **`inputMode` on every input.** Show the right keyboard.
- **`enterKeyHint` on form fields.** Guide the user to the next action.
- **`autoComplete` everywhere.** Let password managers and autofill work.
- **Avoid dropdowns on mobile.** Use radio groups, segmented controls, or bottom sheet pickers.

## Floating Action Button (FAB)

For the primary creation action on list/dashboard pages:

```tsx
<Button
  className="fixed bottom-20 right-4 z-10 md:hidden
             size-14 rounded-full shadow-lg
             bg-interactive text-inverse
             active:scale-95 transition-transform duration-100"
  aria-label="Add product"
>
  <IconPlus className="size-6" />
</Button>
```

### Rules
- **One FAB per screen maximum.**
- **Bottom-right position** (right thumb zone).
- **56px (size-14)** diameter.
- **Above bottom nav** (`bottom-20` = 80px = nav height + spacing).
- **Always has `aria-label`.**
- **Scale down on press** (active:scale-95) for tactile feedback.
- **Hide on scroll down, show on scroll up** (optional, reduces obstruction).

## Mobile-Specific Patterns

### Action Sheet (Context Menu Alternative)

```tsx
// Triggered by long-press or "..." button
<Drawer>
  <DrawerContent>
    <div className="py-2">
      <ActionItem icon={<IconEdit />} label="Edit product" />
      <ActionItem icon={<IconCopy />} label="Duplicate" />
      <ActionItem icon={<IconShare />} label="Share link" />
      <Separator />
      <ActionItem icon={<IconTrash />} label="Delete" destructive />
    </div>
    <DrawerFooter>
      <Button variant="ghost" className="w-full">Cancel</Button>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

### Sticky Action Bar

For forms and detail pages where the primary action needs to be always visible:

```tsx
<div className="fixed bottom-0 inset-x-0 z-20 md:hidden
                border-t border-subtle bg-surface-default/95 backdrop-blur-sm
                p-4 safe-area-bottom">
  <Button className="w-full h-12">Save product</Button>
</div>

{/* Add bottom padding to content so sticky bar doesn't cover it */}
<div className="pb-24 md:pb-0">
  {/* Form content */}
</div>
```

## Performance on Mobile

- **Images:** Use `loading="lazy"`, `srcSet` for responsive sizes, WebP/AVIF format
- **Fonts:** Subset to Latin characters, max 2 weights on mobile
- **Animations:** Reduce or remove on `prefers-reduced-motion`
- **Touch events:** Use `passive: true` on scroll listeners
- **Viewport:** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- **Content-visibility:** Use `content-visibility: auto` on off-screen sections

## Rules

1. **Primary actions at the bottom of the screen.** Thumb zone.
2. **44x44px minimum touch targets.** 48px preferred for primary actions.
3. **16px minimum font on inputs.** Prevents iOS zoom.
4. **`inputMode` on every input.** Right keyboard for the context.
5. **Bottom sheets over modals.** Easier to reach, easier to dismiss.
6. **FAB for the primary creation action.** One per screen.
7. **Safe area padding.** Account for home indicators and notches.
8. **Test on real devices.** Emulators miss touch, scroll, and keyboard behaviors.
9. **Every gesture has a button alternative.** Swipe is a shortcut, not the only path.
10. **Full-width buttons on mobile.** Easier to tap, clearer visual hierarchy.

## Anti-Patterns

- Desktop-style dropdown menus on mobile (use bottom sheets)
- Hover-dependent features with no touch alternative
- Tiny "x" close buttons (< 44px)
- Fixed header + fixed footer that leave < 60% viewport for content
- Inputs that auto-zoom on iOS (font < 16px)
- Desktop sidebar navigation on mobile (hidden behind hamburger, far from thumb)
- Pinch-to-zoom disabled (`user-scalable=no`) — accessibility violation
- Toast notifications that cover the bottom nav
- Multi-column layouts on screens < 640px
- Large hero images that push content below the fold on mobile
