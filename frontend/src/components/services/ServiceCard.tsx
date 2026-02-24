// src/components/services/ServiceCard.tsx

import { Service } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { StarRating } from '@/components/common/StarRating';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-card rounded-2xl">
      {/* Imagen del servicio */}
      <div className="relative h-48 overflow-hidden">
        {service.image ? (
          <Image
            src={service.image}
            alt={service.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center">
            <Sparkles className="h-12 w-12 text-primary/30" />
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Category badge on image */}
        <div className="absolute bottom-3 left-3">
          <Badge className="bg-white/90 text-foreground backdrop-blur-sm shadow-sm">
            {service.category.name}
          </Badge>
        </div>

        {/* Featured badge */}
        {service.is_featured && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Destacado
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="relative p-5 pb-3">
        {/* Title */}
        <h3 className="font-bold text-lg mb-2 text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1">
          {service.name}
        </h3>

        {/* Rating */}
        {service.reviews_count > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={parseFloat(service.average_rating || '0')} size="sm" />
            <span className="text-sm text-muted-foreground">
              ({service.reviews_count})
            </span>
          </div>
        )}

        {/* Description */}
        <p className="text-muted-foreground mb-4 line-clamp-2 text-sm leading-relaxed">
          {service.short_description}
        </p>

        {/* Duration & Price row */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">{service.formatted_duration}</span>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-foreground">
              {formatPrice(service.price)}
            </span>
          </div>
        </div>

        {/* Staff */}
        {service.assigned_staff.length > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {service.assigned_staff.slice(0, 3).map((staff) => (
                  <Avatar
                    key={staff.id}
                    className="border-2 border-card w-8 h-8 ring-2 ring-background"
                  >
                    <AvatarImage src={staff.photo} alt={staff.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {staff.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {service.assigned_staff.length > 3 && (
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border-2 border-card ring-2 ring-background text-xs font-semibold text-primary">
                    +{service.assigned_staff.length - 3}
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {service.assigned_staff.length === 1
                  ? service.assigned_staff[0].full_name
                  : `${service.assigned_staff.length} profesionales`}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="relative p-5 pt-0">
        <Button
          className="w-full rounded-xl h-11 text-sm font-semibold group/btn shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
          asChild
        >
          <Link href={`/services/${service.id}/book`}>
            <Calendar className="mr-2 h-4 w-4" />
            Agendar Cita
            <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
