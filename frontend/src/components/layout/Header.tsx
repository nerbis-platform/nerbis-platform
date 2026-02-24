// src/components/layout/Header.tsx

'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ShoppingCart, User, Menu, Search, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { PromoBanner } from './PromoBanner';
import { SearchModal } from './SearchModal';
import { BrandLogo } from './BrandLogo';
import { ModuleShow } from '@/components/common/ModuleGuard';
import { usePageEnabled } from '@/contexts/TenantContext';

function PageLink({ page, href, label, className }: { page: string; href: string; label: string; className?: string }) {
  const isEnabled = usePageEnabled(page);
  if (!isEnabled) return null;
  return (
    <Link href={href} className={className || "text-base font-medium text-foreground/80 hover:text-primary transition-colors"}>
      {label}
    </Link>
  );
}

export function Header() {
  const { user, tenant, isAuthenticated, logout } = useAuth();
  const { itemsCount } = useCart();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <PromoBanner position="top" />
      <header className="sticky top-0 z-50 w-full border-b bg-header/95 backdrop-blur supports-backdrop-filter:bg-header/80">
        <div className="container flex h-20 md:h-24 items-center justify-between px-4 md:px-6">
        {/* Logo - más grande y prominente */}
        <BrandLogo
          size="xl"
          imageClassName="h-14 md:h-[72px] w-auto max-w-[240px] md:max-w-[320px]"
          className="shrink-0"
        />

        {/* Navigation - texto más grande y mejor espaciado */}
        <nav className="hidden lg:flex items-center space-x-8">
          <ModuleShow module="shop">
            <PageLink page="products" href="/products" label="Productos" />
          </ModuleShow>
          <ModuleShow module="bookings">
            <PageLink page="services" href="/services" label="Servicios" />
          </ModuleShow>
          <ModuleShow module="services">
            <PageLink page="pricing" href="/plans" label="Planes" />
          </ModuleShow>
          <PageLink page="about" href="/about" label="Nosotros" />
          <Link href="/contact" className="text-base font-medium text-foreground/80 hover:text-primary transition-colors">
            Contacto
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Search */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex h-10 w-10 md:h-11 md:w-11"
          >
            <Search className="h-5 w-5 md:h-6 md:w-6" />
          </Button>

          {/* Carrito - Solo si tiene el módulo Shop */}
          <ModuleShow module="shop">
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative h-10 w-10 md:h-11 md:w-11">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
                {itemsCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {itemsCount}
                  </Badge>
                )}
              </Button>
            </Link>
          </ModuleShow>

          {/* User Menu */}
          {!isHydrated ? (
            <Skeleton className="h-10 w-10 md:h-11 md:w-11 rounded-md" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex flex-col items-center justify-center rounded-md h-auto min-h-10 w-auto min-w-10 px-1.5 py-1 hover:bg-accent hover:text-accent-foreground transition-all outline-none cursor-pointer">
                  <User className="h-5 w-5" />
                  {user.role !== 'customer' && (
                    <span
                      className="text-[8px] font-bold text-white px-1 mt-0.5 rounded-sm uppercase"
                      style={{
                        backgroundColor: user.role === 'admin' ? '#6366f1' : '#f59e0b',
                        lineHeight: '14px',
                      }}
                    >
                      {user.role === 'admin' ? 'ADMIN' : 'STAFF'}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 w-full">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{user.full_name}</p>
                      {user.role !== 'customer' && (
                        <span
                          className="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-full leading-none uppercase"
                          style={{ backgroundColor: user.role === 'admin' ? '#6366f1' : '#f59e0b' }}
                        >
                          {user.role === 'admin' ? 'ADMIN' : 'STAFF'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    {/* Badge de suscripción - solo para admin */}
                    {user.role === 'admin' && tenant && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            tenant.is_trial
                              ? tenant.days_remaining !== null && tenant.days_remaining <= 7
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}
                        >
                          {tenant.is_trial ? 'Prueba' : tenant.plan_display}
                          {tenant.days_remaining !== null && ` · ${tenant.days_remaining} días`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                {user.role === 'staff' ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">Panel de Staff</Link>
                    </DropdownMenuItem>
                    <ModuleShow module="shop">
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/products">Productos</Link>
                      </DropdownMenuItem>
                    </ModuleShow>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/staff/appointments">Mis Citas (Staff)</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile">Mi Perfil</Link>
                    </DropdownMenuItem>
                  </>
                ) : user.role === 'admin' ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">Mi Panel</Link>
                    </DropdownMenuItem>
                    <ModuleShow module="shop">
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/products">Productos</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/products/categories">Categorías</Link>
                      </DropdownMenuItem>
                    </ModuleShow>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/orders">Mis Órdenes</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/appointments">Mis Citas</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/contracts">Mis Contratos</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile">Mi Perfil</Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">Mi Panel</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/orders">Mis Órdenes</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/appointments">Mis Citas</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/contracts">Mis Contratos</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile">Mi Perfil</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="lg" className="hidden sm:flex">
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
          )}

          {/* Mobile Menu */}
          <Button variant="ghost" size="icon" className="lg:hidden h-10 w-10 md:h-11 md:w-11">
            <Menu className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
        </div>
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
