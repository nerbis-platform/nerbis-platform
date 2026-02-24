// src/components/products/ProductCard.tsx

'use client';

import { useState } from 'react';
import { Product } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, ImageOff } from 'lucide-react';
import { StarRating } from '@/components/common/StarRating';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const { addProduct } = useCart();
  const mainImage =
    product.main_image ||
    product.images?.[0]?.image_url ||
    product.images?.[0]?.image;
  const hasDiscount = product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price);

  const handleAddToCart = async () => {
    try {
      await addProduct(product.id, 1, {
        name: product.name,
        price: product.price,
        description: product.short_description || product.description,
        image: mainImage,
      });
      toast.success(`${product.name} agregado al carrito`);
    } catch {
      toast.error('Error al agregar al carrito');
    }
  };

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
      <Link href={`/products/${product.id}`}>
        <div className="relative aspect-square overflow-hidden bg-muted">
          {mainImage && !imageError ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageOff className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          {product.is_featured && (
            <Badge className="absolute top-2 right-2">Destacado</Badge>
          )}
          {hasDiscount && (
            <Badge variant="destructive" className="absolute top-2 left-2">
              Oferta
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        {product.reviews_count > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={parseFloat(product.average_rating || '0')} size="sm" />
            <span className="text-sm text-muted-foreground">
              ({product.reviews_count})
            </span>
          </div>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {product.short_description}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-2xl font-bold">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.compare_at_price!)}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button className="w-full" size="sm" onClick={handleAddToCart}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Agregar al Carrito
        </Button>
      </CardFooter>
    </Card>
  );
}