// src/lib/api/client.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getClientTenantSlug } from '@/lib/tenant';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Obtiene el tenant slug desde la cookie o el subdominio.
 */
function getTenantSlug(): string {
  // En el servidor, usar el valor por defecto
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || 'gc-belleza';
  }

  // Prioridad 1: tenant guardado en localStorage (post-login/registro)
  // Esto es crucial para que después de registrar un nuevo tenant,
  // las llamadas API usen el tenant correcto (no el default de localhost)
  const tenantStr = localStorage.getItem('tenant');
  if (tenantStr) {
    try {
      const tenant = JSON.parse(tenantStr);
      if (tenant.slug) return tenant.slug;
    } catch { /* fallback */ }
  }

  // Prioridad 2: cookie (establecida por el middleware desde subdominio)
  const cookieMatch = document.cookie.match(/tenant-slug=([^;]+)/);
  if (cookieMatch) {
    return cookieMatch[1];
  }

  // Prioridad 3: detectar del subdominio
  return getClientTenantSlug();
}

/**
 * Cliente Axios configurado para la API
 * withCredentials: true permite que el browser envíe/reciba cookies httpOnly
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Interceptor para agregar tenant slug a cada request.
 * Los tokens de auth se envían automáticamente como cookies httpOnly por el browser.
 */
apiClient.interceptors.request.use(
  (config) => {
    config.headers['X-Tenant-Slug'] = getTenantSlug();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Clase de error personalizada para errores de API
 */
export class ApiError extends Error {
  status?: number;
  code?: string;
  data?: unknown;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Auto-refresh de tokens: evita que múltiples requests 401
 * simultáneos disparen múltiples refreshes.
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

function clearSessionAndRedirect() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    const currentPath = window.location.pathname;
    if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
      window.location.href = '/login';
    }
  }
}

/**
 * Interceptor para manejar errores
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string; detail?: string; message?: string; code?: string; email?: string }>) => {
    // Error de red (servidor caído, sin conexión, etc.)
    if (!error.response) {
      const networkError = new ApiError(
        'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet e intenta de nuevo.',
        0,
        'NETWORK_ERROR'
      );
      return Promise.reject(networkError);
    }

    const originalRequest = error.config;

    // Verificar si es una solicitud de autenticación (login/register/refresh)
    const requestUrl = originalRequest?.url || '';
    const isAuthRequest = requestUrl.includes('/auth/login') ||
                          requestUrl.includes('/auth/register') ||
                          requestUrl.includes('/auth/token') ||
                          requestUrl.includes('/public/platform-');
    const isRefreshRequest = requestUrl.includes('/auth/refresh');

    // Si es 401 (no autorizado)
    if (error.response.status === 401 && originalRequest) {
      // Si es una solicitud de autenticación, mostrar el mensaje del servidor
      if (isAuthRequest) {
        const serverMessage =
          error.response.data?.error ||
          error.response.data?.detail ||
          error.response.data?.message ||
          'Credenciales inválidas';
        const authError = new ApiError(serverMessage, 401, 'INVALID_CREDENTIALS');
        return Promise.reject(authError);
      }

      // Si el refresh mismo falló, limpiar sesión y redirigir
      if (isRefreshRequest) {
        clearSessionAndRedirect();
        const authError = new ApiError(
          'Sesión expirada. Por favor, inicia sesión de nuevo.',
          401,
          'UNAUTHORIZED'
        );
        return Promise.reject(authError);
      }

      // Si ya hay un refresh en curso, encolar este request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          // Las cookies se actualizaron automáticamente por el browser
          return apiClient(originalRequest);
        });
      }

      isRefreshing = true;

      try {
        // El refresh token se envía automáticamente como cookie httpOnly
        await axios.post(
          `${API_URL}/auth/refresh/`,
          {},
          { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
        );

        processQueue(null, 'refreshed');

        // Reintentar el request original (las cookies ya se actualizaron)
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSessionAndRedirect();
        const authError = new ApiError(
          'Sesión expirada. Por favor, inicia sesión de nuevo.',
          401,
          'UNAUTHORIZED'
        );
        return Promise.reject(authError);
      } finally {
        isRefreshing = false;
      }
    }

    // Extraer mensaje de error del servidor
    let serverMessage =
      error.response.data?.error ||
      error.response.data?.detail ||
      error.response.data?.message;

    // Si no hay mensaje directo, extraer de errores de validación por campo
    // Django DRF devuelve: { "campo": ["mensaje1", "mensaje2"] }
    if (!serverMessage && error.response.data && typeof error.response.data === 'object') {
      const fieldErrors = Object.values(error.response.data).flat();
      if (fieldErrors.length > 0 && typeof fieldErrors[0] === 'string') {
        serverMessage = fieldErrors.join('. ');
      }
    }

    // Manejar cuenta inactiva (403 con código ACCOUNT_INACTIVE)
    if (error.response.status === 403 && error.response.data?.code === 'ACCOUNT_INACTIVE') {
      const inactiveError = new ApiError(
        error.response.data.message || 'Tu cuenta fue desactivada',
        403,
        'ACCOUNT_INACTIVE'
      );
      inactiveError.data = error.response.data; // Guardar datos adicionales (email, etc)
      return Promise.reject(inactiveError);
    }

    // Errores específicos por código de estado
    let userMessage: string;
    switch (error.response.status) {
      case 400:
        userMessage = serverMessage || 'Datos inválidos. Por favor, revisa la información ingresada.';
        break;
      case 403:
        userMessage = serverMessage || 'No tienes permiso para realizar esta acción.';
        break;
      case 404:
        userMessage = serverMessage || 'El recurso solicitado no fue encontrado.';
        break;
      case 429:
        userMessage = 'Demasiados intentos. Por favor, espera un momento antes de intentar de nuevo.';
        break;
      case 500:
        userMessage = 'Error interno del servidor. Por favor, intenta más tarde.';
        break;
      case 502:
      case 503:
      case 504:
        userMessage = 'El servidor no está disponible en este momento. Por favor, intenta más tarde.';
        break;
      default:
        userMessage = serverMessage || 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
    }

    const apiError = new ApiError(userMessage, error.response.status);
    apiError.data = error.response.data;
    return Promise.reject(apiError);
  }
);

export default apiClient;