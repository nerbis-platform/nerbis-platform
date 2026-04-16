// src/contexts/AdminAuthContext.tsx
//
// Platform superadmin auth context. Fully isolated from the tenant
// AuthContext:
//   - Reads/writes ONLY the admin_* localStorage keys via ADMIN_STORAGE_KEYS.
//   - Does NOT import from any tenant context or tenant axios client.
//   - Holds no tenant state.
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  adminLogin,
  adminLogout,
  adminMe,
  getStoredAdmin,
} from '@/lib/api/admin-auth';
import { ADMIN_STORAGE_KEYS } from '@/lib/api/admin-client';
import type { AdminUser } from '@/types/admin';

interface AdminAuthState {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(() => getStoredAdmin());
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from server on mount — admin namespace only.
  useEffect(() => {
    if (typeof window === 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      return;
    }
    // Check for stored admin_user to decide if we should hydrate.
    // Auth tokens are now httpOnly cookies — we can't read them from JS.
    const storedUser = window.localStorage.getItem(ADMIN_STORAGE_KEYS.user);
    if (!storedUser) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    adminMe()
      .then((fresh) => {
        if (!cancelled) setAdmin(fresh);
      })
      .catch(() => {
        if (!cancelled) setAdmin(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await adminLogin(email, password);
      setAdmin(res.user);
      router.push('/admin');
    },
    [router],
  );

  const logout = useCallback(async () => {
    await adminLogout();
    setAdmin(null);
    router.push('/admin/login');
  }, [router]);

  const refresh = useCallback(async () => {
    try {
      const me = await adminMe();
      setAdmin(me);
    } catch {
      setAdmin(null);
    }
  }, []);

  const value: AdminAuthState = {
    admin,
    isAuthenticated: admin !== null,
    isLoading,
    login,
    logout,
    refresh,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
}
