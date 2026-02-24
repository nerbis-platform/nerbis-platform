// src/app/(shop)/products/[id]/page.tsx

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProduct } from '@/lib/api/products';
import { canReview, createReview } from '@/lib/api/reviews'; 
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Image from 'next/image';
import { ReviewsList } from '@/components/reviews/ReviewsList';
import { ReviewForm } from '@/components/reviews/ReviewForm'; 
import { ShoppingCart, Minus, Plus, Check, X, ImageOff } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = parseInt(params.id as string);
  const [quantity, setQuantity] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [thumbnailErrors, setThumbnailErrors] = useState<Record<number, boolean>>({});
  const { addProduct } = useCart();
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
  });
  const { data: canReviewData } = useQuery({
    queryKey: ['can-review', 'product', productId],
    queryFn: () => canReview(productId, 'product'),
    enabled: isAuthenticated,
  });

  const queryClient = useQueryClient();

  const createReviewMutation = useMutation({
    mutationFn: (data: { rating: number; title?: string; comment: string; images?: File[] }) =>
      createReview({
        product_id: productId,
        ...data,
      }),
    onSuccess: () => {
      setShowReviewForm(false);
      toast.success('Gracias por tu opinión');
      queryClient.invalidateQueries({ queryKey: ['reviews', 'product', productId] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['can-review', 'product', productId] });
    },
    onError: () => {
      toast.error('Error al enviar tu opinión');
    },
  });

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      const productImage = product.main_image || product.images?.[0]?.image_url || product.images?.[0]?.image;
      await addProduct(product.id, quantity, {
        name: product.name,
        price: product.price,
        description: product.short_description || product.description,
        image: productImage,
      });
      toast.success(`${product.name} agregado al carrito`);
    } catch {
      toast.error('Error al agregar al carrito');
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const increaseQuantity = () => {
    if (product?.inventory?.track_inventory) {
      if (quantity < product.inventory.stock) {
        setQuantity(quantity + 1);
      }
    } else {
      setQuantity(quantity + 1);
    }
  };

  const handleThumbnailError = (index: number) => {
    setThumbnailErrors(prev => ({ ...prev, [index]: true }));
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="container py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-20" />
              <Skeleton className="h-12 w-1/2" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <main className="container py-8">
          <p>Producto no encontrado</p>
        </main>
        <Footer />
      </>
    );
  }

  const mainImage =
    product.images?.[selectedImage]?.image_url ||
    product.images?.[selectedImage]?.image;
  const hasDiscount = product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price);
  const inStock = !product.inventory?.track_inventory || (product.inventory?.stock ?? 0) > 0;

  return (
    <>
      <Header />
      <main className="container py-8">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Imágenes */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
              {mainImage && !imageError ? (
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageOff className="h-16 w-16 text-muted-foreground/50" />
                </div>
              )}
              {product.is_featured && (
                <Badge className="absolute top-4 right-4">Destacado</Badge>
              )}
              {hasDiscount && (
                <Badge variant="destructive" className="absolute top-4 left-4">
                  Oferta
                </Badge>
              )}
            </div>

            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => {
                      setSelectedImage(index);
                      setImageError(false);
                    }}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-colors bg-muted ${
                      selectedImage === index ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    {!thumbnailErrors[index] ? (
                      <Image
                        src={image.image_url || image.image}
                        alt={image.alt_text || product.name}
                        fill
                        className="object-cover"
                        onError={() => handleThumbnailError(index)}
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageOff className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información */}
          <div className="space-y-6">
            <div>
              <Badge variant="outline" className="mb-2">
                {typeof product.category === 'number' ? 'Categoría' : product.category.name}
              </Badge>
              <h1 className="text-4xl font-bold">{product.name}</h1>
            </div>

            {/* Precio */}
            <div className="flex items-center gap-4">
              <span className="text-4xl font-bold">{formatPrice(product.price)}</span>
              {hasDiscount && (
                <span className="text-2xl text-muted-foreground line-through">
                  {formatPrice(product.compare_at_price!)}
                </span>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              {inStock ? (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">En stock</span>
                  {product.inventory?.track_inventory && (
                    <span className="text-muted-foreground">
                      ({product.inventory.stock} disponibles)
                    </span>
                  )}
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-red-600" />
                  <span className="text-red-600 font-medium">Agotado</span>
                </>
              )}
            </div>

            {/* Descripción */}
            <div>
              <h2 className="font-semibold text-lg mb-2">Descripción</h2>
              <p className="text-muted-foreground">{product.description}</p>
            </div>

            {/* Cantidad */}
            {inStock && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="font-medium">Cantidad:</span>
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={increaseQuantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button size="lg" className="w-full" onClick={handleAddToCart}>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Agregar al Carrito
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs de Descripción y Reviews */}
        <Tabs defaultValue="description" className="mt-12">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="description">Descripción</TabsTrigger>
            <TabsTrigger value="reviews">
              Opiniones ({product.reviews_count || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <div className="prose max-w-none">
              <p className="text-muted-foreground whitespace-pre-line">
                {product.description}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-6">
              {/* Botón para escribir review */}
              {!showReviewForm && (
                <>
                  {!isAuthenticated ? (
                    <div>
                      <Button asChild>
                        <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>
                          Escribir una opinión
                        </Link>
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        Inicia sesión para dejar tu opinión
                      </p>
                    </div>
                  ) : canReviewData?.can_review ? (
                    <div>
                      <Button onClick={() => setShowReviewForm(true)}>
                        Escribir una opinión
                      </Button>
                      {canReviewData.has_purchased && (
                        <p className="text-sm text-green-600 mt-2">
                          ✓ Compraste este producto
                        </p>
                      )}
                    </div>
                  ) : canReviewData?.existing_review ? (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Ya dejaste una opinión para este producto
                      </p>
                    </div>
                  ) : null}
                </>
              )}

              {/* Formulario de review */}
              {showReviewForm && (
                <ReviewForm
                  itemId={productId}
                  itemType="product"
                  itemName={product.name}
                  onSubmit={async (data) => {
                    await createReviewMutation.mutateAsync(data);
                  }}
                  onCancel={() => setShowReviewForm(false)}
                />
              )}

              {/* Lista de reviews */}
              <ReviewsList
                itemId={productId}
                itemType="product"
                averageRating={parseFloat(product.average_rating || '0')}
                totalReviews={product.reviews_count || 0}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </>
  );
}