# Software Design Document (SDD)

## NERBIS — Plataforma SaaS Multi-Tenant

**Versión:** 0.1.0
**Fecha:** 2026-03-13
**Estado:** Pre-release

---

## 1. Visión General

### 1.1 Propósito

NERBIS es una plataforma SaaS multi-tenant y multi-industria que permite a negocios de cualquier sector crear y gestionar su presencia digital completa: sitio web, tienda online, sistema de reservas, servicios por suscripción y herramientas de marketing — todo desde una sola plataforma.

### 1.2 Audiencia objetivo

- Salones de belleza, spas, barberías
- Gimnasios, estudios de yoga y fitness
- Clínicas, dentistas, psicólogos
- Restaurantes, cafés, panaderías
- Tiendas retail, boutiques de moda
- Academias y educación
- Servicios profesionales (legal, contabilidad, consultoría)
- Inmobiliarias, automotriz, fotografía, eventos, veterinarias y más (25+ industrias)

### 1.3 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Django 5 + Django REST Framework |
| Frontend | Next.js 16 + React 19 + TypeScript 5 |
| Estilos | TailwindCSS 4 + Radix UI (Shadcn/ui) |
| Base de datos | PostgreSQL 15 (SQLite en desarrollo) |
| Cache | Redis 7 (LocMemCache en desarrollo) |
| Autenticación | JWT (SimpleJWT) |
| Pagos | Stripe |
| IA | Anthropic Claude (generación de contenido) |
| Imágenes | Unsplash API |
| Notificaciones | Twilio (SMS/WhatsApp) |
| Tareas asíncronas | Celery + Redis |
| CI/CD | GitHub Actions |
| Code review | CodeRabbit |
| Versionamiento | Release Please (semver) |

---

## 2. Arquitectura del Sistema

### 2.1 Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTES                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Browser  │  │ Mobile   │  │ slug.nerbis.com      │  │
│  │ (Next.js)│  │ (futuro) │  │ (sitio publicado)    │  │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘  │
└───────┼──────────────┼──────────────────┼───────────────┘
        │              │                  │
        ▼              ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                    API GATEWAY                          │
│            Django REST Framework                        │
│     ┌─────────────────────────────────────┐             │
│     │  Middleware Stack                   │             │
│     │  1. CORS                            │             │
│     │  2. Tenant Detection                │             │
│     │  3. JWT Authentication              │             │
│     │  4. Subscription Validation         │             │
│     └─────────────────────────────────────┘             │
└────────────┬────────────────────────┬───────────────────┘
             │                        │
     ┌───────▼───────┐       ┌───────▼───────┐
     │  PostgreSQL   │       │    Redis      │
     │  (datos)      │       │  (cache +     │
     │               │       │   Celery)     │
     └───────────────┘       └───────────────┘
