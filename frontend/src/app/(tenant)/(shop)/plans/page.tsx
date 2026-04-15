// src/app/(shop)/plans/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import type { SubscriptionCategory } from '@/types';

export default function PlansPage() {
  const [categories, setCategories] = useState<SubscriptionCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get<SubscriptionCategory[] | { results: SubscriptionCategory[] }>('/subscriptions/categories/');
        // Handle both paginated and non-paginated responses
        const data = Array.isArray(response.data) ? response.data : response.data.results || [];
        setCategories(data);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-auth-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando servicios...</p>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-primary/10 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <Package className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Próximamente</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Estamos preparando nuestros servicios especiales para ti.
            Mientras tanto, puedes explorar otras secciones de nuestra tienda.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button size="lg" variant="default">
                Volver al inicio
              </Button>
            </Link>
            <Link href="/products">
              <Button size="lg" variant="outline">
                Ver productos
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Nuestros Servicios</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Descubre nuestros planes y servicios diseñados para ti
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/plans/${category.slug}`}
            className="group block bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300"
          >
            {/* Image */}
            <div className="relative h-48 bg-muted overflow-hidden">
              {category.image ? (
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <Package className="h-20 w-20 text-primary/40" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                {category.plans_count > 0 && (
                  <span className="bg-primary/10 text-primary text-sm px-2 py-1 rounded">
                    {category.plans_count} {category.plans_count === 1 ? 'plan' : 'planes'}
                  </span>
                )}
              </div>

              {category.description && (
                <p className="text-muted-foreground mb-4 line-clamp-2">
                  {category.description}
                </p>
              )}

              <div className="flex items-center text-primary font-medium group-hover:gap-2 transition-all">
                Ver planes
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
