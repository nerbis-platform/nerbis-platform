---
name: code-quality
description: >
  Audit code for clean code principles, technical debt, and maintainability.
  Trigger: When reviewing code quality, refactoring, or during sdd-verify to check
  clean code compliance. Also when user says "review code quality", "check clean code",
  "audit tech debt", "revisar calidad", "deuda técnica".
license: MIT
metadata:
  author: nerbis-platform
  version: "1.0"
---

## Purpose

You audit code for clean code principles, technical debt indicators, and
maintainability. You produce actionable findings — not vague suggestions.

## When to Load This Skill

- During `sdd-verify` — after checking specs compliance
- During `sdd-apply` — before marking a batch complete
- Standalone — when user asks for a code quality review
- During PR review — to catch quality issues before merge

## Clean Code Principles to Check

### 1. Single Responsibility (SRP)

| Check | Red Flag | Example |
|-------|----------|---------|
| File length | > 300 lines | A component doing UI + logic + API calls |
| Function length | > 40 lines | A handler doing validation + API + state + navigation |
| Mixed concerns | Component has business logic | `AuthSplitScreen.tsx` with 1782 lines = SRP violation |

**Action:** Recommend splitting into focused modules. Be specific:
- "Extract `LoginFormPanel` to `components/auth/LoginFormPanel.tsx`"
- "Move validation schemas to `lib/schemas/auth.ts`"
- "Extract constants to `components/auth/constants.ts`"

### 2. DRY (Don't Repeat Yourself)

| Check | Red Flag |
|-------|----------|
| Duplicated JSX blocks | Same input pattern repeated 5+ times |
| Duplicated logic | Same fetch/validation pattern in multiple files |
| Duplicated styles | Same Tailwind class string repeated across components |

**Action:** Suggest extraction. Be specific about WHAT to extract and WHERE.

### 3. Naming

| Check | Good | Bad |
|-------|------|-----|
| Variables | `isAuthenticated`, `tenantSlug` | `flag`, `data`, `temp` |
| Functions | `handleLoginSubmit`, `validateEmail` | `doStuff`, `process`, `handle` |
| Components | `PasswordStrengthMeter` | `Thing`, `Comp1`, `MyComponent` |
| Files | `password-strength-meter.tsx` | `comp.tsx`, `utils2.ts` |

### 4. Complexity

| Check | Threshold | Action |
|-------|-----------|--------|
| Nesting depth | > 3 levels | Extract inner logic to functions |
| Conditional chains | > 3 if/else | Use lookup objects or early returns |
| Props count | > 7 props | Component is doing too much — split it |
| State variables | > 5 useState in one component | Extract to custom hook |

### 5. Error Handling

| Check | Red Flag |
|-------|----------|
| Silent catches | `catch { /* silent */ }` or `catch {}` |
| Generic errors | `catch (e) { toast.error("Error") }` without context |
| No error boundaries | React components without ErrorBoundary wrappers |
| No loading states | Async operations without loading/error feedback |

### 6. Type Safety

| Check | Red Flag |
|-------|----------|
| `any` usage | `data: any`, `error: any` |
| Missing return types | Functions without explicit return type |
| Loose generics | `Array<any>`, `Record<string, any>` |
| Type assertions | `as unknown as X` — usually hides a real type issue |

## Technical Debt Indicators

### Severity: Critical

- **Security:** Hardcoded credentials, API keys in code, missing input sanitization
- **Data leaks:** Cross-tenant queries without tenant filter, missing authorization checks
- **Memory leaks:** Uncleared intervals/timeouts, missing cleanup in useEffect

### Severity: High

- **God components:** Files > 500 lines with mixed responsibilities
- **Prop drilling:** Props passed through 3+ levels without Context
- **Inline styles:** `style={{ }}` instead of Tailwind/CSS — harder to maintain
- **Magic numbers:** Hardcoded values without named constants (`setTimeout(600)`)

### Severity: Medium

- **TODO/FIXME/HACK:** Comments indicating known shortcuts
- **Dead code:** Unused imports, unreachable code, commented-out blocks
- **Missing tests:** Public API functions without test coverage
- **Inconsistent patterns:** Mixing fetch + axios, mixing CSS approaches

### Severity: Low

- **Long import lists:** > 10 imports from same package (consider barrel export)
- **Unnecessary comments:** Comments that repeat what code says
- **Inconsistent naming:** Mix of camelCase and snake_case in same file

## NERBIS-Specific Checks

### Backend (Django)

- Models inherit `TenantAwareModel` with `TenantAwareManager`
- Views use `perform_create` with `tenant=self.request.tenant`
- Serializers exclude `tenant` field
- No raw SQL without tenant filtering
- Type hints: `str | None` (not `Optional[str]`)
- No modification of existing migrations

### Frontend (Next.js + React)

- Server Components by default, `"use client"` only when needed
- Context API used correctly (not prop drilling)
- API calls include `X-Tenant-Slug` header
- shadcn/ui components used correctly (not custom implementations of existing components)
- No `useEffect` for data that could be fetched server-side

## Output Format

When auditing, produce a structured report:

```markdown
## Code Quality Audit

### Summary
- **Files reviewed:** {N}
- **Critical issues:** {N}
- **High issues:** {N}
- **Medium issues:** {N}
- **Tech debt score:** {LOW | MEDIUM | HIGH | CRITICAL}

### Critical Issues
| # | File | Line | Issue | Suggested Fix |
|---|------|------|-------|---------------|
| 1 | `path/file.tsx` | L42 | Description | Specific action |

### High Issues
| # | File | Line | Issue | Suggested Fix |
|---|------|------|-------|---------------|

### Medium Issues
| # | File | Line | Issue | Suggested Fix |
|---|------|------|-------|---------------|

### Refactoring Opportunities
| File | Current | Suggested | Impact |
|------|---------|-----------|--------|
| `path/file.tsx` | 1782 lines, mixed concerns | Split into 5 focused components | HIGH |

### Tech Debt Summary
{Brief paragraph on overall code health and recommended priorities}
```

## Rules

- ALWAYS give specific file paths and line numbers
- ALWAYS suggest concrete fixes, not vague "improve this"
- Prioritize by severity — Critical first, then High, then Medium
- For NERBIS: always check tenant isolation and type hints
- Do NOT flag style preferences (tabs vs spaces, quote style) — that's linter territory
- Do NOT suggest changes that break existing functionality
- If code is clean, say so — don't invent problems