```

### 2.2 Patrón multi-tenancy

**Estrategia:** Tenant-per-request con base de datos compartida.

Todos los tenants comparten la misma base de datos. El aislamiento se logra mediante:

1. **Middleware de detección:** Identifica el tenant por header `X-Tenant-Slug` o subdominio
2. **TenantAwareModel:** Modelo base con FK a Tenant + timestamps
3. **TenantAwareManager:** Manager que auto-filtra queries por tenant activo
4. **Thread-local storage:** Almacena el tenant del request actual

```
Prioridad de detección:
1. Header X-Tenant-Slug (API requests)
2. Subdomain (web: mi-negocio.nerbis.com)
```

### 2.3 Estructura del monorepo

```
nerbis-platform/
├── backend/                    # Django 5 + DRF
│   ├── config/                 # Settings, URLs, WSGI/ASGI
│   ├── core/                   # Usuarios, tenants, auth, middleware
│   ├── billing/                # Suscripciones, facturación, módulos
│   ├── ecommerce/              # Productos, categorías, inventario
│   ├── services/               # Servicios, staff, categorías
│   ├── bookings/               # Citas, horarios, disponibilidad
│   ├── cart/                   # Carrito de compras
│   ├── orders/                 # Órdenes, pagos
│   ├── subscriptions/          # Planes marketplace, contratos
│   ├── coupons/                # Cupones de descuento
│   ├── promotions/             # Promociones y bundles
│   ├── reviews/                # Reseñas y calificaciones
│   ├── notifications/          # Email, SMS, WhatsApp, push
│   └── websites/               # Website builder + IA
├── frontend/                   # Next.js 16 + React 19
│   └── src/
│       ├── app/                # App Router (páginas)
│       ├── components/         # Componentes React
│       ├── contexts/           # Estado global (Context API)
│       ├── hooks/              # Custom hooks
│       ├── lib/                # API client, utilidades
│       ├── types/              # Interfaces TypeScript
│       └── styles/             # CSS adicional
├── mobile/                     # (futuro) App móvil
├── docs/                       # Documentación
└── .github/                    # CI/CD, templates
```

---

## 3. Modelo de Datos

### 3.1 Diagrama de relaciones principales

```
Tenant (negocio)
├── 1:1  Subscription
│        ├── M:M  Module (Web, Shop, Bookings, Services, Marketing)
│        ├── 1:N  Invoice
│        └── 1:N  UsageRecord
├── 1:N  User (admin, staff, customer)
├── 1:N  Product → ProductCategory
│        ├── 1:N  ProductImage
│        └── 1:1  Inventory
├── 1:N  Service → ServiceCategory
│        └── M:M  StaffMember
├── 1:N  StaffMember → User (role='staff')
├── 1:N  Appointment (customer, staff, service)
├── 1:N  BusinessHours (por día de semana)
├── 1:N  TimeOff (vacaciones/feriados)
├── 1:N  Cart → CartItem (productos o servicios)
├── 1:N  Order → OrderItem + OrderServiceItem + Payment
├── 1:N  Coupon → CouponUsage
├── 1:N  Promotion → PromotionItem
├── 1:N  Review → ReviewImage + ReviewHelpful
├── 1:N  Notification
├── 1:1  WebsiteConfig → WebsiteTemplate
├── 1:N  MarketplaceCategory → MarketplacePlan → MarketplaceContract
└── 1:N  Banner
```

### 3.2 Modelos principales

#### Tenant (core)
El modelo central. Representa un negocio/empresa registrada en la plataforma.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| name | CharField | Nombre del negocio |
| slug | SlugField | Identificador URL (subdomain) |
| industry | CharField | Industria (25+ opciones) |
| plan | CharField | trial, basic, professional, enterprise |
| has_website | BooleanField | Módulo web activo |
| has_shop | BooleanField | Módulo tienda activo |
| has_bookings | BooleanField | Módulo reservas activo |
| has_services | BooleanField | Módulo servicios activo |
| has_marketing | BooleanField | Módulo marketing activo |
| timezone | CharField | Zona horaria |
| currency | CharField | Moneda (COP, USD, EUR, etc.) |
| language | CharField | Idioma (es, en, ca) |
| country | CharField | País (18 opciones) |
| subscription_end_date | DateField | Fin de suscripción |

#### User (core)
Usuario del sistema. Puede ser admin, staff o customer.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| uid | CharField | Identificador global (tenant_slug:email) |
| email | EmailField | Email (único por tenant) |
| role | CharField | admin, staff, customer |
| tenant | ForeignKey | Negocio al que pertenece |
| is_guest | BooleanField | Cuenta temporal (reservas rápidas) |
| avatar | ImageField | Foto de perfil |
| phone | CharField | Teléfono |

#### Subscription (billing)
Suscripción del tenant a la plataforma.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| tenant | OneToOneField | Tenant asociado |
| billing_period | CharField | monthly, yearly |
| status | CharField | trial, active, past_due, canceled, expired |
| modules | ManyToManyField | Módulos contratados (via SubscriptionModule) |

#### Module (billing)
Módulos disponibles en la plataforma.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| name | CharField | Nombre (Web, Shop, Bookings, etc.) |
| monthly_price | DecimalField | Precio mensual |
| annual_discount_months | IntegerField | Meses gratis en plan anual |
| included_appointments | IntegerField | Citas incluidas |
| included_employees | IntegerField | Empleados incluidos |
| included_products | IntegerField | Productos incluidos |
| included_ai_requests | IntegerField | Peticiones IA incluidas |

#### Product (ecommerce)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| name | CharField | Nombre del producto |
| slug | SlugField | URL slug |
| sku | CharField | Código de inventario |
| category | ForeignKey | Categoría |
| price | DecimalField | Precio de venta |
| compare_at_price | DecimalField | Precio anterior (tachar) |
| cost_price | DecimalField | Precio de costo |
| is_featured | BooleanField | Producto destacado |

#### Service (services)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| name | CharField | Nombre del servicio |
| duration_minutes | IntegerField | Duración en minutos |
| price | DecimalField | Precio |
| requires_deposit | BooleanField | Requiere depósito |
| deposit_amount | DecimalField | Monto del depósito |
| max_advance_booking_days | IntegerField | Días máximo anticipación |
| min_advance_booking_hours | IntegerField | Horas mínimo anticipación |
| assigned_staff | ManyToManyField | Staff asignado |

#### Appointment (bookings)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| customer | ForeignKey | Cliente |
| staff_member | ForeignKey | Staff asignado |
| service | ForeignKey | Servicio |
| start_datetime | DateTimeField | Inicio |
| end_datetime | DateTimeField | Fin (calculado) |
| status | CharField | pending, confirmed, in_progress, completed, cancelled, expired, no_show |
| is_paid | BooleanField | Pagado |

#### Order (orders)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| order_number | CharField | Código único (ORD-YYYYMMDD-UUID) |
| customer | ForeignKey | Cliente |
| subtotal | DecimalField | Subtotal |
| tax_amount | DecimalField | Impuestos |
| total | DecimalField | Total |
| status | CharField | pending, paid, completed, cancelled |
| coupon | ForeignKey | Cupón aplicado |

---

## 4. API — Endpoints

### 4.1 Autenticación (`/api/auth/`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register/` | Registrar usuario (customer) |
| POST | `/auth/login/` | Login y obtener JWT |
| POST | `/auth/logout/` | Revocar tokens |
| POST | `/auth/refresh/` | Refrescar access token |
| GET | `/auth/me/` | Usuario actual |
| GET/PATCH | `/auth/profile/` | Ver/actualizar perfil |
| POST | `/auth/change-password/` | Cambiar contraseña |
| POST | `/auth/forgot-password/` | Solicitar OTP de reset |
| POST | `/auth/verify-reset-otp/` | Verificar OTP y resetear |

