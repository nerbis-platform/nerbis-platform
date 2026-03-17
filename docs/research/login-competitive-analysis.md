# Competitive Analysis: Login/Sign-In Experiences

**Date:** March 2026
**Purpose:** Drive design decisions for NERBIS login experience
**Platforms analyzed:** Shopify, Wix, Squarespace, Tiendanube, BigCommerce, Webflow

---

## 1. Competitor Comparison Table

| Feature | Shopify | Wix | Squarespace | Tiendanube | BigCommerce | Webflow |
|---|---|---|---|---|---|---|
| **Social Login (Google)** | Yes | Yes | Yes | No | Yes (via plugins) | Yes |
| **Social Login (Apple)** | Yes | No | Yes | No | No | No |
| **Social Login (Facebook)** | Yes | Yes | Yes | No | Yes (via plugins) | Yes |
| **Passkeys/Passwordless** | Yes (Shop Pay) | No | No | No | Yes (OTP) | Via integrations |
| **Magic Link** | No | No | No | No | Yes | Via integrations |
| **2FA/MFA** | Yes (multiple methods) | Limited | Yes | Yes (email code) | Yes (SMS/Email) | SSO-based |
| **SSO Support** | No (merchant) | No | No | No | Yes | Yes (Enterprise) |
| **Password Show/Hide** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Remember Me** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Split-Screen Layout** | No (centered form) | No (modal/overlay) | No (centered) | No (centered) | No (centered) | Varies (templates) |
| **Brand Illustration** | Minimal (logo only) | Minimal | Minimal | Minimal | None | Design-forward |
| **Inline Error Messages** | Yes | Yes | Basic | Basic | Yes | Varies |
| **WCAG AA Compliance** | Partial | Partial (default forms accessible) | Partial | Unknown | Partial | Partial |
| **Mobile Responsive** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Password Strength Indicator** | No (on signup) | No | No | No | No | No |
| **Keyboard Navigation** | Good | Good | Good | Basic | Good | Good |

---

## 2. Individual Platform Analysis

### 2.1 Shopify (accounts.shopify.com)

**Layout & Visual Design:**
- Centered single-column form on a white/light background
- Clean, minimal aesthetic aligned with Polaris design system
- Shopify logo prominently placed at the top
- No illustrations, no split-screen; purely functional

**Typography:**
- Uses Inter/system fonts; clean and legible
- Clear hierarchy: logo > heading ("Log in") > form labels > links
- Body text ~16px, labels appropriately sized

