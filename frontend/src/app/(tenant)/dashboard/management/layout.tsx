// src/app/dashboard/management/layout.tsx

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  BarChart3,
  Truck,
  ShoppingBag,
  PackageSearch,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard/management', label: 'Resumen', icon: BarChart3, exact: true },
  { href: '/dashboard/management/sales', label: 'Ventas', icon: DollarSign },
  { href: '/dashboard/management/purchases', label: 'Compras', icon: ShoppingBag },
  { href: '/dashboard/management/suppliers', label: 'Proveedores', icon: Truck },
  { href: '/dashboard/management/expenses', label: 'Gastos', icon: Receipt },
  { href: '/dashboard/management/inventory', label: 'Inventario', icon: PackageSearch },
] as const;

export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, tenant } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Solo admins/staff con modulo management activo
  const hasAccess = user && (user.role === 'admin' || user.role === 'staff');
  const hasModule = tenant?.has_management;

  useEffect(() => {
    if (user && !hasAccess) {
      router.replace('/dashboard');
    } else if (user && !hasModule) {
      router.replace('/dashboard');
    }
  }, [user, hasAccess, hasModule, router]);

  if (!hasAccess || !hasModule) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Titulo de seccion */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1C3B57' }}>
          Gestion Comercial
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administra proveedores, compras, ventas, gastos e inventario
        </p>
      </div>

      {/* Navegacion horizontal */}
      <nav className="flex gap-1 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Contenido */}
      {children}
    </div>
  );
}
