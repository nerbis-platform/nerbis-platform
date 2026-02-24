# backend/core/widgets.py

import json
from django import forms
from django.utils.safestring import mark_safe
from unfold.widgets import UnfoldAdminSelectWidget

from .geography import GEOGRAPHY_DATA


class SimpleFileWidget(forms.ClearableFileInput):
    """
    Widget simple para archivos que muestra solo el nombre del archivo
    de forma amigable, sin rutas técnicas.

    Ejemplo: .../logos/mi_logo.png
    """

    def render(self, name, value, attrs=None, renderer=None):
        html_parts = []

        if value and hasattr(value, 'name') and value.name:
            # Extraer solo el nombre del archivo de la ruta
            import os
            filename = os.path.basename(value.name)
            # Obtener la carpeta padre para contexto
            parent = os.path.basename(os.path.dirname(value.name))
            display_path = f".../{parent}/{filename}" if parent else filename

            html_parts.append(
                f'<div style="margin-bottom: 10px;">'
                f'<span style="color: #374151; font-size: 14px;">Actual: </span>'
                f'<a href="{value.url}" target="_blank" style="color: #2563eb; text-decoration: none;">'
                f'{display_path}'
                f'</a>'
                f'</div>'
            )

            # Checkbox para limpiar
            checkbox_name = f'{name}-clear'
            checkbox_id = f'{name}-clear_id'
            html_parts.append(
                f'<div style="margin-bottom: 10px;">'
                f'<label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">'
                f'<input type="checkbox" name="{checkbox_name}" id="{checkbox_id}">'
                f'<span style="color: #6b7280; font-size: 13px;">Eliminar</span>'
                f'</label>'
                f'</div>'
            )

        # Input para nuevo archivo
        if attrs is None:
            attrs = {}
        attrs['style'] = 'font-size: 14px;'

        file_input = forms.FileInput().render(name, None, attrs)
        html_parts.append(file_input)

        return mark_safe(''.join(html_parts))


