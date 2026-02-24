# Suite de Pruebas QA - Autenticación y Registro

**Versión:** 1.0
**Fecha:** 2025-12-29
**Módulo:** Core - Autenticación Multi-Tenant

---

## Configuración Inicial

### Base URL
```
http://localhost:8000
```

### Tenants de Prueba

| Slug | Nombre | Estado |
|------|--------|--------|
| `gc-belleza` | GC Belleza y Estética | Activo |
| `centro-lux` | Centro de Estética Lux | Activo |

### Roles Disponibles

| Rol | Código | Permisos |
|-----|--------|----------|
| Administrador | `admin` | Acceso total al tenant |
| Empleado | `staff` | Gestionar citas, servicios, productos |
| Cliente | `customer` | Ver servicios, crear citas propias |

### Headers Base (TODAS las peticiones)

```http
Content-Type: application/json
X-Tenant-ID: {tenant_slug}
```

---

## PARTE 1: REGISTRO DE USUARIOS

### Endpoint
```
POST /api/core/auth/register/
```

### Permisos
- Público (no requiere autenticación)
- Requiere header `X-Tenant-ID`

---

### TEST REG-001: Registro Exitoso - Tenant GC Belleza

**Descripción:** Registro de nuevo usuario en el tenant principal

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "username": "usuario_gc_001",
    "email": "usuario001@gcbelleza.com",
    "password": "TestPassword123!",
    "password2": "TestPassword123!",
    "first_name": "Carlos",
    "last_name": "Martínez",
    "phone": "+34600100001",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `201 Created`
```json
{
    "user": {
        "id": "<number>",
        "username": "usuario_gc_001",
        "email": "usuario001@gcbelleza.com",
        "first_name": "Carlos",
        "last_name": "Martínez",
        "full_name": "Carlos Martínez",
        "phone": "+34600100001",
        "avatar": null,
        "tenant": "<uuid>",
        "tenant_name": "GC Belleza y Estética",
        "role": "customer",
        "role_display": "Cliente",
        "is_active": true,
        "date_joined": "<datetime>"
    },
    "tokens": {
        "refresh": "<jwt_token>",
        "access": "<jwt_token>"
    },
    "message": "Usuario creado exitosamente"
}
```

**Validaciones:**
- [ ] Status code es 201
- [ ] `user.role` es "customer" (rol por defecto)
- [ ] `user.tenant_name` es "GC Belleza y Estética"
- [ ] Se reciben tokens JWT válidos
- [ ] El email se guarda en minúsculas

---

### TEST REG-002: Registro Exitoso - Tenant Centro Lux

**Descripción:** Registro de nuevo usuario en tenant secundario

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: centro-lux
```

**Request Body:**
```json
{
    "username": "usuario_lux_001",
    "email": "usuario001@centrolux.com",
    "password": "TestPassword123!",
    "password2": "TestPassword123!",
    "first_name": "Ana",
    "last_name": "López",
    "phone": "+34600200001",
    "tenant_slug": "centro-lux"
}
```

**Response Esperado:** `201 Created`

**Validaciones:**
- [ ] Status code es 201
- [ ] `user.tenant_name` es "Centro de Estética Lux"
- [ ] Usuario pertenece al tenant correcto

---

### TEST REG-003: Mismo Email en Diferentes Tenants (Permitido)

**Descripción:** El mismo email puede existir en múltiples tenants

**Paso 1 - Registrar en gc-belleza:**

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "username": "maria_multi",
    "email": "maria.compartido@test.com",
    "password": "TestPassword123!",
    "password2": "TestPassword123!",
    "first_name": "María",
    "last_name": "García",
    "phone": "+34600300001",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `201 Created`

**Paso 2 - Registrar MISMO email en centro-lux:**

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: centro-lux
```

