// frontend/src/components/reviews/ReviewCard.tsx

'use client';

import { Review } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/common/StarRating';
import { formatDate } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface ReviewCardProps {
  review: Review;
  onHelpful?: (reviewId: number) => void;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const comment = review.comment || '';
  const shouldTruncate = comment.length > 300;

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar>
            <AvatarImage src={review.user_avatar} />
            <AvatarFallback>{review.user_name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">{review.user_name}</span>
              {review.is_verified_purchase && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Compra verificada
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-sm text-muted-foreground">
                {formatDate(review.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Title */}
        {review.title && (
          <h4 className="font-semibold text-lg mb-2">{review.title}</h4>
        )}

        {/* Comment */}
        <div className="mb-4">
          <p className="text-muted-foreground whitespace-pre-line">
            {shouldTruncate && !isExpanded
              ? `${comment.substring(0, 300)}...`
              : comment}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary text-sm mt-2 hover:underline"
            >
              {isExpanded ? 'Ver menos' : 'Ver más'}
            </button>
          )}
        </div>

        {/* Images */}
        {review.images && review.images.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {review.images.map((image) => (
              <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg">
                <Image
                  src={image.image}
                  alt="Review image"
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Business Response */}
        {review.business_response && (
          <div className="bg-muted p-4 rounded-lg mb-4">
            <p className="font-semibold text-sm mb-2">Respuesta del negocio:</p>
            <p className="text-sm text-muted-foreground">{review.business_response}</p>
            {review.business_response_at && (
              <p className="text-xs text-muted-foreground mt-2">
                {formatDate(review.business_response_at)}
              </p>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}