### 4.2 Endpoints públicos (`/api/public/`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/public/register-tenant/` | Registrar nuevo negocio |
| GET | `/public/check-business-name/` | Verificar disponibilidad de slug |
| POST | `/public/platform-login/` | Login cross-tenant |

### 4.3 E-commerce (`/api/`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/products/` | Listar productos |
| GET | `/products/{id}/` | Detalle de producto |
| GET | `/categories/` | Listar categorías |

### 4.4 Servicios (`/api/`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/services/` | Listar servicios |
| GET | `/services/{id}/` | Detalle de servicio |
| GET | `/services/categories/` | Categorías de servicios |
| GET | `/staff/` | Listar staff |

### 4.5 Reservas (`/api/bookings/`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/bookings/available-slots/` | Consultar disponibilidad |
| POST | `/bookings/appointments/` | Crear cita |
| GET | `/bookings/appointments/` | Citas del usuario |
| PATCH | `/bookings/appointments/{id}/` | Actualizar/cancelar cita |

### 4.6 Carrito (`/api/cart/`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/cart/` | Obtener carrito |
| POST | `/cart/add/` | Agregar item |
| DELETE | `/cart/items/{id}/` | Eliminar item |
| POST | `/cart/apply-coupon/` | Aplicar cupón |
| POST | `/cart/checkout/` | Proceder al pago |

### 4.7 Órdenes (`/api/orders/`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/orders/` | Historial de órdenes |
| GET | `/orders/{order_number}/` | Detalle de orden |
| POST | `/orders/{order_number}/pay/` | Crear payment intent (Stripe) |

### 4.8 Website Builder (`/api/websites/`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/websites/templates/` | Templates disponibles |
| POST | `/websites/onboarding/start/` | Iniciar onboarding |
| POST | `/websites/generate/` | Generar contenido con IA |
| POST | `/websites/chat/` | Chat interactivo con IA |
| POST | `/websites/publish/` | Publicar sitio web |
| POST | `/websites/suggest-seo/` | Sugerencias SEO con IA |
| POST | `/websites/sections/reorder/` | Reordenar secciones |
| POST | `/websites/sections/add/` | Agregar sección |

---

## 5. Frontend — Arquitectura

### 5.1 Estructura de rutas (App Router)