**Request Body:**
```json
{
    "username": "maria_multi_lux",
    "email": "maria.compartido@test.com",
    "password": "OtraPassword456!",
    "password2": "OtraPassword456!",
    "first_name": "María",
    "last_name": "García Lux",
    "phone": "+34600300002",
    "tenant_slug": "centro-lux"
}
```

**Response Esperado:** `201 Created`

**Validaciones:**
- [ ] Ambos registros son exitosos (201)
- [ ] Son usuarios diferentes (IDs distintos)
- [ ] Cada uno pertenece a su tenant correspondiente
- [ ] Pueden tener contraseñas diferentes

---

### TEST REG-004: Email Duplicado en Mismo Tenant (Error)

**Descripción:** No puede existir el mismo email dos veces en el mismo tenant

**Pre-requisito:** Usuario `usuario001@gcbelleza.com` ya existe en gc-belleza

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "username": "otro_username",
    "email": "usuario001@gcbelleza.com",
    "password": "TestPassword123!",
    "password2": "TestPassword123!",
    "first_name": "Otro",
    "last_name": "Usuario",
    "phone": "+34600400001",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `400 Bad Request`
```json
{
    "email": ["Ya existe un usuario con este email en este centro. Por favor inicia sesión."]
}
```

**Validaciones:**
- [ ] Status code es 400
- [ ] Mensaje de error indica email duplicado y sugiere iniciar sesión

---

### TEST REG-005: Username Duplicado en Mismo Tenant (Error)

**Descripción:** No puede existir el mismo username dos veces en el mismo tenant

**Pre-requisito:** Usuario con username `usuario_gc_001` ya existe en gc-belleza

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "username": "usuario_gc_001",
    "email": "email_diferente@test.com",
    "password": "TestPassword123!",
    "password2": "TestPassword123!",
    "first_name": "Diferente",
    "last_name": "Usuario",
    "phone": "+34600500001",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `400 Bad Request`
```json
{
    "username": ["Ya existe un usuario con este nombre de usuario en este centro."]
}
```

---

### TEST REG-006: Contraseñas No Coinciden

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "username": "test_password_mismatch",
    "email": "mismatch@test.com",
    "password": "Password123!",
    "password2": "DiferentePassword456!",
    "first_name": "Test",
    "last_name": "Mismatch",
    "phone": "+34600600001",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `400 Bad Request`
```json
{
    "password": ["Las contraseñas no coinciden"]
}
```

---

### TEST REG-007: Contraseña Muy Corta

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "username": "test_short_pass",
    "email": "shortpass@test.com",
    "password": "Ab1!",
    "password2": "Ab1!",
    "first_name": "Test",
    "last_name": "Short",
    "phone": "+34600700001",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `400 Bad Request`
```json
{
    "password": ["Esta contraseña es demasiado corta. Debe contener al menos 8 caracteres."]
}
```

---

### TEST REG-008: Contraseña Muy Común

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "username": "test_common_pass",
    "email": "commonpass@test.com",
    "password": "password123",
    "password2": "password123",
    "first_name": "Test",
    "last_name": "Common",
    "phone": "+34600800001",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `400 Bad Request`
```json
{
    "password": ["Esta contraseña es demasiado común."]
}
```

---

### TEST REG-009: Contraseña Solo Numérica

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "username": "test_numeric_pass",
    "email": "numericpass@test.com",
    "password": "12345678901234",
    "password2": "12345678901234",
    "first_name": "Test",
    "last_name": "Numeric",
    "phone": "+34600900001",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `400 Bad Request`
```json
{
    "password": ["Esta contraseña es completamente numérica."]
}
```

---

