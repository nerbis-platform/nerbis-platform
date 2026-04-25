// src/app/global-error.tsx

'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isNetworkError =
    error.message?.includes('conectar') ||
    error.message?.includes('NETWORK_ERROR') ||
    error.message?.includes('fetch') ||
    error.message?.includes('network');

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(to bottom, #f9fafb, #ffffff)',
            padding: '24px',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            {/* Icon */}
            <div
              style={{
                margin: '0 auto 24px',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isNetworkError ? (
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                ) : (
                  <path d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#1f2937',
                marginBottom: '8px',
              }}
            >
              {isNetworkError
                ? 'Sin conexion al servidor'
                : 'Algo salio mal'}
            </h2>

            {/* Message */}
            <p
              style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '24px',
                lineHeight: 1.6,
              }}
            >
              {isNetworkError
                ? 'No pudimos conectar con el servidor. Esto puede pasar si hay un mantenimiento o si tu conexion a internet se perdio.'
                : 'Hubo un problema al cargar la aplicacion. Por favor intenta de nuevo.'}
            </p>

            {/* Retry button */}
            <button
              onClick={reset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#1C3B57',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Reintentar
            </button>

            {/* Help text */}
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '16px' }}>
              Si el problema persiste, espera unos minutos e intenta de nuevo.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
