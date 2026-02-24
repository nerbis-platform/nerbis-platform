// src/components/common/LocationSection.tsx

'use client';

import Link from 'next/link';
import { MapPin, Phone, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenantContact } from '@/contexts/TenantContext';

export function LocationSection() {
  const contact = useTenantContact();

  // Build address string from contact info
  const address = contact?.address || process.env.NEXT_PUBLIC_CONTACT_ADDRESS || 'Calle Principal 123, Madrid';
  const phone = contact?.phone || process.env.NEXT_PUBLIC_CONTACT_PHONE || '+34 912 345 678';
  const schedule = 'L-V 9:00-19:00 · Sáb 10:00-14:00';
  return (
    <section className="py-12 bg-muted/30">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Info compacta */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-3">
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span>{address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Phone className="h-4 w-4 text-primary shrink-0" />
              <a href={`tel:${phone}`} className="hover:text-primary transition-colors">
                {phone}
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <span>{schedule}</span>
            </div>
          </div>

          {/* CTA */}
          <Button variant="outline" asChild className="shrink-0 rounded-xl border-primary/30 hover:bg-primary/5">
            <Link href="/contact">
              Contactar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
