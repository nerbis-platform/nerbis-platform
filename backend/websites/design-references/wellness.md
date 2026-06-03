# Vertical Wellness / Belleza — Guia de Diseno

> **Documento fuente de verdad** para generar sitios premium de centros de estetica, spas, salones de belleza y wellness en NERBIS.
>
> Este documento guia: (a) el template `belleza-elegante` del backend, (b) el prompt del `ai_service`, (c) las queries de Unsplash, (d) las decisiones de diseno del frontend para este vertical.

---

## 1. Perfil del cliente objetivo

**Quien:** Centro de estetica / spa / salon de belleza pequeno o mediano (1-15 empleados) en Espana o LATAM.

**Caso de diseno de referencia:** Centro de Estetica GC (Pedrezuela, Madrid) — 13 servicios, 10 productos, duena con gusto validado por dusty rose. GC NO es cliente registrado, es persona de diseno.

**Que busca el cliente final del centro:**
- Confianza: este sitio se ve profesional o improvisado?
- Transformacion: que cambio tangible voy a obtener?
- Facilidad: puedo reservar sin llamar?

**Que NO busca:**
- Leer la historia completa del negocio antes de ver servicios.
- Navegacion compleja con 7 items en el menu.
- Stock photos genericas con sonrisas exageradas.

---

## 2. Paleta de colores — Dusty Rose Elegante

Paleta validada informalmente por persona real del sector. Es el **default** del vertical. Futuros clientes podran variar, pero esta es la base.

### Light mode

| Rol | Hex | Uso |
|---|---|---|
| `--primary` | `#D4A5A5` | CTA principal, enlaces, badges, acentos de marca |
| `--secondary` | `#F5E6E6` | Fondos suaves de tarjetas, badges secundarios |
| `--accent` (dorado) | `#D4AF37` | Detalles premium: iconos sparkle, bordes sutiles, separadores. **Usar con parsimonia** |
| `--background` | `#FBF9F7` | Fondo general (off-white calido, nunca blanco puro) |
| `--foreground` | `#3D3D3D` | Texto principal (nunca `#000`) |
| `--muted-foreground` | `#7A7A7A` | Texto secundario, meta-info |
| `--border` | `#E8E0DC` | Bordes sutiles |

### Dark mode

| Rol | Hex |
|---|---|
| `--primary` | `#E8B4B4` |
| `--background` | `#1A1517` |
| `--foreground` | `#F5F0ED` |

### Reglas de uso

- **CTA principal** siempre `--primary` solido (no gradiente multicolor).
- **Dorado (`#D4AF37`)** es acento de lujo, no color principal. Max 2-3 elementos por pantalla.
- **Evitar saturar:** maximo 1 gradient por seccion. No mezclar rosa + dorado + teal en el mismo componente.
- **Overlays sobre imagenes:** maximo 1 capa, opacidad <= 40%. Nunca apilar 3 gradientes sobre una foto.

---

## 3. Tipografia

| Uso | Fuente | Razon |
|---|---|---|
| Headings (h1-h4) | **Playfair Display** (serif) | Editorial, elegante, asociada a revistas de belleza |
| Body, UI, botones | **Inter** (sans-serif) | Legibilidad digital, neutral |
| Precios, numeros | Inter tabular | Alineacion precisa |

### Jerarquia

- `h1` Hero: 3.5rem-5rem, weight 600, letter-spacing tight
- `h2` Secciones: 2.5rem-3rem, weight 500
- `h3` Tarjetas: 1.5rem, weight 500
- Body: 1rem (16px), line-height 1.6

### Reglas

- **Nunca uppercase completo** en headings (grita). Excepcion: etiquetas cortas tipo "NUEVO" o "EXCLUSIVO" a 0.75rem.
- **Headings con pocas palabras** — si llega a 3 lineas, reescribir.
- **Mezclar serif + sans-serif en el mismo heading** solo si hay intencion clara (ej: "Tu piel, *renovada*" con la palabra final en serif italica).

---

## 4. Tono editorial por seccion

El tono **cambia segun la seccion**. No es uniforme. Esto es lo que separa un sitio premium de un template generico.

### Hero