**Color & Contrast:**
- Predominantly white with green (#008060) as the primary action color
- High contrast text on light backgrounds
- CTA button uses brand green, clearly distinguishable

**Form UX:**
- Email field first, then password on a second step (progressive disclosure)
- Social login options (Google, Apple, Facebook) displayed as alternative entry points
- "Continue with email" as primary CTA
- Password field has show/hide toggle

**Strengths:**
- Progressive disclosure (email first) reduces cognitive load
- Multiple auth paths clearly presented
- Clean, distraction-free interface

**Weaknesses:**
- No brand storytelling or visual personality on login
- The two-step email-then-password flow can feel slow for returning users
- No passkey support for merchant accounts (only via Shop Pay for customers)
- No password strength indicator on signup

---

### 2.2 Wix (users.wix.com)

**Layout & Visual Design:**
- Modal/overlay-style login form
- Compact design, centers the form on a clean background
- Wix branding at the top

**Typography:**
- System/sans-serif fonts
- Standard hierarchy; nothing distinctive
- Adequate sizing for readability

**Color & Contrast:**
- Blue primary action color (#116DFF)
- White background, dark text
- Sufficient contrast for readability

**Form UX:**
- Email and password on the same screen
- Social login via Google and Facebook
- Customizable for end-user site member login forms
- Default forms are designed to be accessible

**Strengths:**
- Built-in accessibility on default forms
- Highly customizable for site owners' member areas
- Auto-matches site colors and text themes

**Weaknesses:**
- No Apple sign-in option
- No passkey or magic link support
- Generic visual design; no premium feel
- Limited authentication innovation compared to competitors
- No passwordless options

---

### 2.3 Squarespace (login.squarespace.com)

**Layout & Visual Design:**
- Clean, centered form with generous whitespace
- Design-forward aesthetic consistent with Squarespace brand
- Minimalist approach, subtle animations

**Typography:**
- Premium sans-serif typography (consistent with their design-forward brand)
- Well-defined hierarchy
- Clean and modern feel

**Color & Contrast:**
- Black and white primary palette
- Minimal use of color; monochromatic elegance
- High contrast ratios

**Form UX:**
- Email/password with social options (Google, Apple, Facebook)
- Clean social login buttons with platform icons
- 2FA available as optional enhancement
- Password-protected pages as alternative access model

**Strengths:**
- Apple sign-in support (rare among competitors)
- Clean, premium visual aesthetic
- Strong brand consistency
- Good social login variety

**Weaknesses:**
- No passwordless or passkey options
- Limited customization of the admin login page
- No innovative authentication patterns
- No adaptive MFA or risk-based authentication
- Code-only customization for login pages

---

### 2.4 Tiendanube (tiendanube.com)

**Layout & Visual Design:**
- Simple, functional centered form
- Purple/violet brand colors
- Straightforward Latin American market focus

**Typography:**
- Standard sans-serif typography
- Spanish/Portuguese language support as priority
- Functional rather than design-forward

**Color & Contrast:**
- Purple (#6C31BC) primary brand color
- White backgrounds
- Adequate but not exceptional contrast

**Form UX:**
- Email and password standard form
- 2FA via email verification codes (mandatory)
- No social login options
- Basic form validation

**Strengths:**
- Mandatory 2FA adds security layer
- Localized for Latin American market
- Simple, straightforward flow

**Weaknesses:**
- No social login whatsoever (major gap)
- No passwordless options
- No passkey support
- Visually dated compared to global competitors
- Limited accessibility features documented
- No Apple/Google sign-in represents significant friction
- Email-only 2FA is less secure than authenticator apps

---

### 2.5 BigCommerce (login.bigcommerce.com)

**Layout & Visual Design:**
- Centered form, clean corporate aesthetic
- BigCommerce branding at top
- Functional enterprise feel

**Typography:**
- Standard sans-serif, clean and legible
- Corporate hierarchy

**Color & Contrast:**
- Blue primary CTA
- White background, sufficient contrast

**Form UX:**
- Email/password standard fields
- SSO link available below password field
- 90-day forced password rotation (PCI compliance)
- Passwordless login available via OTP

**Strengths:**
- SSO support (important for enterprise)
- Passwordless login via OTP
- PCI compliance-driven security
- Social login support (40+ providers via plugins)

**Weaknesses:**
- Forced 90-day password rotation is hostile UX (NIST discourages this)
- Social login requires third-party plugins, not native
- No passkey support
- Corporate, not premium design aesthetic
- No brand personality in login experience

---

### 2.6 Webflow (webflow.com/dashboard/login)

**Layout & Visual Design:**
- Design-forward, clean and modern
- Uses brand illustration and color confidently
- Templates showcase split-screen and creative layouts

**Typography:**
- Premium typography choices
- Strong visual hierarchy
- Design-forward font pairings

**Color & Contrast:**
- Blue-black primary palette
- Clean contrast
- Sophisticated color usage

**Form UX:**
- Google SSO as primary login method
- Email/password alternative
- Clean, minimal form with clear CTAs
- Third-party integrations for passkeys and advanced auth

**Strengths:**
- Design-forward aesthetic sets industry standard
- Strong Google SSO integration
- Beautiful login templates for inspiration
- Integrations with modern auth (Descope, Firebase)

**Weaknesses:**
- Native User Accounts being sunset (Jan 2026)
- Relies on third-party for advanced authentication
- No native passkey support
- Limited social login options (primarily Google)

---

## 3. Identified Weaknesses Per Competitor

### Shopify
1. Two-step login flow adds friction for returning users
2. No visual storytelling or brand personality on login page
3. No passkey support for merchant admin accounts
4. Purely functional -- misses opportunity for brand differentiation

### Wix
1. No Apple sign-in (increasingly expected in 2026)
2. No passwordless authentication options
3. Generic visual design lacks premium positioning
4. No passkey or biometric authentication support
5. Limited security beyond basic 2FA

### Squarespace
1. No passwordless or passkey options despite design-forward brand
2. Code-only customization creates barrier for non-developers
3. No adaptive or risk-based MFA
4. Limited innovation in authentication flow

### Tiendanube (biggest opportunity for NERBIS)
1. **Zero social login options** -- massive friction point
2. No passwordless authentication
3. Visually dated design compared to global platforms
4. Email-only 2FA is weakest verification method
5. No accessibility documentation or WCAG compliance visible
6. Lack of modern auth patterns (passkeys, magic links)
7. Limited localized security options

### BigCommerce
1. Forced 90-day password rotation is poor UX
2. Social login only via third-party plugins
3. Corporate aesthetic lacks warmth or personality
4. No native passkey support

### Webflow
1. Sunsetting native User Accounts creates uncertainty
2. Relies entirely on third-party for advanced auth
3. Limited social login options beyond Google

---

## 4. Opportunities for NERBIS to Differentiate

### 4.1 Authentication Innovation
- **Be the first in the LatAm e-commerce space to offer passkeys natively.** With 75% consumer recognition and 412% growth in 2025, passkeys are no longer experimental.
- **Offer magic link login** as passwordless alternative (41% of implementations use this -- it is the most deployed method).
- **Adaptive MFA** that adjusts based on device reputation, geolocation, and login behavior -- none of the competitors do this.

### 4.2 Visual & Brand Experience
- **Split-screen layout** with rotating brand illustrations on the left, form on the right. No competitor in the e-commerce admin space does this effectively.
- **Brand storytelling on login:** use the login page as a brand touchpoint, not just a gate. Notion, Linear, and ClickUp prove this works in SaaS.
- **Animated micro-interactions** on form focus, button hover, and transitions -- creates a premium feel.

### 4.3 LatAm Market Advantage (vs. Tiendanube)
- **Social login (Google, Apple, Facebook)** would immediately surpass Tiendanube's offering.
- **Localized language and currency context** on login page reinforces market positioning.
- **Authenticator app support** (not just email codes) for proper 2FA.

### 4.4 Accessibility Leadership
- **WCAG 2.2 AA compliance from day one** -- no competitor fully achieves this.
- **Top-aligned static labels** (not floating labels) for best accessibility.
- **Visible focus indicators, keyboard navigation, and screen reader optimization.**

### 4.5 Developer & Enterprise Experience
- **Native SSO support** for enterprise clients -- only BigCommerce offers this natively.
- **API-first auth architecture** that allows headless implementations.

---

## 5. Top 10 Actionable Recommendations

### 1. Implement Progressive Authentication Flow
Start with email/identifier field only, then dynamically show the appropriate auth method (password, magic link, passkey, or SSO). This matches Shopify's pattern but extends it with smarter detection.

### 2. Offer Three Social Login Providers: Google, Apple, Facebook
This covers 95%+ of social login demand. Apple sign-in is legally required on iOS and only Shopify and Squarespace offer it among competitors. Display social buttons prominently above the email field with clear "or" dividers.

### 3. Native Passkey Support
Implement WebAuthn/FIDO2 passkeys as a first-class login method. With 70% of users having at least one passkey by end of 2025 and e-commerce leading adoption (50% of all passkey authentications), this is now table-stakes for premium positioning.

### 4. Split-Screen Layout with Brand Storytelling
- **Left panel (60%):** rotating brand illustration, value proposition, or testimonial
- **Right panel (40%):** clean login form
- On mobile: form only, illustration becomes subtle background or disappears
- This creates a premium, memorable login experience that no e-commerce admin competitor offers

### 5. Top-Aligned Static Labels (Not Floating)
Research conclusively shows top-aligned labels beat floating labels for:
- Accessibility (motion sensitivity, cognitive disabilities)
- Form completion speed
- Error rates
Use permanent visible labels above each field. Reserve placeholder text for format hints only (e.g., "name@company.com").

### 6. Inline, Specific Error Messages
- Position errors immediately below the relevant field
- Use specific language: "That password is incorrect. Try again or reset it." (not "Invalid credentials")
- Use red (#DC2626 or similar) with an icon for visual + text redundancy
- Real-time validation on email format before submission

### 7. Adaptive MFA with Graceful Escalation
- Default: low-friction login for recognized devices
- Escalate to 2FA only on new devices, new locations, or suspicious patterns
- Offer authenticator app, SMS, and email as 2FA options
- Never force 2FA unnecessarily (avoid BigCommerce's hostile pattern)

### 8. Premium Typography & Color System
**Typography:**
- Base body: 16px minimum, Inter or similar premium sans-serif
- Heading: 28-32px, semi-bold, for "Welcome back" or brand greeting
- Labels: 14px, medium weight, high contrast
- Scale ratio: 1.25 (Major Third) for consistent hierarchy
- Limit to 2-3 font weights for performance

**Color:**
- Primary CTA: single bold brand color (ensure 4.5:1 contrast ratio minimum)
- Background: white or very light neutral (#FAFAFA)
- Text: near-black (#111827) for maximum readability
- Error: red (#DC2626) with icon
- Success: green (#059669)
- Links: brand color or blue (#2563EB)
- Form borders: #D1D5DB (3:1 minimum against background)

### 9. Full WCAG 2.2 AA Compliance
- **3.3.7 Accessible Authentication:** offer non-cognitive alternatives (passkeys, magic links)
- **3.3.8 Redundant Entry:** auto-fill support, never clear fields on error
- **3.2.6 Consistent Help:** help link is always in the same position
- **2.4.11 Focus Not Obscured:** visible focus ring on all interactive elements (minimum 2px, high contrast)
- **1.4.3 Contrast:** 4.5:1 for normal text, 3:1 for large text and UI components
- Keyboard navigation: full tab flow through all form elements
- Screen reader: proper ARIA labels, live regions for error announcements
- Reduced motion: respect `prefers-reduced-motion` media query

### 10. Thoughtful Micro-Copy & Welcome Experience
- "Welcome back" or personalized greeting (if returning user detected)
- "New to NERBIS? Create your store" link with clear visual weight
- Password recovery: "Forgot password?" prominently placed, not hidden
- Loading states: subtle spinner or skeleton on submission
- Success: brief animation or transition to dashboard (not abrupt redirect)

---

## 6. Typography Recommendations

| Element | Size | Weight | Line Height |
|---|---|---|---|
| Brand greeting ("Welcome back") | 28-32px | 600 (Semi-bold) | 1.2 |
| Sub-heading / description | 16px | 400 (Regular) | 1.5 |
| Form labels | 14px | 500 (Medium) | 1.4 |
| Input text | 16px | 400 (Regular) | 1.5 |
| Placeholder text | 16px | 400 (Regular) | 1.5 |
| CTA button text | 16px | 600 (Semi-bold) | 1.0 |
| Helper/error text | 13-14px | 400 (Regular) | 1.4 |
| Link text | 14px | 500 (Medium) | 1.4 |

**Font recommendation:** Inter (open-source, excellent readability, wide language support including Latin American character sets). Alternative: system font stack for maximum performance.

**Minimum sizes:** Never below 13px for any visible text. Error messages and helper text at 13-14px minimum.

---

## 7. Color Recommendations

### Primary Palette

| Use | Color | Ratio | Notes |
|---|---|---|---|
| Background | #FFFFFF or #FAFAFA | -- | Clean, premium feel |
| Primary text | #111827 | 15.4:1 on white | Near-black for readability |
| Secondary text | #6B7280 | 4.6:1 on white | Meets AA for normal text |
| Primary CTA | Brand color | Min 4.5:1 on white | Bold, unmistakable |
| CTA text | #FFFFFF | Min 4.5:1 on CTA | White on brand color |
| Input border (default) | #D1D5DB | 3:1 on white | Meets UI component requirement |
| Input border (focus) | Brand color | 3:1+ on white | Clear focus indication |
| Error | #DC2626 | 4.6:1 on white | With icon for redundancy |
| Success | #059669 | 4.6:1 on white | Confirmation states |
| Link | #2563EB or brand | 4.5:1+ on white | Clearly interactive |

### Dark Mode Consideration
If implementing dark mode:
- Background: #0F172A or #1E293B
- Text: #F8FAFC
- Maintain same contrast ratios inverted
- Test all error/success colors against dark backgrounds

---

## 8. Accessibility Checklist (WCAG 2.2 AA)

- [ ] All text meets 4.5:1 contrast ratio (1.4.3)
- [ ] UI components meet 3:1 contrast ratio (1.4.11)
- [ ] Focus indicators visible and not obscured (2.4.11, 2.4.7)
- [ ] All form fields have visible, persistent labels (1.3.1, 3.3.2)
- [ ] Error messages are specific and positioned inline (3.3.1, 3.3.3)
- [ ] Non-cognitive authentication available -- passkeys or magic links (3.3.7)
- [ ] Auto-fill supported, fields not cleared on error (3.3.8)
- [ ] Help link in consistent position (3.2.6)
- [ ] Full keyboard navigation (2.1.1)
- [ ] Screen reader compatible with ARIA labels (4.1.2)
- [ ] Respects `prefers-reduced-motion` (2.3.3)
- [ ] Touch targets minimum 24x24px, ideally 44x44px (2.5.8)
- [ ] Error announcements via ARIA live regions
- [ ] Language attribute set correctly for LatAm Spanish/Portuguese

---

## 9. Key Statistics Supporting Recommendations

| Statistic | Source |
|---|---|
| 88% of users won't return after bad UX | Authgear 2025 |
| Reducing form fields from 4 to 3 increases conversions by 50% | UX research |
| 27% of users abandon long signup forms | UX research |
| 75% of consumers now recognize passkeys | FIDO Alliance 2025 |
| Passkey adoption surged 412% in 2025 | Authsignal |
| 70% of users have at least one passkey | State of Passkeys 2026 |
| Magic links are 41% of passwordless implementations | MojoAuth 2026 |
| 53% of mobile users abandon slow-loading sites | Google |
| Well-structured typography boosts scanability by 47% | UX research |
| 66% of B2B customers churn after poor onboarding | SaaS UX research |
| E-commerce = 50% of all passkey authentications | FIDO Alliance |
| European Accessibility Act in force since June 2025 | EU |

---

## Sources

- [Authgear - Login & Signup UX: The 2025 Guide](https://www.authgear.com/post/login-signup-ux-guide)
- [UXPin - Login Page Design Guide for SaaS](https://www.uxpin.com/studio/blog/login-page-design/)
- [Lollypop - SaaS Login Page Design](https://lollypop.design/blog/2025/october/saas-login-page-design/)
- [Authsignal - Passwordless Authentication in 2025](https://www.authsignal.com/blog/articles/passwordless-authentication-in-2025-the-year-passkeys-went-mainstream)
- [FIDO Alliance - World Passkey Day 2025](https://fidoalliance.org/fido-alliance-champions-widespread-passkey-adoption-and-a-passwordless-future-on-world-passkey-day-2025/)
- [State of Passkeys 2026](https://state-of-passkeys.io/)
- [MojoAuth - State of Passwordless 2026](https://mojoauth.com/data-and-research-reports/state-of-passwordless-2026/)
- [AllAccessible - WCAG 2.2 Complete Guide 2025](https://www.allaccessible.org/blog/wcag-22-complete-guide-2025)
- [Level Access - WCAG 2.2 Checklist 2026](https://www.levelaccess.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/)
- [UX Movement - Infield Top-Aligned Labels Beat Floating Labels](https://uxmovement.com/forms/infield-top-aligned-labels-floating-labels/)
- [UserWay - Floating vs Static Labels](https://userway.org/blog/floating-vs-static-labels/)
- [NN/g - Placeholders in Form Fields Are Harmful](https://www.nngroup.com/articles/form-design-placeholders/)
- [Shopify Help - Logging In](https://help.shopify.com/en/manual/your-account/logging-in)
- [Shopify Help - Social Sign-In](https://help.shopify.com/en/manual/customers/customer-accounts/social-sign-in)
- [Wix Help - Customizing Signup and Login Forms](https://support.wix.com/en/article/studio-editor-customizing-the-signup-and-login-forms)
- [Squarespace Help - Logging In](https://support.squarespace.com/hc/en-us/articles/360001799628-Changing-how-you-log-into-Squarespace)
- [Tiendanube Help - Login](https://ayuda.tiendanube.com/es_MX/mi-cuenta/como-ingresar-a-mi-tiendanube-y-a-mi-administrador)
- [BigCommerce - Passwordless Customer Login](https://developer.bigcommerce.com/docs/start/authentication/passwordless)
- [Webflow Help - User Pages](https://help.webflow.com/hc/en-us/articles/33961392822803-User-pages-overview)
- [Descope - SaaS Authentication](https://www.descope.com/blog/post/saas-auth)
- [SaaSFrame - 60 SaaS Login UI Examples](https://www.saasframe.io/categories/login)
- [Scope Design - Website Font Size Guide 2025](https://scopedesign.com/website-font-size-guide-2025-ux-typography-best-practices/)
- [Design Studio UX - SaaS UX Design Guide 2026](https://www.designstudiouiux.com/blog/saas-ux-design-the-ultimate-guide/)
- [Onething Design - B2B SaaS UX Design 2026](https://www.onething.design/post/b2b-saas-ux-design)
- [UX Planet - Common Login Problems and Solutions](https://uxplanet.org/most-common-log-in-problems-and-solutions-163a6209c0eb)
- [Learn UI - 15 Tips for Better Signup/Login UX](https://www.learnui.design/blog/tips-signup-login-ux.html)