#### Rutas públicas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing page |
| `/login` | Login |
| `/register` | Registro de cliente |
| `/register-business` | Registro de nuevo negocio |
| `/products` | Catálogo de productos |
| `/products/[id]` | Detalle de producto |
| `/services` | Catálogo de servicios |
| `/services/[id]/book` | Reservar servicio |
| `/cart` | Carrito de compras |
| `/checkout` | Pago (Stripe) |
| `/about`, `/contact`, `/faq` | Páginas informativas |
| `/pricing` | Precios |
| `/plans` | Planes marketplace |

#### Rutas protegidas (Dashboard)

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Panel principal |
| `/dashboard/profile` | Perfil del usuario |
| `/dashboard/setup` | Configuración inicial de módulos |
| `/dashboard/website-builder/editor` | Editor visual del sitio web |
| `/dashboard/products/new` | Crear producto |
| `/dashboard/products/[id]/edit` | Editar producto |
| `/dashboard/orders` | Gestión de órdenes |
| `/dashboard/appointments` | Gestión de citas |
| `/dashboard/staff/appointments` | Vista de staff |

### 5.2 Estado global (Context API)

| Context | Responsabilidad |
|---------|-----------------|
| **AuthContext** | Usuario, tenant, login/logout, tokens JWT |
| **CartContext** | Carrito dual (local + servidor), cupones, sync |
| **TenantContext** | Configuración del tenant, feature flags, tema |
| **WebsiteContentContext** | Contenido del sitio web publicado |

### 5.3 Comunicación con API

**Cliente HTTP:** Axios con interceptors

- **Request interceptor:** Agrega `X-Tenant-Slug` + `Authorization: Bearer`
- **Response interceptor:** Auto-refresh de JWT en 401, cola de requests pendientes
- **13 módulos API:** auth, products, services, bookings, cart, orders, coupons, reviews, banners, websites, user

### 5.4 Componentes UI

**Base:** 24 componentes Shadcn/ui (Radix UI + TailwindCSS)

**Features principales:**
- **Website Builder:** 16 componentes (~500KB) — editor visual, preview en iframe, IA
- **E-commerce:** ProductCard, ProductForm, CheckoutForm (Stripe)
- **Reservas:** AvailabilityCalendar, ServiceCard
- **Reviews:** ReviewForm, ReviewCard, ReviewsList
- **Guards:** ModuleGuard, PageGuard (feature flags)

### 5.5 Theming multi-tenant

Cada tenant puede personalizar colores. El TenantContext aplica CSS variables dinámicamente al DOM antes del render (zero FOUC).

---

## 6. Autenticación y Seguridad

### 6.1 Flujo de autenticación

```
Cliente                    API                      DB
  │                         │                        │
  ├── POST /auth/login/ ───▶│                        │
  │   {email, password}     ├── Validate credentials▶│
  │                         │◀── User + Tenant ──────┤
  │◀── {tokens, user} ─────┤                        │
  │                         │                        │
  ├── GET /api/resource/ ──▶│                        │
  │   Authorization: Bearer │                        │
  │   X-Tenant-Slug: slug   ├── Verify JWT ─────────▶│
  │                         ├── Filter by tenant ───▶│
  │◀── {data} ─────────────┤◀── Filtered data ─────┤
```

### 6.2 JWT Configuration

| Parámetro | Valor |
|-----------|-------|
| Algoritmo | HS256 |
| Access token lifetime | 8 horas |
| Refresh token lifetime | 7 días |
| Token rotation | Habilitado |
| Token blacklist | Habilitado |

### 6.3 Permisos

| Permiso | Descripción |
|---------|-------------|
| `IsTenantUser` | Usuario pertenece al tenant del request |
| `IsTenantAdmin` | Usuario con role='admin' |
| `IsTenantStaffOrAdmin` | Role admin o staff |
| `IsOwnerOrStaff` | Dueño del objeto o staff/admin |

### 6.4 Rate limiting

| Endpoint | Límite |
|----------|--------|
| Login | 5/min por IP |
| Register | 3/min por IP |
| OTP request | 3/min por IP |
| OTP verify | 5/min por IP |
| Password reset | 3/min por IP |

### 6.5 Medidas de seguridad

- CORS configurado (origins específicos en producción)
- CSRF protection con trusted origins
- Cookies HttpOnly para sesión
- Validación de inputs en serializers y modelos
- Password validators (similarity, min length, common, numeric)
- OTP con expiración (10 min) y máximo 3 intentos
- Aislamiento de datos por tenant (TenantAwareManager)

---

## 7. Integraciones de Terceros

### 7.1 Stripe (pagos)

