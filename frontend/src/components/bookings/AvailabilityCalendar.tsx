// src/components/bookings/AvailabilityCalendar.tsx

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAvailability } from '@/lib/api/bookings';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User } from 'lucide-react';
import type { AvailabilitySlot } from '@/types';

interface AvailabilityCalendarProps {
  serviceId: number;
  onSelectSlot: (slot: {
    staffMemberId: number;
    startDateTime: string;
    staffMemberName: string;
  }) => void;
}

export function AvailabilityCalendar({ serviceId, onSelectSlot }: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  const { data: slots, isLoading } = useQuery({
    queryKey: ['availability', serviceId, selectedDate],
    queryFn: () => {
      if (!selectedDate) return null;
      return getAvailability({
        service_id: serviceId,
        date: format(selectedDate, 'yyyy-MM-dd'),
      });
    },
    enabled: !!selectedDate,
  });

  const availableSlots = slots?.filter(slot => slot.is_available) || [];

  const handleSelectSlot = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    onSelectSlot({
      staffMemberId: slot.staff_member.id,
      startDateTime: slot.start_time,
      staffMemberName: slot.staff_member.full_name,
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Calendario */}
      <Card>
        <CardHeader>
          <CardTitle>Selecciona una fecha</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date() || date > new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
            locale={es}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {/* Horarios disponibles */}
      <Card>
        <CardHeader>
          <CardTitle>Horarios disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <p className="text-muted-foreground text-center py-8">
              Selecciona una fecha para ver los horarios
            </p>
          ) : isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : availableSlots.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay horarios disponibles para esta fecha
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {availableSlots.map((slot, index) => (
                <Button
                  key={index}
                  variant={selectedSlot === slot ? 'default' : 'outline'}
                  className="w-full justify-start h-auto py-3"
                  onClick={() => handleSelectSlot(slot)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={slot.staff_member.photo} />
                      <AvatarFallback>
                        {slot.staff_member.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">
                          {format(new Date(slot.start_time), 'HH:mm', { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{slot.staff_member.full_name}</span>
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}