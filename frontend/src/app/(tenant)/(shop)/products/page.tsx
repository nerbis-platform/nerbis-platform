// src/app/(shop)/products/page.tsx

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts, getProductCategories } from '@/lib/api/products';
import { ProductCard } from '@/components/products/ProductCard';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageGuard } from '@/components/common/PageGuard';
import { usePageContent } from '@/contexts/WebsiteContentContext';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const aiContent = usePageContent<{ title?: string; subtitle?: string }>('products');

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: getProductCategories,
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', selectedCategory, search, priceFilter],
    queryFn: () => getProducts({
      category: selectedCategory !== 'all' ? parseInt(selectedCategory) : undefined,
      search: search || undefined,
    }),
  });

  return (
    <PageGuard page="products">
      <Header />
      <main className="min-h-screen bg-background">
        <div className="bg-linear-to-br from-primary/10 to-background py-12">
          <div className="container">
            <h1 className="text-4xl font-bold mb-4">{aiContent?.title || 'Nuestros Productos'}</h1>
            <p className="text-muted-foreground text-lg">
              {aiContent?.subtitle || 'Descubre nuestra selección de productos premium para tu cuidado personal'}
            </p>
          </div>
        </div>

        <div className="container py-8">
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-50">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categoriesData?.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-full md:w-50">
                <SelectValue placeholder="Precio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los precios</SelectItem>
                <SelectItem value="0-25">Menos de €25</SelectItem>
                <SelectItem value="25-50">€25 - €50</SelectItem>
                <SelectItem value="50-100">€50 - €100</SelectItem>
                <SelectItem value="100+">Más de €100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Productos */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-100" />
              ))}
            </div>
          ) : productsData?.results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No se encontraron productos
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {productsData?.results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </PageGuard>
  );
}