// frontend/src/components/common/ModuleGuard.tsx
'use client';

import { type ReactNode } from 'react';
import { useModule, useAnyModule, useAllModules, type TenantModules } from '@/contexts/TenantContext';

interface ModuleGuardProps {
  /**
   * Módulo requerido para mostrar el contenido
   */
  module?: keyof TenantModules;

  /**
   * Lista de módulos - al menos uno debe estar activo
   */
  anyOf?: Array<keyof TenantModules>;

  /**
   * Lista de módulos - todos deben estar activos
   */
  allOf?: Array<keyof TenantModules>;

  /**
   * Contenido a mostrar si el módulo NO está activo
   */
  fallback?: ReactNode;

  /**
   * Contenido a mostrar si el módulo SÍ está activo
   */
  children: ReactNode;
}

/**
 * Componente que muestra contenido condicionalmente según los módulos activos del tenant
 *
 * Ejemplos de uso:
 *
 * ```tsx
 * // Mostrar solo si tiene el módulo shop
 * <ModuleGuard module="shop">
 *   <Link href="/products">Productos</Link>
 * </ModuleGuard>
 *
 * // Mostrar si tiene shop O bookings
 * <ModuleGuard anyOf={['shop', 'bookings']}>
 *   <CartButton />
 * </ModuleGuard>
 *
 * // Mostrar si tiene shop Y marketing
 * <ModuleGuard allOf={['shop', 'marketing']}>
 *   <PromotionsSection />
 * </ModuleGuard>
 *
 * // Con fallback
 * <ModuleGuard module="services" fallback={<p>Próximamente</p>}>
 *   <ServicesSection />
 * </ModuleGuard>
 * ```
 */
export function ModuleGuard({
  module,
  anyOf,
  allOf,
  fallback = null,
  children,
}: ModuleGuardProps) {
  // All hooks must be called unconditionally to satisfy React rules of hooks.
  // We pass safe defaults when the prop is not provided.
  const singleModuleActive = useModule(module ?? 'shop');
  const anyModuleActive = useAnyModule(anyOf && anyOf.length > 0 ? anyOf : ['shop']);
  const allModulesActive = useAllModules(allOf && allOf.length > 0 ? allOf : ['shop']);

  // Determine which result to use based on which prop was provided
  let shouldShow = false;

  if (module) {
    shouldShow = singleModuleActive;
  } else if (anyOf && anyOf.length > 0) {
    shouldShow = anyModuleActive;
  } else if (allOf && allOf.length > 0) {
    shouldShow = allModulesActive;
  } else {
    // Si no se especifica ninguna condición, mostrar por defecto
    console.warn('ModuleGuard: No se especificó module, anyOf o allOf');
    shouldShow = true;
  }

  if (!shouldShow) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Componente especializado para ocultar (en vez de mostrar fallback)
 */
export function ModuleShow({ module, children }: { module: keyof TenantModules; children: ReactNode }) {
  const isActive = useModule(module);
  if (!isActive) return null;
  return <>{children}</>;
}

/**
 * Componente para mostrar SOLO si el módulo NO está activo
 */
export function ModuleHide({ module, children }: { module: keyof TenantModules; children: ReactNode }) {
  const isActive = useModule(module);
  if (isActive) return null;
  return <>{children}</>;
}