**Objetivo:** Emocion + promesa tangible en 8 segundos.

- **Tono:** aspiracional pero concreto. Transformacion, no bienvenida.
- **Heading:** 4-8 palabras. Promesa especifica.
- **Subheading:** 1 frase, 15-25 palabras. Que hace y para quien.
- **CTA primaria:** verbo de accion concreto ("Reservar cita", "Ver servicios"). Nunca "Saber mas".

**Bien:**
> Piel renovada en 50 minutos
> Tratamientos faciales personalizados con productos naturales. Agenda online en Pedrezuela.
> [Reservar cita]

**Mal:**
> Tu belleza, nuestra pasion
> Bienvenido a nuestro centro de estetica donde ofrecemos experiencias unicas.
> [Saber mas]

### About

**Objetivo:** Credibilidad. Quien esta detras y por que confiar.

- **Tono:** humano, especifico. Nombres, anos, credenciales.
- **Evitar la historia corporativa abstracta.** Ir a los hechos.

**Bien:**
> Abrimos en 2018 en Pedrezuela. Somos tres esteticistas certificadas especializadas en tratamientos faciales y corporales. Usamos exclusivamente productos de Germaine de Capuccini y Mesoestetic.

**Mal:**
> Con mas de X anos de experiencia, somos un equipo apasionado por la belleza y el bienestar, comprometidos con ofrecer la mejor atencion personalizada a nuestros clientes.

### Services

**Objetivo:** Cada servicio debe comunicar **beneficio tangible + duracion + rango de precio**.

- **Titulo del servicio:** nombre claro (no inventado).
- **Descripcion:** que hace + resultado + duracion. 20-35 palabras.
- **Estructura recomendada:** "[Que es] con [tecnica/producto]. [Resultado]. [Duracion]."

**Bien:**
> **Limpieza facial profunda**
> Limpieza con vapor, extraccion manual y mascarilla purificante. Rostro luminoso y poros descongestionados. 60 minutos.

**Mal:**
> **Servicio 1**
> Descripcion del servicio que te encantara.

### Testimonials

**Objetivo:** Prueba social creible. Nombres reales, detalles especificos.

- Si no hay testimonios reales, **omitir la seccion** antes que inventar.
- Testimonios genericos ("Muy bueno, 100% recomendado") son peor que no tenerlos.
- Pedir detalles: que servicio, que cambio noto, cuanto tiempo.

**Bien:**
> "Hice el tratamiento de 5 sesiones para manchas del sol. A la tercera ya se notaba. Maria explica todo muy bien."
> — Laura M., cliente desde 2022

**Mal:**
> "Excelente servicio! Lo recomiendo 100%."
> — Cliente satisfecho

### Contact

**Objetivo:** Reducir friccion para reservar.

- CTA de WhatsApp + telefono directo + direccion con link a mapa.
- Horarios **concretos** (lunes a viernes 10:00-20:00, sabados 10:00-14:00).
- Formulario minimo: nombre, telefono, servicio de interes. Nada mas.

---

## 5. Lista de anti-cliches (bloqueantes)

El prompt IA debe **prohibir explicitamente** estas frases y patrones:

### Frases prohibidas

- "Tu belleza es importante para nosotros"
- "Tu belleza, nuestra pasion"
- "Bienvenido/a a nuestro centro"
- "Con mas de X anos de experiencia"
- "Somos especialistas en..."
- "La mejor opcion para ti"
- "Cuidado premium" / "servicio premium"
- "Experiencia unica"
- "Atencion personalizada" (todos dicen esto, no diferencia)
- "Ofrecemos bienestar" / "Brindamos bienestar"
- "Transformamos tu belleza"
- "Descubre la diferencia"
- "Te invitamos a conocer..."

### Patrones prohibidos

- CTA genericos: "Saber mas", "Descubre mas", "Conoce mas"
- Testimonios sin nombre real o sin detalle especifico
- Servicios sin duracion ni rango de precio
- Copy en mayusculas para enfasis (gritar)
- Emojis en copy del sitio del tenant
- Exclamaciones multiples ("Reserva ya!!")

---

## 6. Bloques recomendados para el vertical

Orden sugerido del home, de arriba a abajo. El prompt IA debe respetar este orden por defecto.

