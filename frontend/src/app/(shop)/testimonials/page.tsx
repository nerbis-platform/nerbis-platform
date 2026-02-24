// src/app/(shop)/testimonials/page.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Review, PaginatedResponse } from '@/types';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { StarRating } from '@/components/common/StarRating';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareQuote, Star, Users, ThumbsUp } from 'lucide-react';
import { PageGuard } from '@/components/common/PageGuard';
import { usePageContent } from '@/contexts/WebsiteContentContext';

async function getAllReviews(): Promise<Review[]> {
  const { data } = await apiClient.get<PaginatedResponse<Review>>('/reviews/');
  return data.results;
}

export default function TestimonialsPage() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['all-reviews'],
    queryFn: getAllReviews,
  });
  const aiContent = usePageContent<{ title?: string; subtitle?: string }>('testimonials');

  const totalReviews = reviews?.length ?? 0;
  const averageRating = totalReviews > 0
    ? reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;
  const fiveStarCount = reviews?.filter(r => r.rating === 5).length ?? 0;

  return (
    <PageGuard page="testimonials">
      <Header />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative py-20 md:py-28 overflow-hidden bg-linear-to-br from-primary/5 via-primary/10 to-background">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 right-10 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-yellow-300/10 rounded-full blur-3xl" />
          </div>
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <MessageSquareQuote className="h-4 w-4" />
                Lo que dicen nuestros clientes
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                {aiContent?.title || 'Testimonios'}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {aiContent?.subtitle || 'Conoce las experiencias de quienes ya nos eligieron. Sus opiniones hablan por nosotros.'}
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        {totalReviews > 0 && (
          <section className="py-12 border-b">
            <div className="container">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                    <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Calificaci&oacute;n promedio</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="h-6 w-6 text-primary" />
                    <span className="text-3xl font-bold">{totalReviews}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Opiniones verificadas</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <ThumbsUp className="h-6 w-6 text-emerald-500" />
                    <span className="text-3xl font-bold">{fiveStarCount}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Calificaciones de 5 estrellas</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Reviews Grid */}
        <section className="py-16">
          <div className="container">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : totalReviews > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {reviews!.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <MessageSquareQuote className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
                <h2 className="text-2xl font-semibold mb-2">A&uacute;n no hay testimonios</h2>
                <p className="text-muted-foreground">
                  S&eacute; el primero en compartir tu experiencia con nosotros.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </PageGuard>
  );
}
