// src/components/common/TeamSection.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { getStaff } from '@/lib/api/services';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Star } from 'lucide-react';

export function TeamSection() {
  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: getStaff,
  });

  // Filtrar solo staff destacado o disponible
  const featuredStaff = staff?.filter(s => s.is_featured || s.is_available).slice(0, 4);

  // No mostrar sección si no hay staff
  if (!isLoading && (!featuredStaff || featuredStaff.length === 0)) {
    return null;
  }

  return (
    <section className="py-16">
      <div className="container">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
            <Users className="h-4 w-4" />
            Nuestro Equipo
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Profesionales Expertos</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Conoce a nuestro equipo de especialistas certificados,
            dedicados a brindarte la mejor experiencia
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredStaff?.map((member) => (
              <Card
                key={member.id}
                className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-card rounded-2xl"
              >
                <CardContent className="p-0">
                  {/* Foto */}
                  <div className="relative h-56 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                    {member.photo ? (
                      <Avatar className="w-32 h-32 border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300">
                        <AvatarImage src={member.photo} alt={member.full_name} className="object-cover" />
                        <AvatarFallback className="text-3xl font-bold bg-primary text-primary-foreground">
                          {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                        <AvatarFallback className="text-3xl font-bold bg-primary text-primary-foreground">
                          {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* Badge destacado */}
                    {member.is_featured && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-amber-500 text-white shadow-lg flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Destacado
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5 text-center">
                    <h3 className="font-bold text-lg text-foreground mb-1">
                      {member.full_name}
                    </h3>
                    <p className="text-primary font-medium text-sm mb-3">
                      {member.position}
                    </p>

                    {/* Especialidades */}
                    {member.specialties && member.specialties.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {member.specialties.slice(0, 2).map((specialty) => (
                          <Badge
                            key={specialty.id}
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            {specialty.name}
                          </Badge>
                        ))}
                        {member.specialties.length > 2 && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            +{member.specialties.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Bio corta */}
                    {member.bio && (
                      <p className="text-muted-foreground text-sm mt-3 line-clamp-2">
                        {member.bio}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}