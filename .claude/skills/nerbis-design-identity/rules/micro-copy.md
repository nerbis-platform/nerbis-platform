# Micro-Copy & Voice

The words in the UI are as much a design element as color or spacing. Premium SaaS products have a consistent, intentional voice — not marketing fluff.

## NERBIS Voice Profile

| Trait | Description | Example |
|-------|-------------|---------|
| **Confident** | State things directly, no hedging | "Your store is live" not "Your store should now be live" |
| **Specific** | Name the exact action/outcome | "Create your first product" not "Get started" |
| **Concise** | Shortest possible without losing clarity | "Saved" not "Your changes have been saved successfully" |
| **Helpful** | Guide when things go wrong | "Check your email for a reset link" not "Something went wrong" |
| **Calm** | No exclamation marks in errors, no fake excitement | "Session expired. Sign in again." not "Oops! You've been logged out!" |

## Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| Success | Brief, confirmatory | "Product created" / "Changes saved" |
| Error | Calm, actionable | "Couldn't save. Check your connection and try again." |
| Empty state | Helpful, directive | "No orders yet. Share your store link to get your first sale." |
| Confirmation | Clear stakes, specific action | "Delete 'Summer Collection'? This removes 12 products permanently." |
| Onboarding | Task-driven, encouraging | "Add your first product — it takes about 2 minutes." |
| Loading | Invisible (skeleton) or brief | "Loading orders..." (only if >3s) |
| Tooltip | One sentence max | "Customers see this on their receipt" |
| Placeholder | Show format/example | "you@company.com" not "Enter your email" |

## Button Copy Rules

### Be Specific — Name the Action

```
Bad:  "Submit"          → Good: "Create account"
Bad:  "Save"            → Good: "Save product"
Bad:  "Get started"     → Good: "Create your store"
Bad:  "Learn more"      → Good: "See pricing details"
Bad:  "Continue"        → Good: "Go to payment"
Bad:  "Confirm"         → Good: "Place order"
Bad:  "OK"              → Good: "Got it" or the specific action
Bad:  "Cancel"          → Good: "Discard changes" (when destructive)
```

### Destructive Actions — State the Consequence

```
Good: "Delete collection" (red button)
Good: "Remove team member"
Good: "Cancel subscription — access ends Apr 30"
Bad:  "Yes, I'm sure"
Bad:  "Confirm deletion"
```

### Paired Button Labels

```
Good: "Discard" / "Save product"
Good: "Cancel" / "Create account"
Good: "Go back" / "Place order"
Bad:  "No" / "Yes"
Bad:  "Cancel" / "OK"
Bad:  "Cancel" / "Confirm"
```

## Error Messages

### Structure: What happened → What to do

```
Good: "Email already registered. Sign in instead?"
Good: "Password must be at least 8 characters."
Good: "Couldn't connect to payment provider. Try again in a moment."
Good: "This domain is already in use by another store."

Bad:  "Invalid input."
Bad:  "An error occurred. Please try again later."
Bad:  "Oops! Something went wrong."
Bad:  "Error 422: Unprocessable entity."
Bad:  "Validation failed."
```

### Form Validation — Inline, Immediate

```
Email:    "Enter a valid email address" (on blur)
Password: "At least 8 characters" (as hint) → "✓" (when valid)
URL:      "Must start with https://" (on blur)
Required: "Store name is required" (on submit attempt)
```

## Empty States

### Structure: Icon (optional) → Title → Description → Primary Action

```tsx
// Good: specific, actionable
<EmptyState
  title="No products yet"
  description="Add your first product to start selling."
  action="Add product"
/>

// Good: with context
<EmptyState
  title="No orders this month"
  description="Share your store link to get your first sale."
  action="Copy store link"
/>

// Bad: vague, no guidance
<EmptyState
  title="Nothing here"
  description="There's nothing to display."
/>

// Bad: decorative, no action
<EmptyState
  illustration={<CuteRobotSVG />}
  title="It's empty in here!"
  description="But don't worry, that's about to change."
/>
```

## Confirmation Dialogs

### Structure: State what will happen → Show impact → Specific actions

```tsx
// Good: specific, shows impact
<Dialog>
  <DialogTitle>Delete "Summer Collection"?</DialogTitle>
  <DialogDescription>
    This permanently removes the collection and its 12 products.
    Customer orders are not affected.
  </DialogDescription>
  <DialogFooter>
    <Button variant="outline">Keep collection</Button>
    <Button variant="destructive">Delete collection</Button>
  </DialogFooter>
</Dialog>

// Bad: vague, generic
<Dialog>
  <DialogTitle>Are you sure?</DialogTitle>
  <DialogDescription>This action cannot be undone.</DialogDescription>
  <DialogFooter>
    <Button>Cancel</Button>
    <Button>Confirm</Button>
  </DialogFooter>
</Dialog>
```

## Toast/Notification Copy

```
Good: "Product saved"           (2-3 words, past tense)
Good: "Invite sent to ana@..."  (specific, past tense)
Good: "Link copied"             (action confirmed)

Bad:  "Success!"                (says nothing)
Bad:  "Your product has been saved successfully."  (too verbose)
Bad:  "Operation completed."    (robotic)
```

## Navigation & Labels

```
Good: "Products" / "Orders" / "Analytics" / "Settings"
Bad:  "Product Management" / "Order Center" / "Analytics Dashboard" / "Configuration"

Good: "Team" / "Billing" / "Integrations"
Bad:  "Team Management" / "Billing & Payments" / "Integration Hub"
```

**Rule:** One word if possible. Two words max. No "Management", "Center", "Hub", "Dashboard" suffixes.

## Numbers & Data

```
Good: "$1,234.56"          (formatted, with currency symbol)
Good: "12,847 orders"      (comma-separated, with unit)
Good: "3 min ago"          (relative, abbreviated)
Good: "Apr 10, 2026"       (readable date)
Good: "+23% from last month" (relative change with context)

Bad:  "1234.56"            (no formatting)
Bad:  "12847"              (no separator)
Bad:  "2026-04-10T14:30:00Z" (ISO format in UI)
Bad:  "+23%"               (no context)
```

## Anti-Patterns

- "Oops!" / "Whoops!" / "Oh no!" — infantilizing, not premium
- Exclamation marks in error messages — adds anxiety
- "Please" everywhere — unnecessary padding
- Marketing language in UI — "Amazing!", "Powerful!", "Revolutionary!"
- Technical jargon — "Validation failed", "Null reference", "Unprocessable entity"
- Passive voice — "The product was saved" vs "Product saved"
- Hedging — "This may take a moment" vs "Loading..."
- Generic copy that could belong to any app — every word should be NERBIS-specific
