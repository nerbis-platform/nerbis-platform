# Plan de Pruebas QA - NERBISFY API

**Versión:** 1.0
**Fecha:** 2025-12-29
**Proyecto:** Ecosistema Digital Multi-Tenant para Centros de Estética

---

## Tabla de Contenidos

1. [Configuración del Entorno](#1-configuración-del-entorno)
2. [Módulo Core - Autenticación](#2-módulo-core---autenticación)
3. [Módulo Services - Servicios y Staff](#3-módulo-services---servicios-y-staff)
4. [Módulo Bookings - Citas y Reservas](#4-módulo-bookings---citas-y-reservas)
5. [Módulo Ecommerce - Productos](#5-módulo-ecommerce---productos)
6. [Pruebas de Seguridad Multi-Tenant](#6-pruebas-de-seguridad-multi-tenant)
7. [Casos de Error](#7-casos-de-error)

---

## 1. Configuración del Entorno

### 1.1 Datos de Prueba

**Base URL:** `http://localhost:8000`

**Tenants Disponibles:**
| Slug | Nombre |
|------|--------|
| `gc-belleza` | GC Belleza y Estética |
| `centro-lux` | Centro de Estética Lux |

**Headers Requeridos (todas las peticiones):**
```
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Headers para endpoints autenticados:**
```
Content-Type: application/json
X-Tenant-ID: gc-belleza
Authorization: Bearer {access_token}
```

### 1.2 Usuario de Prueba Admin

```
UID (para Django Admin): gc-belleza:felipe@example.com
Email: felipe@example.com
Password: MiPassword123!
Tenant: gc-belleza
Role: admin
```

---

## 2. Módulo Core - Autenticación

### TC-AUTH-001: Registro de Usuario

**Endpoint:** `POST /api/core/auth/register/`
**Permisos:** Público
**Prioridad:** Alta

**Request:**
```json
{
    "username": "nuevo_usuario",
    "email": "nuevo@example.com",
    "password": "TestPassword123!",
    "password2": "TestPassword123!",
    "first_name": "Juan",
    "last_name": "Pérez",
    "phone": "+34600111222",
    "tenant_slug": "gc-belleza"
}
```

**Resultado Esperado:** 201 Created
```json
{
    "user": {
        "id": 1,
        "username": "nuevo_usuario",
        "email": "nuevo@example.com",
        "role": "customer",
        "tenant_name": "GC Belleza y Estética"
    },
    "tokens": {
        "refresh": "...",
        "access": "..."
    },
    "message": "Usuario creado exitosamente"
}
```

**Validaciones a probar:**
- [ ] Contraseñas no coinciden → Error 400
- [ ] Email duplicado en mismo tenant → Error 400
- [ ] Tenant inválido/inactivo → Error 400
- [ ] Password muy corto (<8 chars) → Error 400
- [ ] Password muy común → Error 400

---

### TC-AUTH-002: Login de Usuario

**Endpoint:** `POST /api/core/auth/login/`
**Permisos:** Público
**Prioridad:** Alta

**Request:**
```json
{
    "email": "felipe@example.com",
    "password": "MiPassword123!",
    "tenant_slug": "gc-belleza"
}
```

**Resultado Esperado:** 200 OK
```json
{
    "user": {
        "id": 17,
        "email": "felipe@example.com",
        "role": "admin"
    },
    "tokens": {
        "refresh": "...",
        "access": "..."
    }
}
```

**Validaciones a probar:**
- [ ] Credenciales incorrectas → Error 401
- [ ] Usuario en otro tenant → Error 401
- [ ] Usuario inactivo → Error 401
- [ ] Tenant incorrecto → Error 401

---

### TC-AUTH-003: Logout

**Endpoint:** `POST /api/core/auth/logout/`
**Permisos:** Autenticado
**Prioridad:** Media

**Headers:** Authorization: Bearer {access_token}

**Request:**
```json
{
    "refresh": "{refresh_token}"
}
```

**Resultado Esperado:** 200 OK
```json
{
    "message": "Logout exitoso"
}
```

**Validaciones:**
- [ ] Token inválido → Error 400
- [ ] Sin token de autorización → Error 401

---

### TC-AUTH-004: Refrescar Token

**Endpoint:** `POST /api/core/auth/refresh/`
**Permisos:** Público
**Prioridad:** Alta

**Request:**
```json
{
    "refresh": "{refresh_token}"
}
```

**Resultado Esperado:** 200 OK
```json
{
    "access": "nuevo_access_token"
}
```

**Validaciones:**
- [ ] Refresh token expirado → Error 401
- [ ] Refresh token inválido → Error 401
- [ ] Refresh token ya usado (blacklisted) → Error 401

---

### TC-AUTH-005: Obtener Usuario Actual

**Endpoint:** `GET /api/core/auth/me/`
**Permisos:** Autenticado
**Prioridad:** Alta

**Headers:** Authorization: Bearer {access_token}

**Resultado Esperado:** 200 OK
```json
{
    "user": {
        "id": 17,
        "username": "felipe",
        "email": "felipe@example.com",
        "first_name": "Felipe",
        "last_name": "Garcia",
        "full_name": "Felipe Garcia",
        "phone": "+34612345678",
        "role": "admin",
        "role_display": "Administrador",
        "tenant_name": "GC Belleza y Estética"
    },
    "tenant": {
        "id": "uuid",
        "name": "GC Belleza y Estética",
        "slug": "gc-belleza"
    }
}
```

---

### TC-AUTH-006: Establecer Contraseña (Guest Users)

**Endpoint:** `GET /api/core/auth/set-password/?token={token}`
**Permisos:** Público
**Prioridad:** Media

**Paso 1 - Verificar Token (GET):**
```
GET /api/core/auth/set-password/?token=abc123xyz
```

**Resultado Esperado:** 200 OK
```json
{
    "valid": true,
    "email": "guest@example.com",
    "first_name": "María"
}
```

**Paso 2 - Establecer Contraseña (POST):**
```json
{
    "token": "abc123xyz",
    "password": "NuevaPassword123!",
    "password2": "NuevaPassword123!"
}
```

**Resultado Esperado:** 200 OK
```json
{
    "message": "Contraseña establecida exitosamente",
    "user": {...},
    "tokens": {
        "refresh": "...",
        "access": "..."
    }
}
```

**Validaciones:**
- [ ] Token inválido → Error 400
- [ ] Token expirado (>24h) → Error 400
- [ ] Token ya usado → Error 400
- [ ] Contraseñas no coinciden → Error 400

---

### TC-AUTH-007: Información del Tenant

**Endpoint:** `GET /api/core/tenant-info/`
**Permisos:** Público (requiere X-Tenant-ID)
**Prioridad:** Baja

**Resultado Esperado:** 200 OK
```json
{
    "tenant": {
        "id": "uuid",
        "name": "GC Belleza y Estética",
        "slug": "gc-belleza",
        "primary_color": "#3B82F6"
    },
    "users_count": 10
}
```

---

## 3. Módulo Services - Servicios y Staff

### TC-SVC-001: Listar Categorías de Servicios

**Endpoint:** `GET /api/services/categories/`
**Permisos:** Público
**Prioridad:** Alta

**Resultado Esperado:** 200 OK
```json
{
    "count": 5,
    "results": [
        {
            "id": 1,
            "name": "Faciales",
            "description": "Tratamientos faciales",
            "icon": "face-icon",
            "is_active": true
        }
    ]
}
```

**Filtros disponibles:**
- `?is_active=true`
- `?search=facial`
- `?ordering=name`

---

### TC-SVC-002: Crear Categoría de Servicio

**Endpoint:** `POST /api/services/categories/`
**Permisos:** Staff/Admin
**Prioridad:** Media

**Request:**
```json
{
    "name": "Nueva Categoría",
    "description": "Descripción de prueba",
    "order": 10
}
```

**Resultado Esperado:** 201 Created

**Validaciones:**
- [ ] Sin autenticación → Error 401
- [ ] Usuario customer → Error 403
- [ ] Nombre duplicado → Error 400

---

### TC-SVC-003: Listar Servicios

**Endpoint:** `GET /api/services/list/`
**Permisos:** Público
**Prioridad:** Alta

**Resultado Esperado:** 200 OK
```json
{
    "count": 10,
    "results": [
        {
            "id": 1,
            "name": "Limpieza Facial Profunda",
            "short_description": "Limpieza completa",
            "price": "45.00",
            "duration_minutes": 60,
            "category": {
                "id": 1,
                "name": "Faciales"
            },
            "is_featured": true
        }
    ]
}
```

**Filtros disponibles:**
- `?category=1`
- `?is_featured=true`
- `?min_price=20&max_price=100`
- `?min_duration=30&max_duration=90`
- `?search=facial`

---

### TC-SVC-004: Detalle de Servicio

**Endpoint:** `GET /api/services/list/{id}/`
**Permisos:** Público
**Prioridad:** Alta

**Resultado Esperado:** 200 OK
```json
{
    "id": 1,
    "name": "Limpieza Facial Profunda",
    "description": "Descripción completa...",
    "price": "45.00",
    "duration_minutes": 60,
    "category": {...},
    "assigned_staff": [
        {
            "id": 1,
            "name": "Ana García",
            "position": "Esteticista"
        }
    ],
    "min_advance_booking_hours": 2,
    "max_advance_booking_days": 30
}
```

---

### TC-SVC-005: Servicios Destacados

**Endpoint:** `GET /api/services/list/featured/`
**Permisos:** Público
**Prioridad:** Media

**Resultado Esperado:** 200 OK (máximo 6 servicios)

---

### TC-SVC-006: Staff de un Servicio

**Endpoint:** `GET /api/services/list/{id}/staff/`
**Permisos:** Público
**Prioridad:** Alta

**Resultado Esperado:** 200 OK
```json
[
    {
        "id": 1,
        "name": "Ana García",
        "position": "Esteticista Senior",
        "avatar": null,
        "is_featured": true
    }
]
```

---

### TC-SVC-007: Listar Staff Members

**Endpoint:** `GET /api/services/staff/`
**Permisos:** Público
**Prioridad:** Alta

**Resultado Esperado:** 200 OK

**Filtros disponibles:**
- `?is_available=true`
- `?is_featured=true`
- `?accepts_new_clients=true`

---

### TC-SVC-008: Servicios de un Staff Member

**Endpoint:** `GET /api/services/staff/{id}/services/`
**Permisos:** Público
**Prioridad:** Media

**Resultado Esperado:** 200 OK (lista de servicios)

---

## 4. Módulo Bookings - Citas y Reservas

### TC-BK-001: Consultar Disponibilidad

**Endpoint:** `GET /api/bookings/appointments/availability/`
**Permisos:** Público
**Prioridad:** Alta

**Query Params:**
```
?service_id=1&staff_member_id=1&date=2025-01-02
```

**Resultado Esperado:** 200 OK
```json
{
    "service": {
        "id": 1,
        "name": "Limpieza Facial"
    },
    "staff_member": {
        "id": 1,
        "name": "Ana García"
    },
    "date": "2025-01-02",
    "slots": [
        {
            "start_time": "2025-01-02T09:00:00Z",
            "end_time": "2025-01-02T10:00:00Z",
            "is_available": true
        },
        {
            "start_time": "2025-01-02T10:00:00Z",
            "end_time": "2025-01-02T11:00:00Z",
            "is_available": false
        }
    ]
}
```

**Validaciones:**
- [ ] Fecha pasada → Error o lista vacía
- [ ] Servicio inexistente → Error 400
- [ ] Staff no puede dar el servicio → Error 400

---

### TC-BK-002: Reservar como Invitado (Guest Booking)

**Endpoint:** `POST /api/bookings/appointments/book-as-guest/`
**Permisos:** Público
**Prioridad:** Alta

**Request:**
```json
{
    "service_id": 1,
    "staff_member_id": 1,
    "start_datetime": "2025-01-02T10:00:00Z",
    "notes": "Primera visita",
    "email": "cliente_nuevo@example.com",
    "first_name": "María",
    "last_name": "López",
    "phone": "+34611222333"
}
```

**Resultado Esperado:** 201 Created
```json
{
    "message": "¡Cita creada exitosamente! Se ha creado una cuenta para ti.",
    "appointment": {
        "id": 1,
        "status": "pending",
        "start_datetime": "2025-01-02T10:00:00Z",
        "end_datetime": "2025-01-02T11:00:00Z",
        "service": {...},
        "staff_member": {...}
    },
    "user": {
        "id": 18,
        "email": "cliente_nuevo@example.com",
        "is_guest": true
    },
    "tokens": {
        "access": "...",
        "refresh": "..."
    },
    "next_steps": [...]
}
```

**Validaciones:**
- [ ] Email ya existe en tenant → Error 400 "Ya existe una cuenta con este email"
- [ ] Slot no disponible → Error 400
- [ ] Servicio inactivo → Error 400
- [ ] Staff no disponible → Error 400
- [ ] Staff no puede dar el servicio → Error 400
- [ ] Anticipación mínima no cumplida → Error 400
- [ ] Anticipación máxima excedida → Error 400

---

### TC-BK-003: Crear Cita (Usuario Autenticado)

**Endpoint:** `POST /api/bookings/appointments/`
**Permisos:** Autenticado
**Prioridad:** Alta

**Request:**
```json
{
    "service_id": 1,
    "staff_member_id": 1,
    "start_datetime": "2025-01-02T14:00:00Z",
    "notes": "Tengo piel sensible"
}
```

**Resultado Esperado:** 201 Created

---

### TC-BK-004: Listar Mis Citas

**Endpoint:** `GET /api/bookings/appointments/my-appointments/`
**Permisos:** Autenticado
**Prioridad:** Alta

**Resultado Esperado:** 200 OK
```json
{
    "count": 5,
    "results": [
        {
            "id": 1,
            "status": "confirmed",
            "start_datetime": "...",
            "service": {...},
            "staff_member": {...}
        }
    ]
}
```

---

### TC-BK-005: Citas Próximas

**Endpoint:** `GET /api/bookings/appointments/upcoming/`
**Permisos:** Autenticado
**Prioridad:** Media

**Resultado Esperado:** 200 OK (solo citas futuras ordenadas por fecha)

---

### TC-BK-006: Detalle de Cita

**Endpoint:** `GET /api/bookings/appointments/{id}/`
**Permisos:** Owner o Staff
**Prioridad:** Alta

**Validaciones:**
- [ ] Usuario customer intenta ver cita de otro → Error 403
- [ ] Staff puede ver cualquier cita del tenant → 200 OK

---

### TC-BK-007: Cancelar Cita

**Endpoint:** `POST /api/bookings/appointments/{id}/cancel/`
**Permisos:** Owner o Staff
**Prioridad:** Alta

**Resultado Esperado:** 200 OK
```json
{
    "message": "Cita cancelada exitosamente",
    "appointment": {
        "status": "cancelled"
    }
}
```

**Validaciones:**
- [ ] Cita ya cancelada → Error 400
- [ ] Cita completada → Error 400

---

### TC-BK-008: Horarios de Negocio

**Endpoint:** `GET /api/bookings/business-hours/`
**Permisos:** Público
**Prioridad:** Media

**Resultado Esperado:** 200 OK
```json
{
    "results": [
        {
            "id": 1,
            "day_of_week": 0,
            "day_name": "Lunes",
            "open_time": "09:00:00",
            "close_time": "19:00:00",
            "is_closed": false
        }
    ]
}
```

---

### TC-BK-009: Crear Horario de Negocio

**Endpoint:** `POST /api/bookings/business-hours/`
**Permisos:** Staff/Admin
**Prioridad:** Media

**Request:**
```json
{
    "day_of_week": 6,
    "open_time": "10:00:00",
    "close_time": "14:00:00",
    "is_closed": false
}
```

---

### TC-BK-010: Gestión de Time Off

**Endpoint:** `GET/POST /api/bookings/time-off/`
**Permisos:** Staff/Admin
**Prioridad:** Baja

**Request para crear:**
```json
{
    "staff_member": 1,
    "start_datetime": "2025-01-15T00:00:00Z",
    "end_datetime": "2025-01-16T23:59:59Z",
    "reason": "Vacaciones"
}
```

---

## 5. Módulo Ecommerce - Productos

### TC-EC-001: Listar Categorías de Productos

**Endpoint:** `GET /api/categories/`
**Permisos:** Público
**Prioridad:** Alta

**Filtros:**
- `?is_active=true`
- `?parent=null` (categorías raíz)
- `?search=cremas`

---

### TC-EC-002: Listar Productos

**Endpoint:** `GET /api/products/`
**Permisos:** Público
**Prioridad:** Alta

**Resultado Esperado:** 200 OK
```json
{
    "count": 20,
    "results": [
        {
            "id": 1,
            "name": "Crema Hidratante",
            "price": "35.00",
            "compare_at_price": "45.00",
            "category": {...},
            "in_stock": true,
            "is_featured": true
        }
    ]
}
```

**Filtros:**
- `?category=1`
- `?brand=LOreal`
- `?is_featured=true`
- `?in_stock=true`
- `?min_price=10&max_price=50`
- `?search=crema`

---

### TC-EC-003: Detalle de Producto

**Endpoint:** `GET /api/products/{id}/`
**Permisos:** Público
**Prioridad:** Alta

**Resultado Esperado:** 200 OK (incluye inventory, images, descripción completa)

---

### TC-EC-004: Productos Destacados

**Endpoint:** `GET /api/products/featured/`
**Permisos:** Público
**Prioridad:** Media

**Resultado Esperado:** 200 OK (máximo 8 productos)

---

### TC-EC-005: Actualizar Stock

**Endpoint:** `PATCH /api/products/{id}/update_stock/`
**Permisos:** Staff/Admin
**Prioridad:** Media

**Request - Aumentar:**
```json
{
    "action": "increase",
    "quantity": 10
}
```

**Request - Reducir:**
```json
{
    "action": "decrease",
    "quantity": 5
}
```

**Validaciones:**
- [ ] Cantidad negativa → Error 400
- [ ] Reducir más de lo disponible → Error 400
- [ ] Acción inválida → Error 400
- [ ] Usuario customer → Error 403

---

### TC-EC-006: Crear Producto

**Endpoint:** `POST /api/products/`
**Permisos:** Staff/Admin
**Prioridad:** Media

**Request:**
```json
{
    "name": "Nuevo Producto",
    "description": "Descripción del producto",
    "price": "25.00",
    "category": 1,
    "sku": "PROD-001",
    "brand": "MarcaX"
}
```

---

## 6. Pruebas de Seguridad Multi-Tenant

### TC-SEC-001: Aislamiento de Datos entre Tenants

**Prioridad:** Crítica

**Pasos:**
1. Login en tenant `gc-belleza`
2. Obtener lista de citas/productos/servicios
3. Cambiar header a `X-Tenant-ID: centro-lux`
4. Intentar acceder a los mismos recursos

**Resultado Esperado:** No debe poder ver datos del otro tenant

---

### TC-SEC-002: Acceso Sin Header X-Tenant-ID

**Prioridad:** Crítica

**Pasos:**
1. Hacer request sin header X-Tenant-ID

**Resultado Esperado:** Error 400
```json
{
    "error": "Tenant no encontrado",
    "detail": "No se pudo identificar el tenant.",
    "code": "TENANT_NOT_FOUND"
}
```

---

### TC-SEC-003: Tenant Inválido

**Prioridad:** Alta

**Pasos:**
1. Hacer request con `X-Tenant-ID: tenant-inexistente`

**Resultado Esperado:** Error 400/404 indicando tenant no encontrado

---

### TC-SEC-004: Token de Otro Tenant

**Prioridad:** Crítica

**Pasos:**
1. Login en `gc-belleza`, obtener token
2. Usar ese token con header `X-Tenant-ID: centro-lux`

**Resultado Esperado:** Error de autorización (el tenant_id en el token no coincide)

---

### TC-SEC-005: Escalación de Privilegios

**Prioridad:** Crítica

**Pasos:**
1. Login como customer
2. Intentar crear categoría/servicio/producto
3. Intentar actualizar stock
4. Intentar ver citas de otros usuarios

**Resultado Esperado:** Error 403 Forbidden en todos los casos

---

## 7. Casos de Error

### TC-ERR-001: Request sin Content-Type

**Request:** POST sin header Content-Type
**Esperado:** Error 415 Unsupported Media Type

---

### TC-ERR-002: JSON Malformado

**Request:** `{"name": "test",}` (coma extra)
**Esperado:** Error 400 Bad Request

---

### TC-ERR-003: Token Expirado

**Request:** Usar access token después de 1 hora
**Esperado:** Error 401 Unauthorized con mensaje de token expirado

---

### TC-ERR-004: Recurso No Encontrado

**Request:** GET /api/products/99999/
**Esperado:** Error 404 Not Found

---

### TC-ERR-005: Método No Permitido

**Request:** DELETE /api/core/auth/login/
**Esperado:** Error 405 Method Not Allowed

---

## Checklist de Ejecución

### Pre-requisitos
- [ ] Servidor corriendo en localhost:8000
- [ ] Base de datos con datos de prueba
- [ ] Al menos 2 tenants activos
- [ ] Servicios, staff y productos creados

### Resumen de Ejecución

| Módulo | Total Tests | Pasados | Fallidos | Bloqueados |
|--------|-------------|---------|----------|------------|
| Auth | 7 | | | |
| Services | 8 | | | |
| Bookings | 10 | | | |
| Ecommerce | 6 | | | |
| Seguridad | 5 | | | |
| Errores | 5 | | | |
| **TOTAL** | **41** | | | |

---

## Notas Adicionales

### Documentación API
- Swagger UI: `http://localhost:8000/api/docs/`
- OpenAPI Schema: `http://localhost:8000/api/schema/`

### Admin Django
- URL: `http://localhost:8000/admin/`
- Usuario: `gc-belleza:felipe@example.com`
- Password: `MiPassword123!`

### Variables de Entorno Requeridas
```env
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
SECRET_KEY=tu-secret-key
```

---

*Documento generado automáticamente - NERBISFY v1.0*