### TEST REG-010: Tenant Slug Inválido

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "username": "test_invalid_tenant",
    "email": "invalidtenant@test.com",
    "password": "TestPassword123!",
    "password2": "TestPassword123!",
    "first_name": "Test",
    "last_name": "Invalid",
    "phone": "+34601000001",
    "tenant_slug": "tenant-inexistente"
}
```

**Response Esperado:** `400 Bad Request`
```json
{
    "tenant_slug": ["Tenant no existe o está inactivo"]
}
```

---

### TEST REG-011: Tenant Slug No Coincide con Header

**Descripción:** El tenant_slug en body debe coincidir con X-Tenant-ID

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "username": "test_mismatch_tenant",
    "email": "mismatch_tenant@test.com",
    "password": "TestPassword123!",
    "password2": "TestPassword123!",
    "first_name": "Test",
    "last_name": "Mismatch",
    "phone": "+34601100001",
    "tenant_slug": "centro-lux"
}
```

**Response Esperado:** `400 Bad Request` o comportamiento según implementación

**Nota:** Verificar el comportamiento actual - el sistema puede:
1. Usar el tenant del header (X-Tenant-ID)
2. Usar el tenant del body (tenant_slug)
3. Rechazar si no coinciden

---

### TEST REG-012: Sin Header X-Tenant-ID

**Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```json
{
    "username": "test_no_header",
    "email": "noheader@test.com",
    "password": "TestPassword123!",
    "password2": "TestPassword123!",
    "first_name": "Test",
    "last_name": "NoHeader",
    "phone": "+34601200001",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `400 Bad Request`
```json
{
    "error": "Tenant no encontrado",
    "detail": "No se pudo identificar el tenant.",
    "code": "TENANT_NOT_FOUND"
}
```

---

### TEST REG-013: Campos Opcionales Vacíos

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "username": "test_minimal",
    "email": "minimal@test.com",
    "password": "TestPassword123!",
    "password2": "TestPassword123!",
    "first_name": "",
    "last_name": "",
    "phone": "",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `201 Created`

**Validaciones:**
- [ ] Usuario se crea correctamente
- [ ] Campos vacíos se guardan como strings vacíos
- [ ] `full_name` muestra el username como fallback

---

### TEST REG-014: Email Formato Inválido

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "username": "test_bad_email",
    "email": "esto-no-es-email",
    "password": "TestPassword123!",
    "password2": "TestPassword123!",
    "first_name": "Test",
    "last_name": "BadEmail",
    "phone": "+34601400001",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `400 Bad Request`
```json
{
    "email": ["Introduzca una dirección de correo electrónico válida."]
}
```

---

### TEST REG-015: Campos Requeridos Faltantes

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "username": "test_missing",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `400 Bad Request`
```json
{
    "email": ["Este campo es requerido."],
    "password": ["Este campo es requerido."],
    "password2": ["Este campo es requerido."]
}
```

---

## PARTE 2: INICIO DE SESIÓN (LOGIN)

### Endpoint
```
POST /api/core/auth/login/
```

### Permisos
- Público (no requiere autenticación)
- Requiere header `X-Tenant-ID`

---

### TEST LOGIN-001: Login Exitoso - Usuario Customer

**Pre-requisito:** Usuario registrado en TEST REG-001

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "email": "usuario001@gcbelleza.com",
    "password": "TestPassword123!",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `200 OK`
```json
{
    "user": {
        "id": "<number>",
        "username": "usuario_gc_001",
        "email": "usuario001@gcbelleza.com",
        "first_name": "Carlos",
        "last_name": "Martínez",
        "full_name": "Carlos Martínez",
        "phone": "+34600100001",
        "avatar": null,
        "tenant": "<uuid>",
        "tenant_name": "GC Belleza y Estética",
        "role": "customer",
        "role_display": "Cliente",
        "is_active": true,
        "date_joined": "<datetime>"
    },
    "tokens": {
        "refresh": "<jwt_token>",
        "access": "<jwt_token>"
    }
}
```

**Validaciones:**
- [ ] Status code es 200
- [ ] Se reciben tokens JWT válidos
- [ ] Datos del usuario son correctos
- [ ] `role` es "customer"

---

### TEST LOGIN-002: Login Exitoso - Usuario Admin

**Pre-requisito:** Crear usuario admin via Django Admin o shell

**Crear usuario admin (ejecutar en shell):**
```python
from core.models import User, Tenant
tenant = Tenant.objects.get(slug='gc-belleza')
user = User.objects.create_user(
    username='admin_gc',
    email='admin@gcbelleza.com',
    password='AdminPassword123!',
    tenant=tenant,
    role='admin',
    first_name='Administrador',
    last_name='Principal'
)
user.is_staff = True
user.save()
```

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "email": "admin@gcbelleza.com",
    "password": "AdminPassword123!",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `200 OK`

**Validaciones:**
- [ ] Status code es 200
- [ ] `user.role` es "admin"
- [ ] `user.role_display` es "Administrador"

---

### TEST LOGIN-003: Login Exitoso - Usuario Staff

**Pre-requisito:** Crear usuario staff via Django Admin o shell

**Crear usuario staff (ejecutar en shell):**
```python
from core.models import User, Tenant
tenant = Tenant.objects.get(slug='gc-belleza')
user = User.objects.create_user(
    username='staff_gc',
    email='staff@gcbelleza.com',
    password='StaffPassword123!',
    tenant=tenant,
    role='staff',
    first_name='Empleado',
    last_name='Uno'
)
```

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "email": "staff@gcbelleza.com",
    "password": "StaffPassword123!",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `200 OK`

**Validaciones:**
- [ ] Status code es 200
- [ ] `user.role` es "staff"
- [ ] `user.role_display` es "Empleado"

---

### TEST LOGIN-004: Login en Tenant Correcto con Email Multi-Tenant

**Pre-requisito:** Usuario con email `maria.compartido@test.com` existe en ambos tenants (TEST REG-003)

**Login en gc-belleza:**

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "email": "maria.compartido@test.com",
    "password": "TestPassword123!",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `200 OK`

**Validaciones:**
- [ ] Se autentica el usuario del tenant gc-belleza
- [ ] `user.tenant_name` es "GC Belleza y Estética"
- [ ] `user.last_name` es "García" (no "García Lux")

---

### TEST LOGIN-005: Login en Segundo Tenant con Email Multi-Tenant

**Pre-requisito:** Usuario con email `maria.compartido@test.com` existe en ambos tenants (TEST REG-003)

**Login en centro-lux:**

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: centro-lux
```

