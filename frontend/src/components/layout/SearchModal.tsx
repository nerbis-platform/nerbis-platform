// src/components/layout/SearchModal.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Package, Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '@/lib/api/products';
import { getServices } from '@/lib/api/services';
import Link from 'next/link';
import Image from 'next/image';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();

  // Reset query when modal closes
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
    }
  }, [open]);

  // Search products
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['search-products', debouncedQuery],
    queryFn: () => getProducts({ search: debouncedQuery, page_size: 5 }),
    enabled: debouncedQuery.length >= 2,
  });

  // Search services
  const { data: servicesData, isLoading: loadingServices } = useQuery({
    queryKey: ['search-services', debouncedQuery],
    queryFn: () => getServices({ search: debouncedQuery, page_size: 5 }),
    enabled: debouncedQuery.length >= 2,
  });

  const isLoading = loadingProducts || loadingServices;
  const hasResults = (productsData?.results?.length ?? 0) > 0 || (servicesData?.results?.length ?? 0) > 0;
  const showResults = debouncedQuery.length >= 2;

  const handleSelect = useCallback((href: string) => {
    onOpenChange(false);
    router.push(href);
  }, [onOpenChange, router]);

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Buscar</DialogTitle>
        </VisuallyHidden>
        {/* Search Input */}
        <div className="flex items-center border-b px-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            placeholder="Buscar productos, servicios, academia..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-14 text-base"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {!showResults ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Escribe al menos 2 caracteres para buscar</p>
              <p className="text-xs mt-2">
                Tip: Usa <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘K</kbd> para abrir la búsqueda
              </p>
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Buscando...</p>
            </div>
          ) : !hasResults ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No se encontraron resultados para &quot;{debouncedQuery}&quot;</p>
            </div>
          ) : (
            <div className="py-2">
              {/* Products */}
              {productsData?.results && productsData.results.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" />
                    Productos
                  </div>
                  {productsData.results.map((product) => (
                    <button
                      key={`product-${product.id}`}
                      onClick={() => handleSelect(`/products/${product.slug}`)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors text-left"
                    >
                      {product.main_image || product.images?.[0] ? (
                        <Image
                          src={
                            product.main_image ||
                            product.images?.[0]?.image_url ||
                            product.images?.[0]?.image ||
                            '/placeholder.png'
                          }
                          alt={product.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">${product.price}</p>
                      </div>
                    </button>
                  ))}
                  {productsData.count > 5 && (
                    <Link
                      href={`/products?search=${encodeURIComponent(debouncedQuery)}`}
                      onClick={() => onOpenChange(false)}
                      className="block px-4 py-2 text-sm text-primary hover:underline"
                    >
                      Ver todos los productos ({productsData.count})
                    </Link>
                  )}
                </div>
              )}

              {/* Services */}
              {servicesData?.results && servicesData.results.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Servicios
                  </div>
                  {servicesData.results.map((service) => (
                    <button
                      key={`service-${service.id}`}
                      onClick={() => handleSelect(`/services/${service.slug}`)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors text-left"
                    >
                      <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.formatted_duration} · ${service.price}
                        </p>
                      </div>
                    </button>
                  ))}
                  {servicesData.count > 5 && (
                    <Link
                      href={`/services?search=${encodeURIComponent(debouncedQuery)}`}
                      onClick={() => onOpenChange(false)}
                      className="block px-4 py-2 text-sm text-primary hover:underline"
                    >
                      Ver todos los servicios ({servicesData.count})
                    </Link>
                  )}
                </div>
              )}

              {/* Academia placeholder - para cuando tengas el módulo */}
              {/*
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Academia
                </div>
              </div>
              */}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd> seleccionar
            <kbd className="px-1.5 py-0.5 bg-muted rounded ml-2">↑↓</kbd> navegar
            <kbd className="px-1.5 py-0.5 bg-muted rounded ml-2">esc</kbd> cerrar
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
