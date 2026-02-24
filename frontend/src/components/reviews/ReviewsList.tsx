// frontend/src/components/reviews/ReviewsList.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProductReviews, getServiceReviews, toggleReviewHelpful } from '@/lib/api/reviews';
import { ReviewCard } from './ReviewCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StarRating } from '@/components/common/StarRating';
import { Star } from 'lucide-react';

interface ReviewsListProps {
  itemId: number;
  itemType: 'product' | 'service';
  averageRating?: number;
  totalReviews?: number;
}

export function ReviewsList({ itemId, itemType, averageRating = 0, totalReviews = 0 }: ReviewsListProps) {
  const queryClient = useQueryClient();
  const [selectedRating, setSelectedRating] = useState<number | undefined>();

  const queryKey = ['reviews', itemType, itemId, selectedRating];
  const queryFn = itemType === 'product' 
    ? () => getProductReviews(itemId, selectedRating)
    : () => getServiceReviews(itemId, selectedRating);

  const { data: reviews, isLoading } = useQuery({
    queryKey,
    queryFn,
  });

  const toggleHelpfulMutation = useMutation({
    mutationFn: toggleReviewHelpful,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleHelpful = (reviewId: number) => {
    toggleHelpfulMutation.mutate(reviewId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-muted rounded-lg">
        <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-semibold mb-2">Aún no hay opiniones</p>
        <p className="text-muted-foreground">
          Sé el primero en compartir tu experiencia
        </p>
      </div>
    );
  }

  // Calcular distribución de ratings
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: (reviews.filter(r => r.rating === rating).length / reviews.length) * 100,
  }));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-muted rounded-lg p-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Average Rating */}
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">{averageRating.toFixed(1)}</div>
            <StarRating rating={averageRating} size="lg" showNumber={false} />
            <p className="text-muted-foreground mt-2">
              Basado en {totalReviews} opiniones
            </p>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <button
                key={rating}
                onClick={() => setSelectedRating(selectedRating === rating ? undefined : rating)}
                className="w-full flex items-center gap-2 hover:bg-background/50 rounded px-2 py-1 transition-colors"
              >
                <span className="text-sm w-12">{rating} ★</span>
                <div className="flex-1 bg-background rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={selectedRating?.toString() || 'all'} onValueChange={(value) => setSelectedRating(value === 'all' ? undefined : parseInt(value))}>
        <TabsList>
          <TabsTrigger value="all">Todas ({totalReviews})</TabsTrigger>
          {[5, 4, 3, 2, 1].map(rating => {
            const count = reviews.filter(r => r.rating === rating).length;
            if (count === 0) return null;
            return (
              <TabsTrigger key={rating} value={rating.toString()}>
                {rating} ★ ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onHelpful={handleHelpful}
          />
        ))}
      </div>
    </div>
  );
}