**Request Body:**
```json
{
    "email": "maria.compartido@test.com",
    "password": "OtraPassword456!",
    "tenant_slug": "centro-lux"
}
```

**Response Esperado:** `200 OK`

**Validaciones:**
- [ ] Se autentica el usuario del tenant centro-lux
- [ ] `user.tenant_name` es "Centro de Estética Lux"
- [ ] `user.last_name` es "García Lux"
- [ ] Contraseña es diferente a la del otro tenant

---

### TEST LOGIN-006: Login con Contraseña Incorrecta

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "email": "usuario001@gcbelleza.com",
    "password": "ContraseñaIncorrecta!",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `401 Unauthorized`
```json
{
    "error": "Credenciales inválidas"
}
```

---

### TEST LOGIN-007: Login con Email No Registrado

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "email": "noexiste@test.com",
    "password": "CualquierPassword123!",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `401 Unauthorized`
```json
{
    "error": "Credenciales inválidas"
}
```

---

### TEST LOGIN-008: Login con Usuario de Otro Tenant

**Descripción:** Usuario existe en centro-lux pero intenta login en gc-belleza

**Pre-requisito:** Usuario `usuario001@centrolux.com` solo existe en centro-lux

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "email": "usuario001@centrolux.com",
    "password": "TestPassword123!",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `401 Unauthorized`
```json
{
    "error": "Credenciales inválidas"
}
```

**Validaciones:**
- [ ] No se puede acceder a usuario de otro tenant
- [ ] Mensaje de error no revela que el usuario existe en otro tenant

---

