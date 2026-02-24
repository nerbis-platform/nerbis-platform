"""
Migración de datos: Actualiza templates y pregunta de onboarding.

1. Templates: services pasa de required=True a required=False en todos
2. Templates: se agrega sección "products" (required=False) a todos
3. Templates: about pasa a required=False
4. OnboardingQuestion: "Servicios / Productos" se reemplaza por "Servicios" y "Productos" separados
"""

from django.db import migrations


def update_templates_and_questions(apps, schema_editor):
    WebsiteTemplate = apps.get_model('websites', 'WebsiteTemplate')
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')

    # ─── 1. Actualizar structure_schema de todos los templates ───
    for template in WebsiteTemplate.objects.all():
        schema = template.structure_schema or {}
        sections = schema.get('sections', [])

        if not sections:
            continue

        updated = False
        has_products = any(s.get('id') == 'products' for s in sections)
        services_index = None

        for i, s in enumerate(sections):
            sid = s.get('id')

            # services: required → False
            if sid == 'services' and s.get('required', False):
                s['required'] = False
                services_index = i
                updated = True

            # about: required → False
            if sid == 'about' and s.get('required', False):
                s['required'] = False
                updated = True

        # Agregar products si no existe (justo después de services)
        if not has_products:
            products_section = {
                "id": "products",
                "name": "Productos",
                "required": False,
            }
            if services_index is not None:
                sections.insert(services_index + 1, products_section)
            else:
                # Insertar antes de contact
                contact_idx = next(
                    (i for i, s in enumerate(sections) if s.get('id') == 'contact'),
                    len(sections)
                )
                sections.insert(contact_idx, products_section)
            updated = True

        if updated:
            schema['sections'] = sections
            template.structure_schema = schema
            template.save(update_fields=['structure_schema'])

    templates_count = WebsiteTemplate.objects.count()
    print(f"  -> Actualizados {templates_count} templates (services optional, products agregado)")

    # ─── 2. Actualizar opciones del OnboardingQuestion ───
    try:
        question = OnboardingQuestion.objects.get(question_key='website_sections')
    except OnboardingQuestion.DoesNotExist:
        print("  -> Pregunta website_sections no encontrada, saltando")
        return

    options = question.options or []
    if 'Servicios / Productos' in options:
        # Reemplazar por dos opciones separadas
        idx = options.index('Servicios / Productos')
        options[idx:idx + 1] = ['Servicios', 'Productos']
        question.options = options
        question.save(update_fields=['options'])
        print(f"  -> Opciones actualizadas: {options}")
    else:
        print(f"  -> Opciones ya actualizadas o no encontrada la opción combinada: {options}")


def revert(apps, schema_editor):
    WebsiteTemplate = apps.get_model('websites', 'WebsiteTemplate')
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')

    # Revertir templates: quitar products, services→required
    for template in WebsiteTemplate.objects.all():
        schema = template.structure_schema or {}
        sections = schema.get('sections', [])
        sections = [s for s in sections if s.get('id') != 'products']
        for s in sections:
            if s.get('id') == 'services':
                s['required'] = True
            if s.get('id') == 'about':
                s['required'] = True
        schema['sections'] = sections
        template.structure_schema = schema
        template.save(update_fields=['structure_schema'])

    # Revertir question
    try:
        question = OnboardingQuestion.objects.get(question_key='website_sections')
        options = question.options or []
        new_options = []
        replaced = False
        for opt in options:
            if opt in ('Servicios', 'Productos') and not replaced:
                new_options.append('Servicios / Productos')
                replaced = True
            elif opt not in ('Servicios', 'Productos'):
                new_options.append(opt)
        question.options = new_options
        question.save(update_fields=['options'])
    except OnboardingQuestion.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('websites', '0008_add_pinterest_social_media'),
    ]

    operations = [
        migrations.RunPython(update_templates_and_questions, revert),
    ]