- Payment intents para órdenes
- Webhook handler en `/api/webhooks/stripe/`
- Moneda configurable por tenant
- Impuestos: 21% IVA (configurable)

### 7.2 Anthropic Claude (IA)

- Modelo: claude-3-haiku-20240307
- Generación de contenido para website builder
- Chat interactivo para edición de contenido
- Sugerencias SEO
- Tracking de uso (AIGenerationLog) para facturación
- Pricing: $0.25/1M input tokens, $1.25/1M output tokens

### 7.3 Unsplash (imágenes)

- Búsqueda de imágenes stock para website builder
- Image picker integrado en el editor

### 7.4 Twilio (notificaciones)

- SMS y WhatsApp
- Flag de activación configurable
- Tracking de estado (pending, sent, failed, delivered)

---

## 8. Sistema de Módulos

### 8.1 Módulos disponibles

| Módulo | Funcionalidad |
|--------|---------------|
| **Web** | Website builder con IA, publicación, SEO |
| **Shop** | Productos, inventario, categorías, carrito, órdenes |
| **Bookings** | Citas, staff, horarios, disponibilidad |
| **Services** | Planes marketplace, contratos, suscripciones |
| **Marketing** | Cupones, promociones, reseñas |

### 8.2 Feature flags

Cada tenant tiene flags booleanos (`has_website`, `has_shop`, etc.) que controlan:
- Qué endpoints están disponibles
- Qué secciones del dashboard se muestran
- Qué páginas públicas son accesibles

El frontend usa `ModuleGuard` y `PageGuard` para ocultar funcionalidad no contratada.

---

## 9. Flujos Principales

### 9.1 Registro de negocio

```
1. Usuario visita /register-business
2. Llena formulario: nombre, email, contraseña, industria, país
3. POST /public/register-tenant/
4. Se crea: Tenant + User (role=admin) + Subscription (trial)
5. Redirect a /dashboard/setup
6. Admin selecciona módulos (web, shop, bookings, etc.)
7. POST /configure-modules/
8. Redirect a dashboard principal
```

### 9.2 Creación de sitio web (Website Builder)

```
1. Admin accede a /dashboard/website-builder
2. Selecciona template por industria
3. Completa onboarding (preguntas sobre el negocio)
4. IA genera contenido personalizado
5. Editor visual: ajusta diseño, contenido, secciones
6. Chat con IA para modificaciones
7. Configura SEO
8. Publica → sitio disponible en slug.nerbis.com
```

### 9.3 Compra de producto

```
1. Cliente navega /products
2. Agrega productos al carrito (local si anónimo, servidor si autenticado)
3. Aplica cupón (opcional)
4. Procede a checkout
5. Paga con Stripe
6. Se crea Order + Payment
7. Se actualiza inventario
8. Se envía notificación
```

### 9.4 Reserva de cita

```
1. Cliente navega /services
2. Selecciona servicio
3. Elige staff y fecha
4. Sistema muestra slots disponibles (verifica BusinessHours + TimeOff + Appointments)
5. Confirma cita
6. Se crea Appointment + CartItem (si requiere pago)
7. Staff recibe notificación
```

---

## 10. Infraestructura y DevOps

### 10.1 CI/CD (GitHub Actions)

| Workflow | Trigger | Acciones |
|----------|---------|----------|
| CI Backend | PR a main/develop (cambios en backend/) | Ruff lint + format check + Pytest |
| CI Frontend | PR a main/develop (cambios en frontend/) | ESLint + Next.js build |
| Release Please | Push a main | Bump versión + CHANGELOG + GitHub Release |

### 10.2 Branching strategy

```
feature/* ──PR──▶ develop ──PR──▶ main (producción)
fix/*     ──PR──▶ develop ──PR──▶ main
```