### TEST LOGIN-009: Login con Tenant Slug Incorrecto en Body

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "email": "usuario001@gcbelleza.com",
    "password": "TestPassword123!",
    "tenant_slug": "centro-lux"
}
```

**Response Esperado:** `401 Unauthorized`

**Nota:** Verificar comportamiento - el sistema debe autenticar usando el tenant_slug del body o del header según la implementación.

---

### TEST LOGIN-010: Login Sin Header X-Tenant-ID

**Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```json
{
    "email": "usuario001@gcbelleza.com",
    "password": "TestPassword123!",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `400 Bad Request`
```json
{
    "error": "Tenant no encontrado",
    "detail": "No se pudo identificar el tenant.",
    "code": "TENANT_NOT_FOUND"
}
```

---

### TEST LOGIN-011: Login con Usuario Inactivo

**Pre-requisito:** Desactivar usuario via Django Admin

```python
from core.models import User
user = User.objects.get(email='usuario001@gcbelleza.com', tenant__slug='gc-belleza')
user.is_active = False
user.save()
```

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "email": "usuario001@gcbelleza.com",
    "password": "TestPassword123!",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `401 Unauthorized`
```json
{
    "error": "Cuenta desactivada"
}
```

**Post-test:** Reactivar usuario
```python
user.is_active = True
user.save()
```

---

### TEST LOGIN-012: Login con Campos Vacíos

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "email": "",
    "password": "",
    "tenant_slug": ""
}
```

**Response Esperado:** `400 Bad Request`
```json
{
    "email": ["Este campo no puede estar en blanco."],
    "password": ["Este campo no puede estar en blanco."],
    "tenant_slug": ["Este campo no puede estar en blanco."]
}
```

---

### TEST LOGIN-013: Login con Email en Mayúsculas

**Descripción:** El email debe ser case-insensitive

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "email": "USUARIO001@GCBELLEZA.COM",
    "password": "TestPassword123!",
    "tenant_slug": "gc-belleza"
}
```

**Response Esperado:** `200 OK`

**Validaciones:**
- [ ] Login exitoso independientemente del case del email
- [ ] El email en la respuesta está en minúsculas

---

## PARTE 3: OBTENER USUARIO ACTUAL (ME)

### Endpoint
```
GET /api/core/auth/me/
```

### Permisos
- Requiere autenticación (Bearer token)
- Requiere header `X-Tenant-ID`

---

### TEST ME-001: Obtener Datos de Usuario Customer

**Pre-requisito:** Token obtenido de TEST LOGIN-001

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
Authorization: Bearer {access_token}
```

**Response Esperado:** `200 OK`
```json
{
    "user": {
        "id": "<number>",
        "username": "usuario_gc_001",
        "email": "usuario001@gcbelleza.com",
        "first_name": "Carlos",
        "last_name": "Martínez",
        "full_name": "Carlos Martínez",
        "phone": "+34600100001",
        "avatar": null,
        "tenant": "<uuid>",
        "tenant_name": "GC Belleza y Estética",
        "role": "customer",
        "role_display": "Cliente",
        "is_active": true,
        "date_joined": "<datetime>"
    },
    "tenant": {
        "id": "<uuid>",
        "name": "GC Belleza y Estética",
        "slug": "gc-belleza",
        "email": "<tenant_email>",
        "phone": "<tenant_phone>",
        "city": "<city>",
        "country": "España",
        "logo": null,
        "primary_color": "#3B82F6",
        "secondary_color": "#8B5CF6",
        "timezone": "Europe/Madrid",
        "currency": "EUR",
        "language": "es"
    }
}
```

---

### TEST ME-002: Obtener Datos de Usuario Admin

**Pre-requisito:** Token obtenido de TEST LOGIN-002

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
Authorization: Bearer {access_token_admin}
```

**Response Esperado:** `200 OK`

**Validaciones:**
- [ ] `user.role` es "admin"
- [ ] `user.role_display` es "Administrador"

