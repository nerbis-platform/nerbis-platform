// src/components/layout/PromoBanner.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getActiveBanners } from '@/lib/api/banners';

interface PromoBannerProps {
  position?: 'top' | 'bottom';
}

export function PromoBanner({ position = 'top' }: PromoBannerProps) {
  const [dismissedBanners, setDismissedBanners] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // Cargar banners cerrados desde localStorage
    const stored = localStorage.getItem('dismissedBanners');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Filtrar IDs que hayan expirado (más de 2 minutos)
        const now = Date.now();
        const valid = Object.entries(parsed)
          .filter(([, timestamp]) => now - (timestamp as number) < 2 * 60 * 1000)
          .map(([id]) => parseInt(id));
        setDismissedBanners(valid);
      } catch {
        setDismissedBanners([]);
      }
    }
  }, []);

  const { data: banners } = useQuery({
    queryKey: ['banners', position],
    queryFn: () => getActiveBanners(position),
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: mounted,
  });

  // Filtrar banners no cerrados
  const visibleBanners = banners?.filter(
    (banner) => !dismissedBanners.includes(banner.id)
  ) ?? [];

  // Rotación automática
  const goToNext = useCallback(() => {
    if (visibleBanners.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % visibleBanners.length);
    }
  }, [visibleBanners.length]);

  const goToPrev = useCallback(() => {
    if (visibleBanners.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + visibleBanners.length) % visibleBanners.length);
    }
  }, [visibleBanners.length]);

  // Obtener el intervalo de rotación del primer banner (mayor prioridad)
  const rotationInterval = visibleBanners[0]?.rotation_interval ?? 5000;

  useEffect(() => {
    if (visibleBanners.length <= 1 || isPaused) return;

    const interval = setInterval(goToNext, rotationInterval);
    return () => clearInterval(interval);
  }, [visibleBanners.length, isPaused, rotationInterval, goToNext]);

  // Reset index si se reduce el número de banners
  useEffect(() => {
    if (currentIndex >= visibleBanners.length && visibleBanners.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentIndex(0);
    }
  }, [visibleBanners.length, currentIndex]);

  const handleDismiss = (bannerId: number) => {
    setDismissedBanners((prev) => [...prev, bannerId]);
    // Guardar en localStorage con timestamp
    const stored = localStorage.getItem('dismissedBanners');
    const parsed = stored ? JSON.parse(stored) : {};
    parsed[bannerId] = Date.now();
    localStorage.setItem('dismissedBanners', JSON.stringify(parsed));
  };

  if (!mounted || !visibleBanners.length) {
    return null;
  }

  const banner = visibleBanners[currentIndex];
  const hasMultipleBanners = visibleBanners.length > 1;

  return (
    <div
      className="relative w-full transition-colors duration-300"
      style={{
        backgroundColor: banner.background_color,
        color: banner.text_color,
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="container flex items-center justify-center py-2 px-4 text-sm">
        {/* Botón anterior */}
        {hasMultipleBanners && (
          <button
            onClick={goToPrev}
            className="absolute left-2 p-1 rounded hover:bg-black/10 transition-colors"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Contenido del banner */}
        <div className="flex items-center gap-2 text-center px-8">
          <span dangerouslySetInnerHTML={{ __html: banner.message }} />
          {banner.link_url && (
            <Link
              href={banner.link_url}
              className="font-medium underline underline-offset-2 hover:no-underline"
              style={{ color: banner.text_color }}
            >
              {banner.link_text || 'Ver más'}
            </Link>
          )}
        </div>

        {/* Indicadores de puntos */}
        {hasMultipleBanners && (
          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-1">
            {visibleBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-opacity ${
                  idx === currentIndex ? 'opacity-100' : 'opacity-40'
                }`}
                style={{ backgroundColor: banner.text_color }}
                aria-label={`Ir al banner ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Botón siguiente */}
        {hasMultipleBanners && (
          <button
            onClick={goToNext}
            className="absolute right-8 p-1 rounded hover:bg-black/10 transition-colors"
            aria-label="Banner siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Botón cerrar */}
        {banner.is_dismissible && (
          <button
            onClick={() => handleDismiss(banner.id)}
            className="absolute right-2 p-1 rounded hover:bg-black/10 transition-colors"
            aria-label="Cerrar banner"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}