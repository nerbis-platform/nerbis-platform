# backend/core/marketing_defaults.py
"""
Contenido por defecto para cada seccion del sitio de marketing de NERBIS.

Estos valores se usan como seed inicial via el management command
`seed_marketing_content`. Los textos fueron extraidos de los componentes
React en frontend/src/components/marketing/*.tsx.
"""

MARKETING_SECTION_DEFAULTS: list[dict] = [
    # ------------------------------------------------------------------
    # 0. Header
    # ------------------------------------------------------------------
    {
        "section_key": "header",
        "sort_order": 0,
        "content": {
            "nav_links": [
                {"label": "Producto", "href": "/producto"},
                {"label": "Industrias", "href": "/industrias"},
                {"label": "Precios", "href": "/precios"},
            ],
            "cta_text": "Empezar gratis",
            "cta_href": "/register",
            "login_text": "Ya tienes cuenta?",
            "login_href": "/login",
        },
    },
    # ------------------------------------------------------------------
    # 1. Hero
    # ------------------------------------------------------------------
    {
        "section_key": "hero",
        "sort_order": 1,
        "content": {
            "title_line1": "Hazlo real!",
            "title_line2": "Tu sitio web, creado por IA",
            "subtitle": "Solo cuentale tu idea a Pipe. El se encarga del resto.",
            "cta_text": "Empezar gratis",
            "cta_href": "/register",
            "cta_note": "Sin tarjeta de credito \u00b7 Listo en 30 segundos",
        },
    },
    # ------------------------------------------------------------------
    # 2. Problem / Solution
    # ------------------------------------------------------------------
    {
        "section_key": "problem_solution",
        "sort_order": 2,
        "content": {
            "eyebrow": "Por que NERBIS",
            "title": "Deja atras lo generico",
            "before_label": "Lo que haces hoy",
            "after_label": "Lo que haces con NERBIS",
            "comparisons": [
                {
                    "before": "Eliges un template generico",
                    "after": "Pipe, nuestra IA, genera tu sitio unico",
                },
                {
                    "before": "Pasas horas personalizando",
                    "after": "Listo en 30 segundos",
                },
                {
                    "before": "Necesitas 3 herramientas distintas",
                    "after": "Todo integrado: web + tienda + reservas",
                },
                {
                    "before": "Tu sitio se ve como mil otros",
                    "after": "Diseno personalizado por industria",
                },
            ],
        },
    },
    # ------------------------------------------------------------------
    # 3. How It Works
    # ------------------------------------------------------------------
    {
        "section_key": "how_it_works",
        "sort_order": 3,
        "content": {
            "eyebrow": "Asi de simple",
            "title": "Tres pasos. Cero friccion.",
            "steps": [
                {
                    "step_label": "Paso 1",
                    "title": "Registrate",
                    "description": "Solo necesitas tu nombre, industria y pais.",
                },
                {
                    "step_label": "Paso 2",
                    "title": "Pipe crea tu sitio",
                    "description": "Pipe, nuestro asistente de IA, genera todo en segundos.",
                },
                {
                    "step_label": "Paso 3",
                    "title": "Personaliza y publica",
                    "description": "Edita lo que quieras. O dejalo tal cual.",
                },
            ],
        },
    },
    # ------------------------------------------------------------------
    # 4. CTA Mid
    # ------------------------------------------------------------------
    {
        "section_key": "cta_mid",
        "sort_order": 4,
        "content": {
            "title": "Listo para empezar?",
            "subtitle": "Crea tu sitio en segundos. Sin tarjeta de credito.",
            "cta_text": "Empezar gratis",
            "cta_href": "/register",
        },
    },
    # ------------------------------------------------------------------
    # 5. Industries
    # ------------------------------------------------------------------
    {
        "section_key": "industries",
        "sort_order": 5,
        "content": {
            "eyebrow": "Verticales",
            "title": "Hecho para tu industria.",
            "subtitle": (
                "Cada sitio se genera con el contenido, estructura y "
                "diseno optimo para tu tipo de negocio."
            ),
            "industries": [
                {"name": "Belleza", "emoji": "\u2728"},
                {"name": "Restaurantes", "emoji": "\ud83c\udf7d\ufe0f"},
                {"name": "Salud", "emoji": "\ud83e\ude7a"},
                {"name": "Fitness", "emoji": "\ud83c\udfcb\ufe0f"},
                {"name": "Retail", "emoji": "\ud83d\udecd\ufe0f"},
                {"name": "Educacion", "emoji": "\ud83c\udf93"},
                {"name": "Fotografia", "emoji": "\ud83d\udcf7"},
                {"name": "Servicios", "emoji": "\ud83d\udd27"},
                {"name": "Automotriz", "emoji": "\ud83d\ude97"},
                {"name": "Inmobiliaria", "emoji": "\ud83c\udfe0"},
                {"name": "Arte", "emoji": "\ud83c\udfa8"},
                {"name": "Musica", "emoji": "\ud83c\udfb5"},
                {"name": "Clinicas", "emoji": "\ud83e\ude7a"},
                {"name": "Veterinaria", "emoji": "\ud83d\udc3e"},
                {"name": "Floristeria", "emoji": "\ud83c\udf3a"},
                {"name": "Legal", "emoji": "\u2696\ufe0f"},
                {"name": "Turismo", "emoji": "\u2708\ufe0f"},
                {"name": "Tecnologia", "emoji": "\ud83d\udcbb"},
            ],
            "more_label": "+7 mas",
        },
    },
    # ------------------------------------------------------------------
    # 6. FAQ
    # ------------------------------------------------------------------
    {
        "section_key": "faq",
        "sort_order": 6,
        "content": {
            "eyebrow": "FAQ",
            "title": "Preguntas frecuentes",
            "items": [
                {
                    "question": "Que es NERBIS?",
                    "answer": (
                        "NERBIS es una plataforma que utiliza inteligencia artificial "
                        "para crear tu negocio digital completo en segundos. Pipe, "
                        "nuestro asistente de IA, disena tu sitio web, configura tu "
                        "tienda online y prepara todo para que empieces a vender."
                    ),
                },
                {
                    "question": "Cuanto cuesta usar NERBIS?",
                    "answer": (
                        "NERBIS ofrece un plan gratuito para empezar. No necesitas "
                        "tarjeta de credito. Puedes crear tu tienda, personalizarla "
                        "y publicarla sin costo."
                    ),
                },
                {
                    "question": "Cuanto tiempo toma crear mi tienda?",
                    "answer": (
                        "Pipe genera tu sitio completo en aproximadamente 30 segundos. "
                        "Solo necesitas contarle sobre tu negocio y el se encarga del "
                        "diseno, contenido y configuracion."
                    ),
                },
                {
                    "question": "Necesito saber programar?",
                    "answer": (
                        "No. NERBIS esta disenado para emprendedores sin conocimientos "
                        "tecnicos. Pipe crea todo por ti, y el editor visual te permite "
                        "personalizar sin escribir codigo."
                    ),
                },
                {
                    "question": "Que industrias soporta NERBIS?",
                    "answer": (
                        "NERBIS soporta mas de 12 industrias incluyendo belleza y "
                        "bienestar, fitness, gastronomia, moda y retail, salud, "
                        "educacion y servicios profesionales."
                    ),
                },
                {
                    "question": "Puedo usar mi propio dominio?",
                    "answer": (
                        "Si. Puedes conectar tu dominio personalizado o usar un "
                        "subdominio gratuito tunegocio.nerbis.com."
                    ),
                },
                {
                    "question": "NERBIS incluye pasarela de pagos?",
                    "answer": (
                        "Si. NERBIS se integra con las principales pasarelas de pago "
                        "de Latinoamerica para que puedas cobrar desde el primer dia."
                    ),
                },
                {
                    "question": "Quien es Pipe?",
                    "answer": (
                        "Pipe es el asistente de inteligencia artificial de NERBIS. "
                        "Lleva el nombre en honor a Juan Felipe, familiar del fundador. "
                        "Pipe analiza tu negocio, disena tu sitio y te ayuda a crecer."
                    ),
                },
            ],
        },
    },
    # ------------------------------------------------------------------
    # 7. CTA Final
    # ------------------------------------------------------------------
    {
        "section_key": "cta_final",
        "sort_order": 7,
        "content": {
            "title_line1": "Tu negocio merece mas",
            "title_line2": "que un template.",
            "cta_text": "Empezar gratis",
            "cta_href": "/register",
            "note": "Sin tarjeta de credito. Sin compromisos.",
        },
    },
    # ------------------------------------------------------------------
    # 8. SEO (metadata de la pagina)
    # ------------------------------------------------------------------
    {
        "section_key": "seo",
        "sort_order": 8,
        "content": {
            "title": "NERBIS \u2014 Tu negocio online en 30 segundos",
            "description": (
                "NERBIS genera un sitio web profesional y personalizado para "
                "tu negocio con inteligencia artificial. Sin codigo. Sin "
                "templates genericos."
            ),
            "organization": {
                "name": "NERBIS",
                "url": "https://nerbis.com",
                "logo": "https://nerbis.com/icon.svg",
                "description": (
                    "Plataforma que crea tu negocio digital con inteligencia artificial"
                ),
                "social": [
                    "https://twitter.com/nerbisplatform",
                    "https://instagram.com/nerbisplatform",
                    "https://linkedin.com/company/nerbis",
                ],
            },
        },
    },
]