---

### TEST ME-003: Obtener Datos de Usuario Staff

**Pre-requisito:** Token obtenido de TEST LOGIN-003

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
Authorization: Bearer {access_token_staff}
```

**Response Esperado:** `200 OK`

**Validaciones:**
- [ ] `user.role` es "staff"
- [ ] `user.role_display` es "Empleado"

---

### TEST ME-004: Sin Token de Autorización

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Response Esperado:** `401 Unauthorized`
```json
{
    "detail": "Las credenciales de autenticación no se proveyeron."
}
```

---

### TEST ME-005: Token Inválido

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
Authorization: Bearer token_invalido_123
```

**Response Esperado:** `401 Unauthorized`
```json
{
    "detail": "Token inválido o expirado",
    "code": "token_not_valid"
}
```

---

### TEST ME-006: Token de Otro Tenant

**Descripción:** Usar token obtenido en gc-belleza pero con header de centro-lux

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: centro-lux
Authorization: Bearer {access_token_gc_belleza}
```

**Response Esperado:** `401 Unauthorized` o `403 Forbidden`

**Validaciones:**
- [ ] No se puede usar token de otro tenant
- [ ] El sistema detecta la inconsistencia

---

## PARTE 4: REFRESH TOKEN

### Endpoint
```
POST /api/core/auth/refresh/
```

### Permisos
- Público (usa refresh token, no access token)
- Requiere header `X-Tenant-ID`

---

### TEST REFRESH-001: Refresh Token Exitoso

**Pre-requisito:** Refresh token obtenido de login

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "refresh": "{refresh_token}"
}
```

**Response Esperado:** `200 OK`
```json
{
    "access": "<nuevo_access_token>"
}
```

**Validaciones:**
- [ ] Se obtiene nuevo access token
- [ ] El nuevo access token es diferente al anterior
- [ ] El nuevo access token es válido

---

### TEST REFRESH-002: Refresh Token Inválido

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "refresh": "token_invalido_123"
}
```

**Response Esperado:** `401 Unauthorized`
```json
{
    "detail": "Token is invalid or expired",
    "code": "token_not_valid"
}
```

---

### TEST REFRESH-003: Refresh Token Ya Usado (Blacklisted)

**Descripción:** Después de logout, el refresh token queda en blacklist

**Pre-requisito:** Hacer logout con el refresh token

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "refresh": "{refresh_token_usado_en_logout}"
}
```

**Response Esperado:** `401 Unauthorized`
```json
{
    "detail": "Token is blacklisted",
    "code": "token_not_valid"
}
```

---

## PARTE 5: LOGOUT

### Endpoint
```
POST /api/core/auth/logout/
```

### Permisos
- Requiere autenticación (Bearer token)
- Requiere header `X-Tenant-ID`

---

### TEST LOGOUT-001: Logout Exitoso

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
    "refresh": "{refresh_token}"
}
```

**Response Esperado:** `200 OK`
```json
{
    "message": "Logout exitoso"
}
```

**Validaciones:**
- [ ] Status code es 200
- [ ] El refresh token queda invalidado (blacklisted)
- [ ] No se puede usar el refresh token después del logout

---

### TEST LOGOUT-002: Logout Sin Authorization Header

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Request Body:**
```json
{
    "refresh": "{refresh_token}"
}
```

**Response Esperado:** `401 Unauthorized`

---

### TEST LOGOUT-003: Logout con Refresh Token Inválido

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
    "refresh": "token_invalido"
}
```

**Response Esperado:** `400 Bad Request`

---

## PARTE 6: INFORMACIÓN DEL TENANT

### Endpoint
```
GET /api/core/tenant-info/
```

### Permisos
- Público
- Requiere header `X-Tenant-ID`

---