1. **Hero** — variante `split-image` o `fullwidth-image`. Imagen real del centro o tratamiento. CTA: "Reservar cita".
2. **Services grid** — 6-9 servicios con duracion y precio. Iconos sutiles (no stock 3D).
3. **Booking widget inline** — agenda embebida directamente en el home (critico para el vertical).
4. **About** — equipo con nombres reales, certificaciones, productos que usan.
5. **Gallery / Products** — si hay linea de productos o fotos reales del espacio/resultados.
6. **Testimonials** — solo si son reales. Si no, omitir.
7. **FAQ** — 4-6 preguntas reales (cancelacion, productos, pago, parking).
8. **Contact** — WhatsApp + telefono + mapa + horarios.

### Bloques a evitar en wellness

- Sliders automaticos con 10 fotos — lento y generico.
- Pricing table tipo SaaS con "Basico / Pro / Enterprise" — no encaja culturalmente.
- "Nuestros valores" con iconos abstractos — cliche.

---

## 7. Guia de imagenes (Unsplash)

### Queries recomendadas por seccion

| Seccion | Query base | Filtros |
|---|---|---|
| Hero | `spa treatment room natural light minimalist` | landscape, orientacion horizontal |
| About | `aesthetician professional portrait soft light` | landscape, evitar grupos tipo stock |
| Services (facial) | `facial treatment close up skincare` | landscape |
| Services (masaje) | `massage therapy stone hands calm` | landscape |
| Products | `skincare bottles flatlay natural` | square o landscape |
| Gallery | `minimalist spa interior plant wood` | variada |

### Criterios de calidad

- **Luz natural** siempre que sea posible. Evitar fotos con flash directo.
- **Composicion con espacio negativo** — permite overlay de texto sin saturar.
- **Evitar:**
  - Sonrisas exageradas tipo stock photo.
  - Modelos con maquillaje completo (el vertical es estetica, no maquillaje de editorial).
  - Colores saturados fuera de la paleta (rojos intensos, azules electricos).
  - Fondos con texto incrustado (brand de otro).

### Fallback

Si Unsplash no devuelve imagenes coherentes con la paleta, es mejor **dejar la seccion sin imagen** (fondo de color solido + copy) que meter una foto que choque con el tono.

---

## 8. Integracion con el producto

### Template backend (`belleza-elegante`)

El seed en `backend/websites/migrations/0004_seed_templates.py` debe reflejar:
- `primary_color: #D4A5A5` (no `#1C3B57`)
- `secondary_color: #F5E6E6`
- `font_heading: Playfair Display`
- `font_body: Inter`
- `ai_system_prompt`: reglas de este documento (anti-cliches + tono por seccion)

### Prompt IA (`ai_service.py`)

El prompt debe:
- Pasar paleta y tipografia como contexto (la IA debe saber que esta escribiendo para un sitio dusty rose + serif editorial).
- Incluir lista de anti-cliches como reglas negativas.
- Diferenciar tono por seccion (hero != about != services).
- Validar output: rechazar descripciones de servicio <20 palabras, rechazar presencia de frases prohibidas.

### Frontend (`globals.css`)

Ya esta alineado con dusty rose. Auditar componentes estaticos como `Hero.tsx` para que consuman `content_data` generado por IA en lugar de tener copy hardcoded.

---

## 9. Criterios de aceptacion

Un sitio generado para el vertical wellness se considera **premium** si cumple:

- [ ] Paleta dusty rose aplicada (primary, secondary, accent).
- [ ] Tipografia Playfair Display en headings + Inter en body.
- [ ] Hero con heading <= 8 palabras, CTA con verbo concreto.
- [ ] Servicios con duracion y descripcion >= 20 palabras cada uno.
- [ ] Ninguna frase de la lista de anti-cliches.
- [ ] Booking widget inline presente si el tenant activo reservas.
- [ ] Contact con WhatsApp, telefono, direccion, horarios concretos.
- [ ] Imagenes con luz natural, sin saturacion fuera de paleta.
- [ ] Dark mode coherente (no solo light mode).

Si un sitio generado falla >= 2 criterios, el prompt o el template deben corregirse.