- **main:** Código en producción, protegida
- **develop:** Integración, protegida
- **feature/*:** Trabajo individual

### 10.3 Code quality

| Herramienta | Propósito |
|-------------|-----------|
| Ruff | Linting + formatting Python |
| ESLint | Linting TypeScript/React |
| commitlint | Conventional commits obligatorios |
| husky | Git hooks (pre-commit, commit-msg) |
| CodeRabbit | Code review automático con IA |

### 10.4 Variables de entorno

```
# Django
SECRET_KEY, DEBUG, ALLOWED_HOSTS
DATABASE_URL, REDIS_URL

# Auth
PLATFORM_BASE_DOMAIN

# Pagos
STRIPE_PUBLIC_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

# IA
ANTHROPIC_API_KEY, ANTHROPIC_MODEL

# Imágenes
UNSPLASH_ACCESS_KEY

# Notificaciones
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM, TWILIO_SMS_FROM

# Email
EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD

# Frontend
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

---

## 11. Localización

### 11.1 Idiomas soportados

- Español (es) — principal
- English (en)
- Català (ca)

### 11.2 Monedas soportadas

COP, USD, EUR, MXN, ARS, CLP, PEN, BRL, BOB, UYU

### 11.3 Zonas horarias

18+ zonas horarias cubriendo América Latina y Europa.

### 11.4 Países soportados

Colombia, México, Argentina, Chile, Perú, Ecuador, Venezuela, Bolivia, Uruguay, Paraguay, Costa Rica, Panamá, Rep. Dominicana, Guatemala, Honduras, El Salvador, España, Estados Unidos.

---

## 12. Decisiones de Diseño (ADRs)

### ADR-001: Base de datos compartida para multi-tenancy

**Decisión:** Todos los tenants comparten una base de datos con aislamiento por FK.

**Razón:** Simplicidad operacional. No se necesitan schemas separados ni bases de datos por tenant en esta etapa. El TenantAwareManager garantiza aislamiento a nivel de query.

**Trade-off:** Menor aislamiento vs simplicidad. Suficiente para el volumen actual.

### ADR-002: JWT sobre sesiones

**Decisión:** JWT con access + refresh tokens.

**Razón:** Permite autenticación stateless, compatible con múltiples clientes (web, móvil futuro), y facilita el patrón cross-tenant login.

### ADR-003: Context API sobre Redux/Zustand

**Decisión:** React Context API para estado global.

**Razón:** Suficiente para la complejidad actual. 4 contextos bien definidos (Auth, Cart, Tenant, WebsiteContent) con separación clara de responsabilidades.

### ADR-004: Carrito dual (local + servidor)

**Decisión:** Usuarios anónimos usan localStorage, autenticados usan API. Sync automático al login.

**Razón:** Permite agregar productos sin registrarse, mejorando conversión. La sincronización automática evita pérdida de items.

### ADR-005: Website builder con IA generativa

**Decisión:** Integrar Anthropic Claude para generación de contenido web.

**Razón:** Diferenciador de producto. Reduce la barrera de entrada para negocios que no saben crear contenido web. El tracking de uso permite facturación por consumo.

### ADR-006: Feature flags por módulo

**Decisión:** Cada tenant tiene flags booleanos para cada módulo.

**Razón:** Permite pricing flexible y activación/desactivación granular de funcionalidades sin desplegar código diferente.

---

## 13. Rendimiento

### 13.1 Backend

- **Paginación:** 20 items por página (configurable)
- **Indexing:** Compound indexes en (tenant, created_at), (tenant, status), (tenant, slug)
- **Cache:** Redis en producción, LocMemCache en desarrollo
- **Async:** Celery para notificaciones, checks de suscripción, generación IA

### 13.2 Frontend

- **Code splitting:** Automático por ruta (Next.js) + dynamic imports para componentes pesados
- **Image optimization:** Next.js Image component con lazy loading y WebP
- **Server state:** TanStack Query con stale time de 1 minuto
- **Zero FOUC:** Tema aplicado antes del render via CSS variables
- **Context splitting:** 4 contextos separados para evitar re-renders innecesarios

---

## 14. Roadmap Técnico

### Fase actual (v0.1.0 - Pre-release)
- [x] Multi-tenancy con aislamiento por FK
- [x] Autenticación JWT cross-tenant
- [x] E-commerce (productos, carrito, órdenes, Stripe)
- [x] Reservas (citas, staff, disponibilidad)
- [x] Website builder con IA
- [x] Sistema de módulos y suscripciones
- [x] CI/CD (GitHub Actions, CodeRabbit, Release Please)

### Próximas fases
- [ ] App móvil (React Native / Flutter)
- [ ] Dashboard analytics avanzado
- [ ] Email marketing integrado
- [ ] Multi-idioma en contenido generado
- [ ] Preview deployments por PR
- [ ] Monitoring (Sentry, logging estructurado)
- [ ] Tests E2E (Playwright/Cypress)
- [ ] Documentación API (Swagger/OpenAPI)