### TEST TENANT-001: Obtener Info de GC Belleza

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: gc-belleza
```

**Response Esperado:** `200 OK`
```json
{
    "tenant": {
        "id": "<uuid>",
        "name": "GC Belleza y Estética",
        "slug": "gc-belleza",
        "email": "<email>",
        "phone": "<phone>",
        "city": "<city>",
        "country": "España",
        "logo": null,
        "primary_color": "#3B82F6",
        "secondary_color": "#8B5CF6",
        "timezone": "Europe/Madrid",
        "currency": "EUR",
        "language": "es"
    },
    "users_count": "<number>"
}
```

---

### TEST TENANT-002: Obtener Info de Centro Lux

**Headers:**
```http
Content-Type: application/json
X-Tenant-ID: centro-lux
```

**Response Esperado:** `200 OK`

**Validaciones:**
- [ ] `tenant.name` es "Centro de Estética Lux"
- [ ] `tenant.slug` es "centro-lux"

---

### TEST TENANT-003: Sin Header X-Tenant-ID

**Headers:**
```http
Content-Type: application/json
```

**Response Esperado:** `400 Bad Request`
```json
{
    "error": "Tenant no encontrado",
    "detail": "No se pudo identificar el tenant.",
    "code": "TENANT_NOT_FOUND"
}
```

---

## Resumen de Ejecución

### Matriz de Tests por Módulo

| Módulo | Total | Pasados | Fallidos | Bloqueados |
|--------|-------|---------|----------|------------|
| Registro (REG) | 15 | | | |
| Login (LOGIN) | 13 | | | |
| Me (ME) | 6 | | | |
| Refresh (REFRESH) | 3 | | | |
| Logout (LOGOUT) | 3 | | | |
| Tenant Info (TENANT) | 3 | | | |
| **TOTAL** | **43** | | | |

### Datos de Prueba Creados

| Usuario | Email | Tenant | Rol | Password |
|---------|-------|--------|-----|----------|
| usuario_gc_001 | usuario001@gcbelleza.com | gc-belleza | customer | TestPassword123! |
| usuario_lux_001 | usuario001@centrolux.com | centro-lux | customer | TestPassword123! |
| maria_multi | maria.compartido@test.com | gc-belleza | customer | TestPassword123! |
| maria_multi_lux | maria.compartido@test.com | centro-lux | customer | OtraPassword456! |
| admin_gc | admin@gcbelleza.com | gc-belleza | admin | AdminPassword123! |
| staff_gc | staff@gcbelleza.com | gc-belleza | staff | StaffPassword123! |

---

## Scripts de Setup

### Crear Usuarios de Prueba (Django Shell)

```python
# Ejecutar: python manage.py shell

from core.models import User, Tenant

# Obtener tenants
gc = Tenant.objects.get(slug='gc-belleza')
lux = Tenant.objects.get(slug='centro-lux')

# Usuario Admin
admin = User.objects.create_user(
    username='admin_gc',
    email='admin@gcbelleza.com',
    password='AdminPassword123!',
    tenant=gc,
    role='admin',
    first_name='Administrador',
    last_name='Principal'
)
admin.is_staff = True
admin.save()

# Usuario Staff
staff = User.objects.create_user(
    username='staff_gc',
    email='staff@gcbelleza.com',
    password='StaffPassword123!',
    tenant=gc,
    role='staff',
    first_name='Empleado',
    last_name='Uno'
)

print("Usuarios creados exitosamente")
```

### Limpiar Usuarios de Prueba

```python
# Ejecutar: python manage.py shell

from core.models import User

# Eliminar usuarios de prueba (excepto superusuarios)
test_emails = [
    'usuario001@gcbelleza.com',
    'usuario001@centrolux.com',
    'maria.compartido@test.com',
    'admin@gcbelleza.com',
    'staff@gcbelleza.com',
]

User.objects.filter(email__in=test_emails).delete()
print("Usuarios de prueba eliminados")
```

---

*Documento de Pruebas QA - ECO-GRAVITIFY v1.0*
*Generado: 2025-12-29*
