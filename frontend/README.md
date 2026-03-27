This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## HTTPS Local (para Facebook Login)

Facebook Login requiere HTTPS obligatoriamente. Para probar social login con Facebook en desarrollo local:

### 1. Instalar mkcert (solo la primera vez)

```bash
# macOS
brew install mkcert
mkcert -install
```

### 2. Ejecutar el dev server con HTTPS

```bash
npm run dev:https
```

Esto levanta el servidor en `https://localhost:3000` con un certificado autofirmado generado por Next.js + mkcert.

### 3. Configurar Facebook App (solo la primera vez)

En la [consola de Facebook Developers](https://developers.facebook.com/apps/):

1. Ir a tu app > Settings > Basic
2. En "App Domains" agregar `localhost`
3. Ir a Facebook Login > Settings
4. En "Valid OAuth Redirect URIs" agregar `https://localhost:3000`

### Notas

- Google Login funciona tanto en HTTP como HTTPS, no necesita este setup
- El backend Django puede seguir en HTTP (`http://localhost:8000`) — el flujo OAuth envía el token del SDK al backend por API. El navegador mostrará avisos de "mixed content" en la consola porque el frontend es HTTPS y el backend HTTP; esto es normal en desarrollo y no afecta el funcionamiento del OAuth (el SDK de Facebook corre en el cliente y el token se envía al backend vía API)
- Asegúrate de tener `NEXT_PUBLIC_API_URL=http://localhost:8000/api` en tu `.env.local`
- En producción (Vercel/dominio real) HTTPS es automático, no se necesita configuración adicional
