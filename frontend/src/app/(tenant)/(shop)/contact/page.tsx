// src/app/(tenant)/(shop)/contact/page.tsx

import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ContactPageContent } from './ContactPageContent';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Ponte en contacto con nosotros. Estamos aquí para ayudarte a lucir y sentirte mejor.',
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <ContactPageContent />
      </main>
      <Footer />
    </>
  );
}