class ImagePreviewWidget(forms.ClearableFileInput):
    """
    Widget personalizado para campos de imagen que muestra:
    - Preview de la imagen actual
    - Botón para eliminar la imagen inmediatamente (AJAX)
    - Input para subir nueva imagen con preview en tiempo real
    """

    def __init__(self, attrs=None):
        default_attrs = {'accept': 'image/*'}
        if attrs:
            default_attrs.update(attrs)
        super().__init__(attrs=default_attrs)

    def render(self, name, value, attrs=None, renderer=None):
        """Renderizar el widget con preview de imagen y botón de eliminar"""
        html = []

        # ID único para este widget (reemplazar puntos por guiones)
        widget_id = f'image-widget-{name}'.replace('.', '-').replace('_', '-')
        func_name = f'deleteImage_{name}'.replace('.', '_').replace('-', '_')
        preview_func = f'previewImage_{name}'.replace('.', '_').replace('-', '_')
        input_id = f'{name}_id'.replace('.', '_').replace('-', '_')

        # Si hay imagen actual, mostrar preview con botones en línea
        if value and hasattr(value, 'url'):
            html.append(
                f'<div id="{widget_id}" style="margin-bottom: 15px;">'
                f'<div id="{widget_id}-container" style="display: inline-flex; flex-direction: column; align-items: flex-start; gap: 8px;">'
                f'<img src="{value.url}" id="{widget_id}-img" style="max-width: 200px; max-height: 200px; '
                f'border-radius: 8px; border: 1px solid #e5e7eb; object-fit: cover; cursor: pointer;" '
                f'onclick="window.open(\'{value.url}\', \'_blank\')" title="Clic para ver imagen completa" />'
                # Fila de botones
                f'<div style="display: flex; align-items: center; gap: 8px;">'
            )

            # Estilos CSS para tooltips instantáneos
            html.append(f'''
                <style>
                .img-btn-tooltip {{
                    position: relative;
                }}
                .img-btn-tooltip::after {{
                    content: attr(data-tooltip);
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 4px 8px;
                    background: #1f2937;
                    color: white;
                    font-size: 11px;
                    border-radius: 4px;
                    white-space: nowrap;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.15s, visibility 0.15s;
                    margin-bottom: 6px;
                    pointer-events: none;
                    z-index: 100;
                }}
                .img-btn-tooltip:hover::after {{
                    opacity: 1;
                    visibility: visible;
                }}
                </style>
            ''')

            # Botón para eliminar (solo icono)
            html.append(
                f'<button type="button" id="{widget_id}-delete-btn" '
                f'class="img-btn-tooltip" '
                f'data-tooltip="Eliminar imagen" '
                f'onclick="{func_name}()" '
                f'style="display: inline-flex; align-items: center; justify-content: center; '
                f'cursor: pointer; padding: 6px 10px; background: #dc2626; '
                f'border: none; border-radius: 6px; color: white; '
                f'transition: background 0.2s;"'
                f'onmouseover="this.style.background=\'#b91c1c\'" '
                f'onmouseout="this.style.background=\'#dc2626\'">'
                f'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                f'<polyline points="3 6 5 6 21 6"></polyline>'
                f'<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>'
                f'</svg>'
                f'</button>'
            )

            # Botón para cambiar imagen (en la misma línea)
            html.append(
                f'<label for="{input_id}" id="{widget_id}-change-btn" '
                f'class="img-btn-tooltip" '
                f'data-tooltip="Cambiar imagen" '
                f'style="display: inline-flex; align-items: center; justify-content: center; '
                f'cursor: pointer; padding: 6px 10px; background: #6b7280; '
                f'border: none; border-radius: 6px; color: white; '
                f'transition: background 0.2s;"'
                f'onmouseover="this.style.background=\'#4b5563\'" '
                f'onmouseout="this.style.background=\'#6b7280\'">'
                f'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                f'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>'
                f'<polyline points="17 8 12 3 7 8"></polyline>'
                f'<line x1="12" y1="3" x2="12" y2="15"></line>'
                f'</svg>'
                f'</label>'
            )

            html.append('</div>')  # Cierra fila de botones
            html.append('</div>')  # Cierra container

            # Mensaje de éxito (oculto inicialmente)
            html.append(
                f'<div id="{widget_id}-success" style="display: none; padding: 10px; '
                f'background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 6px; '
                f'color: #065f46; margin-top: 10px;">'
                f'Imagen eliminada correctamente'
                f'</div>'
            )

            html.append('</div>')

            # JavaScript para eliminar la imagen
            html.append(f'''
<script>
function {func_name}() {{
    if (!confirm('¿Estás seguro de que deseas eliminar esta imagen? Esta acción no se puede deshacer.')) {{
        return;
    }}

    var btn = document.getElementById('{widget_id}-delete-btn');
    var originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'wait';

    // Obtener el CSRF token
    var csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Hacer la petición AJAX
    fetch('/admin/delete-image/', {{
        method: 'POST',
        headers: {{
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        }},
        body: JSON.stringify({{
            field_name: '{name}',
            model_name: getModelNameFor{func_name}(),
            object_id: getObjectIdFor{func_name}()
        }})
    }})
    .then(response => response.json())
    .then(data => {{
        if (data.success) {{
            // Ocultar la imagen y mostrar mensaje de éxito
            document.getElementById('{widget_id}-container').style.display = 'none';
            document.getElementById('{widget_id}-success').style.display = 'block';
        }} else {{
            alert('Error al eliminar: ' + (data.error || 'Error desconocido'));
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }}
    }})
    .catch(error => {{
        alert('Error de conexión: ' + error);
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    }});
}}

function getModelNameFor{func_name}() {{
    var path = window.location.pathname;
    var parts = path.split('/').filter(function(p) {{ return p.length > 0; }});
    for (var i = 0; i < parts.length; i++) {{
        if (parts[i] === 'admin' && parts[i+1] && parts[i+2]) {{
            return parts[i+1] + '.' + parts[i+2];
        }}
    }}
    return '';
}}

function getObjectIdFor{func_name}() {{
    var path = window.location.pathname;
    var parts = path.split('/').filter(function(p) {{ return p.length > 0; }});
    for (var i = 0; i < parts.length; i++) {{
        if (/^\\d+$/.test(parts[i])) {{
            return parts[i];
        }}
    }}
    return '';
}}
</script>
''')

            # Input file oculto (dentro del contenedor para que el label funcione)
            if attrs is None:
                attrs = {}
            attrs['id'] = input_id
            attrs['style'] = 'display: none;'
            attrs['onchange'] = f'{preview_func}(this)'
            file_input = forms.FileInput().render(name, None, attrs)
            html.append(file_input)

            # Preview de nueva imagen (oculto inicialmente, reemplaza imagen actual)
            html.append(
                f'<div id="{widget_id}-new-preview" style="display: none; margin-top: 12px;">'
                f'<div style="display: inline-flex; flex-direction: column; align-items: flex-start; gap: 6px;">'
                f'<img id="{widget_id}-new-img" src="" style="max-width: 200px; max-height: 200px; '
                f'border-radius: 8px; border: 2px solid #10b981; object-fit: cover;" />'
                f'<button type="button" onclick="clearNewImage{preview_func}()" '
                f'title="Cancelar" '
                f'style="display: inline-flex; align-items: center; justify-content: center; '
                f'cursor: pointer; padding: 4px 8px; background: #6b7280; '
                f'border: none; border-radius: 4px; color: white; font-size: 11px; '
                f'transition: background 0.2s;" '
                f'onmouseover="this.style.background=\'#4b5563\'" '
                f'onmouseout="this.style.background=\'#6b7280\'">'
                f'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">'
                f'<line x1="18" y1="6" x2="6" y2="18"></line>'
                f'<line x1="6" y1="6" x2="18" y2="18"></line>'
                f'</svg>'
                f'Cancelar'
                f'</button>'
                f'</div>'
                f'</div>'
            )

        else:
            # Sin imagen existente: solo mostrar botón de seleccionar
            html.append('<div>')

            # Input file oculto
            if attrs is None:
                attrs = {}
            attrs['id'] = input_id
            attrs['style'] = 'display: none;'
            attrs['onchange'] = f'{preview_func}(this)'
            file_input = forms.FileInput().render(name, None, attrs)

            # Preview de nueva imagen (oculto inicialmente)
            html.append(
                f'<div id="{widget_id}-new-preview" style="display: none; margin-bottom: 12px;">'
                f'<div style="display: inline-flex; flex-direction: column; align-items: flex-start; gap: 6px;">'
                f'<img id="{widget_id}-new-img" src="" style="max-width: 200px; max-height: 200px; '
                f'border-radius: 8px; border: 2px solid #10b981; object-fit: cover;" />'
                f'<button type="button" onclick="clearNewImage{preview_func}()" '
                f'title="Cancelar" '
                f'style="display: inline-flex; align-items: center; justify-content: center; '
                f'cursor: pointer; padding: 4px 8px; background: #6b7280; '
                f'border: none; border-radius: 4px; color: white; font-size: 11px; '
                f'transition: background 0.2s;" '
                f'onmouseover="this.style.background=\'#4b5563\'" '
                f'onmouseout="this.style.background=\'#6b7280\'">'
                f'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">'
                f'<line x1="18" y1="6" x2="6" y2="18"></line>'
                f'<line x1="6" y1="6" x2="18" y2="18"></line>'
                f'</svg>'
                f'Cancelar'
                f'</button>'
                f'</div>'
                f'</div>'
            )

            # Área de seleccionar imagen
            html.append(f'<div id="{widget_id}-input-container">')
            html.append(
                f'<label for="{input_id}" style="display: inline-flex; align-items: center; gap: 8px; '
                f'padding: 10px 16px; border: 1px dashed #d1d5db; border-radius: 8px; '
                f'cursor: pointer; background: #f9fafb; transition: all 0.2s; font-size: 13px; color: #6b7280;" '
                f'onmouseover="this.style.borderColor=\'#9ca3af\'; this.style.background=\'#f3f4f6\';" '
                f'onmouseout="this.style.borderColor=\'#d1d5db\'; this.style.background=\'#f9fafb\';">'
                f'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                f'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>'
                f'<polyline points="17 8 12 3 7 8"></polyline>'
                f'<line x1="12" y1="3" x2="12" y2="15"></line>'
                f'</svg>'
                f'Seleccionar imagen'
                f'</label>'
            )
            html.append(file_input)
            html.append('</div>')
            html.append('</div>')

        # JavaScript para preview de nueva imagen
        html.append(f'''
<script>
function {preview_func}(input) {{
    var previewContainer = document.getElementById('{widget_id}-new-preview');
    var previewImg = document.getElementById('{widget_id}-new-img');
    var currentContainer = document.getElementById('{widget_id}-container');
    var inputContainer = document.getElementById('{widget_id}-input-container');

    if (input.files && input.files[0]) {{
        var file = input.files[0];

        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {{
            alert('Por favor selecciona un archivo de imagen válido');
            input.value = '';
            return;
        }}

        var reader = new FileReader();
        reader.onload = function(e) {{
            previewImg.src = e.target.result;
            previewContainer.style.display = 'block';
            // Ocultar imagen actual si existe
            if (currentContainer) currentContainer.style.display = 'none';
            // Ocultar input container si existe (sin imagen previa)
            if (inputContainer) inputContainer.style.display = 'none';
        }};
        reader.readAsDataURL(file);
    }} else {{
        previewContainer.style.display = 'none';
        if (currentContainer) currentContainer.style.display = 'flex';
        if (inputContainer) inputContainer.style.display = 'block';
    }}
}}

function clearNewImage{preview_func}() {{
    var input = document.getElementById('{input_id}');
    var previewContainer = document.getElementById('{widget_id}-new-preview');
    var currentContainer = document.getElementById('{widget_id}-container');
    var inputContainer = document.getElementById('{widget_id}-input-container');

    input.value = '';
    previewContainer.style.display = 'none';
    // Mostrar imagen actual si existe
    if (currentContainer) currentContainer.style.display = 'flex';
    // Mostrar input container si existe (sin imagen previa)
    if (inputContainer) inputContainer.style.display = 'block';
}}
</script>
''')

        return mark_safe(''.join(html))


