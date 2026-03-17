// src/app/(shop)/contact/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Mail,
  MapPin,
  Phone,
  Clock,
  MessageCircle,
  Send,
  Instagram,
  Facebook,
  Calendar,
  Sparkles,
  Heart
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Ponte en contacto con nosotros. Estamos aquí para ayudarte a lucir y sentirte mejor.',
};

export default function ContactPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const contactPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE;
  const contactAddress = process.env.NEXT_PUBLIC_CONTACT_ADDRESS;
  const mapsQuery = contactAddress ? encodeURIComponent(contactAddress) : '';
  const mapsHref = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`
    : '#';

  const contactMethods = [
    {
      icon: Phone,
      title: 'Llámanos',
      description: 'Estamos disponibles para atenderte',
      value: contactPhone,
      href: `tel:${contactPhone}`,
      action: 'Llamar ahora',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      description: 'Respuesta rápida por mensaje',
      value: contactPhone,
      href: `https://wa.me/${contactPhone?.replace(/\D/g, '')}`,
      action: 'Enviar mensaje',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: Mail,
      title: 'Email',
      description: 'Para consultas detalladas',
      value: contactEmail,
      href: `mailto:${contactEmail}`,
      action: 'Enviar email',
      color: 'text-gold',
      bgColor: 'bg-gold/10',
    },
    {
      icon: MapPin,
      title: 'Visítanos',
      description: 'Ven a conocernos',
      value: contactAddress,
      href: mapsHref,
      action: 'Ver ubicación',
      color: 'text-rose-400',
      bgColor: 'bg-rose-400/10',
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative py-20 md:py-28 overflow-hidden bg-linear-to-br from-primary/5 via-primary/10 to-background">
          {/* Decoración de fondo */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 right-10 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-rose-300/10 rounded-full blur-3xl" />
          </div>

          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Heart className="h-4 w-4 fill-current" />
                Estamos para ti
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Contáctanos
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
                ¿Tienes alguna pregunta o quieres agendar tu cita?
                Estamos aquí para ayudarte a lucir y sentirte mejor.
              </p>

              {/* CTA Rápido */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="gap-2">
                  <Link href="/services">
                    <Calendar className="h-5 w-5" />
                    Agendar Cita
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="gap-2">
                  <a href={`https://wa.me/${contactPhone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp Directo
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Métodos de Contacto */}
        <section className="py-16">
          <div className="container">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactMethods.map((method, index) => {
                const IconComponent = method.icon;
                return (
                  <Card
                    key={index}
                    className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <CardContent className="p-6 text-center">
                      <div className={`w-14 h-14 rounded-2xl ${method.bgColor} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className={`h-7 w-7 ${method.color}`} />
                      </div>

                      <h3 className="font-semibold text-lg text-foreground mb-1">
                        {method.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {method.description}
                      </p>

                      <a
                        href={method.href}
                        target={method.href.startsWith('http') ? '_blank' : undefined}
                        rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        {method.action}
                        <Send className="h-3 w-3" />
                      </a>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Formulario y Horarios */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-5">
              {/* Información lateral */}
              <div className="lg:col-span-2 space-y-8">
                {/* Horarios */}
                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="bg-linear-to-r from-primary to-rose-400 p-6 text-white">
                    <div className="flex items-center gap-3">
                      <Clock className="h-6 w-6" />
                      <h3 className="text-xl font-semibold">Horario de Atención</h3>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <ul className="space-y-3">
                      <li className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Lunes - Viernes</span>
                        <span className="font-medium">9:00 - 19:00</span>
                      </li>
                      <li className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Sábados</span>
                        <span className="font-medium">10:00 - 14:00</span>
                      </li>
                      <li className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground">Domingos</span>
                        <span className="font-medium text-rose-400">Cerrado</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Ubicación */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Nuestra Ubicación</h3>
                        <p className="text-muted-foreground mb-3">{contactAddress}</p>
                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        >
                          <MapPin className="h-4 w-4" />
                          Ver en Google Maps
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Redes Sociales */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4">Síguenos</h3>
                    <div className="flex gap-3">
                      <a
                        href="#"
                        className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                      <a
                        href="#"
                        className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        <Facebook className="h-5 w-5" />
                      </a>
                      <a
                        href={`https://wa.me/${contactPhone?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </a>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      Síguenos para ver nuestros trabajos, promociones y consejos de belleza.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Formulario */}
              <div className="lg:col-span-3">
                <Card className="border-0 shadow-xl">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Send className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold">Envíanos un mensaje</h2>
                        <p className="text-muted-foreground text-sm">Te responderemos lo antes posible</p>
                      </div>
                    </div>

                    <form
                      action={contactEmail ? `mailto:${contactEmail}` : '#'}
                      method="post"
                      encType="text/plain"
                      className="space-y-5"
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nombre completo</Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder="Tu nombre"
                            required
                            className="h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Teléfono</Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="Tu teléfono"
                            className="h-12"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="tu@email.com"
                          required
                          className="h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Asunto</Label>
                        <Input
                          id="subject"
                          name="subject"
                          placeholder="¿En qué podemos ayudarte?"
                          className="h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Mensaje</Label>
                        <Textarea
                          id="message"
                          name="message"
                          placeholder="Cuéntanos más sobre tu consulta..."
                          rows={5}
                          required
                          className="resize-none"
                        />
                      </div>

                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="privacy"
                          required
                          className="mt-1 rounded border-border"
                        />
                        <label htmlFor="privacy" className="text-sm text-muted-foreground">
                          Acepto la{' '}
                          <Link href="/privacy" className="text-primary hover:underline">
                            Política de Privacidad
                          </Link>{' '}
                          y{' '}
                          <Link href="/terms" className="text-primary hover:underline">
                            Términos y Condiciones
                          </Link>
                        </label>
                      </div>

                      <Button type="submit" size="lg" className="w-full gap-2">
                        <Send className="h-5 w-5" />
                        Enviar mensaje
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-16">
          <div className="container">
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="relative bg-linear-to-r from-primary via-rose-400 to-primary p-12 text-center text-white">
                {/* Decoración */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-1/4 w-32 h-32 bg-white rounded-full blur-2xl" />
                  <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-white rounded-full blur-2xl" />
                </div>

                <div className="relative z-10">
                  <Sparkles className="h-10 w-10 mx-auto mb-4 text-gold" />
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    ¿Lista para tu transformación?
                  </h2>
                  <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                    No esperes más para sentirte increíble. Agenda tu cita hoy y descubre
                    por qué somos la elección preferida para el cuidado personal.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" variant="secondary" asChild className="gap-2">
                      <Link href="/services">
                        <Calendar className="h-5 w-5" />
                        Agendar mi cita
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20">
                      <a href={`tel:${contactPhone}`}>
                        <Phone className="h-5 w-5" />
                        Llamar ahora
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
