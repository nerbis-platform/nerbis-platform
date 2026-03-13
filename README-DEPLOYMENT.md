# 🚀 Guía de Deployment - NERBIS

## Enfoque Simple: Desarrollo vs Producción

### ✅ DESARROLLO = localhost
### ✅ PRODUCCIÓN = dominios reales

---

## 🏠 Desarrollo Local

### Comando:
```bash
# Backend
docker-compose up

# Frontend
cd frontend
npm run dev
```

### Acceso:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Admin: `http://localhost:8000/admin`

### Configuración:
```bash
# frontend/.env.local
# Las URLs están comentadas = usa localhost automáticamente
# NEXT_PUBLIC_API_URL=http://localhost:8000/api
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```python
# backend/config/settings.py
ALLOWED_HOSTS = ['localhost', '127.0.0.1']
CORS_ALLOWED_ORIGINS = ['http://localhost:3000']
```

**✅ Funciona sin tocar nada**

---

## 🌐 Producción

### Arquitectura:
```
Frontend: https://app.nerbis.com    (Vercel/Netlify)
Backend:  https://api.nerbis.com    (Railway/Render)
Admin:    https://admin.nerbis.com  (mismo backend)
```

### Configuración Frontend:

```bash
# frontend/.env.production
NEXT_PUBLIC_API_URL=https://api.nerbis.com
NEXT_PUBLIC_APP_URL=https://app.nerbis.com
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_XXXXX
```

### Configuración Backend:

**Variables de entorno (Railway/Render):**
```bash
SECRET_KEY=tu-secret-key-super-seguro-aqui
DATABASE_URL=postgresql://usuario:password@host:5432/db
DEBUG=False
ALLOWED_HOSTS=api.nerbis.com,admin.nerbis.com
CORS_ALLOWED_ORIGINS=https://app.nerbis.com,https://nerbis.com
CSRF_TRUSTED_ORIGINS=https://api.nerbis.com,https://admin.nerbis.com
```

**En producción, settings.py lee de variables de entorno:**
```python
# Ya configurado en el código
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
```

---

## 📋 Comandos

### Desarrollo:
```bash
# Frontend
npm run dev

# Backend
docker-compose up
```

### Build Producción:
```bash
# Frontend
npm run build

# Backend
docker build -t nerbis-backend .
```

### Deploy:
```bash
# Frontend (Vercel)
vercel --prod

# Backend (Railway)
railway up
```

---

## ❓ FAQ

### ¿Cómo pruebo desde mi celular?

**Opción 1: No lo hagas en desarrollo**
- Desarrollo es para localhost
- Testea en producción (staging environment)

**Opción 2: Si realmente necesitas (temporal)**
1. Obtén tu IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
2. Edita `.env.local` temporalmente:
   ```bash
   NEXT_PUBLIC_API_URL=http://TU_IP:8000/api
   ```
3. Ejecuta: `next dev -H 0.0.0.0`
4. Accede: `http://TU_IP:3000`
5. **Revierte cambios cuando termines**

**Opción 3: Usa ngrok (mejor)**
```bash
ngrok http 3000
# Te da: https://abc123.ngrok.io
# Comparte ese link
```

---

## 🎯 Principios

1. **Desarrollo**: Solo localhost, simple, sin configuración
2. **Producción**: Dominios reales, HTTPS, variables de entorno
3. **No mezclar**: No uses IPs en desarrollo, no uses localhost en producción
4. **Separación clara**: Un archivo .env por entorno

---

## ✅ Checklist Pre-Producción

- [ ] `.env.production` configurado con URLs reales
- [ ] Variables de entorno en Railway/Render configuradas
- [ ] `DEBUG=False` en producción
- [ ] `HTTPS` configurado
- [ ] Dominios DNS apuntando correctamente
- [ ] `ALLOWED_HOSTS` con dominios reales
- [ ] `CORS_ALLOWED_ORIGINS` con URLs de producción
- [ ] Certificados SSL activos
- [ ] Database en producción (no SQLite)

---

**Simple. Claro. Sin sorpresas.** ✨
