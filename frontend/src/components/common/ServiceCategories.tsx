// src/components/common/ServiceCategories.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { getServiceCategories } from '@/lib/api/services';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Layers } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { ServiceCategory } from '@/types';

// Mapeo de nombres de iconos a componentes
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'sparkles': LucideIcons.Sparkles,
  'heart': LucideIcons.Heart,
  'scissors': LucideIcons.Scissors,
  'droplet': LucideIcons.Droplet,
  'sun': LucideIcons.Sun,
  'moon': LucideIcons.Moon,
  'star': LucideIcons.Star,
  'flower': LucideIcons.Flower2,
  'leaf': LucideIcons.Leaf,
  'gem': LucideIcons.Gem,
  'palette': LucideIcons.Palette,
  'eye': LucideIcons.Eye,
  'smile': LucideIcons.Smile,
  'hand': LucideIcons.Hand,
  'body': LucideIcons.User,
  'face': LucideIcons.CircleUser,
  'hair': LucideIcons.Scissors,
  'nail': LucideIcons.Paintbrush,
  'massage': LucideIcons.Hand,
  'spa': LucideIcons.Waves,
  'default': LucideIcons.Sparkles,
};

function getCategoryIcon(iconName?: string) {
  if (!iconName) return iconMap.default;
  const normalizedName = iconName.toLowerCase().replace(/[^a-z]/g, '');
  return iconMap[normalizedName] || iconMap.default;
}

function CategoryCard({ category }: { category: ServiceCategory }) {
  const IconComponent = getCategoryIcon(category.icon);

  return (
    <Link
      href={`/services?category=${category.id}`}
      className="group shrink-0 w-56"
    >
      <div className="h-full overflow-hidden border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 bg-card rounded-2xl group-hover:border-primary/30">
        {/* Imagen o gradiente con icono */}
        <div className="relative h-28 overflow-hidden">
          {category.image ? (
            <>
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                unoptimized
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-primary/30 via-primary/20 to-primary/10 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                {/* eslint-disable-next-line react-hooks/static-components -- stable module-level icon refs */}
                <IconComponent className="h-7 w-7 text-primary" />
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-sm">
            {category.name}
          </h3>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-muted-foreground">
              {category.services_count} servicio{category.services_count !== 1 ? 's' : ''}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ServiceCategories() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: getServiceCategories,
  });

  if (!isLoading && (!categories || categories.length === 0)) {
    return null;
  }

  return (
    <section className="py-16">
      <div className="container mb-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
            <Layers className="h-4 w-4" />
            Explora
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Categorías de Servicios</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Descubre nuestra amplia gama de tratamientos organizados por categoría
          </p>
        </div>
      </div>

      <div className="container">
        {isLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-44 w-48 rounded-2xl shrink-0" />
            ))}
          </div>
        ) : (
          <div className="marquee-container relative overflow-hidden">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-linear-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-linear-to-l from-background to-transparent z-10 pointer-events-none" />

            {/* Marquee track */}
            <div className="marquee-track flex gap-5 hover:cursor-grab active:cursor-grabbing">
              {/* First set */}
              {categories?.map((category) => (
                <CategoryCard key={`a-${category.id}`} category={category} />
              ))}
              {/* Duplicate for seamless loop */}
              {categories?.map((category) => (
                <CategoryCard key={`b-${category.id}`} category={category} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