class GeographyCascadeWidget(UnfoldAdminSelectWidget):
    """
    Widget que inyecta JavaScript para manejar dropdowns en cascada:
    País → Estado/Departamento → Ciudad

    Hereda de UnfoldAdminSelectWidget para mantener el mismo estilo
    que los otros campos Select del admin (timezone, currency, etc.)
    """

    def __init__(self, attrs=None, choices=(), field_type='country'):
        """
        field_type: 'country', 'state', o 'city'
        """
        self.field_type = field_type
        super().__init__(attrs=attrs, choices=choices)

    def render(self, name, value, attrs=None, renderer=None):
        # Render normal del select
        html = super().render(name, value, attrs, renderer)

        # Solo agregar el script una vez (en el campo country)
        if self.field_type == 'country':
            # Convertir datos geográficos a JSON
            geography_json = json.dumps(GEOGRAPHY_DATA, ensure_ascii=False)

            cascade_script = f'''
<script>
(function() {{
    // Datos geográficos
    var GEOGRAPHY_DATA = {geography_json};

    // Función para encontrar campos por nombre (más flexible)
    function findField(name) {{
        // Intentar múltiples selectores
        var field = document.getElementById('id_' + name);
        if (field) return field;

        field = document.querySelector('select[name="' + name + '"]');
        if (field) return field;

        field = document.querySelector('[name="' + name + '"]');
        if (field) return field;

        return null;
    }}

    // Esperar a que el DOM esté listo
    function initWhenReady() {{
        if (document.readyState === 'complete' || document.readyState === 'interactive') {{
            setTimeout(initGeographyCascade, 300);
        }} else {{
            document.addEventListener('DOMContentLoaded', function() {{
                setTimeout(initGeographyCascade, 300);
            }});
        }}
    }}

    function initGeographyCascade() {{
        var countrySelect = findField('country');
        var stateSelect = findField('state');
        var citySelect = findField('city');

        if (!countrySelect) {{
            console.warn('Geography cascade: campo country no encontrado');
            return;
        }}
        if (!stateSelect) {{
            console.warn('Geography cascade: campo state no encontrado');
            return;
        }}
        if (!citySelect) {{
            console.warn('Geography cascade: campo city no encontrado');
            return;
        }}

        console.log('Geography cascade: campos encontrados', {{
            country: countrySelect.id || countrySelect.name,
            state: stateSelect.id || stateSelect.name,
            city: citySelect.id || citySelect.name
        }});

        // Capturar valores iniciales de Django ANTES de cualquier modificación
        // Estos son los valores guardados en la base de datos
        var initialState = stateSelect.value || '';
        var initialCity = citySelect.value || '';
        var isFirstRender = true;

        console.log('Geography cascade: valores iniciales de Django:', {{
            state: initialState,
            city: initialCity
        }});

        // Función para actualizar estados
        function updateStates(userChanged) {{
            var country = countrySelect.value;
            var states = GEOGRAPHY_DATA[country] ? Object.keys(GEOGRAPHY_DATA[country]).sort() : [];

            // En el primer render, preservar el valor de Django
            // Si el usuario cambió el país, resetear a vacío
            var valueToSelect = isFirstRender ? initialState : '';

            // Limpiar y repoblar
            stateSelect.innerHTML = '<option value="">Seleccionar...</option>';
            states.forEach(function(state) {{
                var option = document.createElement('option');
                option.value = state;
                option.textContent = state;
                if (state === valueToSelect) {{
                    option.selected = true;
                }}
                stateSelect.appendChild(option);
            }});

            // Actualizar ciudades
            updateCities(userChanged);
        }}

        // Función para actualizar ciudades
        function updateCities(userChanged) {{
            var country = countrySelect.value;
            var state = stateSelect.value;
            var cities = [];

            // En el primer render, preservar el valor de Django
            // Si el usuario cambió algo, resetear a vacío
            var valueToSelect = isFirstRender ? initialCity : '';

            if (country && state && GEOGRAPHY_DATA[country] && GEOGRAPHY_DATA[country][state]) {{
                cities = GEOGRAPHY_DATA[country][state].slice().sort();
            }}

            // Limpiar y repoblar
            citySelect.innerHTML = '<option value="">Seleccionar...</option>';
            cities.forEach(function(city) {{
                var option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                if (city === valueToSelect) {{
                    option.selected = true;
                }}
                citySelect.appendChild(option);
            }});

            // Después del primer render, marcar como false
            if (isFirstRender) {{
                isFirstRender = false;
                console.log('Geography cascade: primer render completado');
            }}
        }}

        // Event listeners - cuando el usuario cambia valores
        countrySelect.addEventListener('change', function() {{
            // Usuario cambió el país - resetear state y city
            isFirstRender = false;
            updateStates(true);
        }});

        stateSelect.addEventListener('change', function() {{
            // Usuario cambió el estado - resetear city
            isFirstRender = false;
            updateCities(true);
        }});

        // Inicializar con valores de Django
        updateStates(false);

        console.log('Geography cascade inicializado correctamente');
    }}

    // Iniciar
    initWhenReady();
}})();
</script>
'''
            html = mark_safe(str(html) + cascade_script)

        return html
