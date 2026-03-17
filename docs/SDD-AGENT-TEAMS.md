# SDD Agent Teams — Guía Completa

> Guía para entender y usar el sistema de orquestación de agentes IA
> en el proyecto NERBIS. Escrita para desarrolladores que quieran
> aprovechar Claude Code con el patrón Spec-Driven Development.

---

## 1. ¿Qué es SDD Agent Teams?

SDD (Spec-Driven Development) Agent Teams es un sistema donde **Claude Code
actúa como orquestador** y delega el trabajo a **sub-agentes especializados**.
Cada sub-agente hace una sola cosa, la hace bien, y desaparece.

### El problema que resuelve

Cuando le pides a Claude que implemente una feature completa en una sola
conversación, pasan estas cosas:

- El contexto se satura (Claude "olvida" lo que leyó al inicio)
- No hay puntos de revisión humana — todo se ejecuta de golpe
- Si la conversación se corta, se pierde todo el progreso
- No hay documentación de las decisiones tomadas

### La solución

En vez de que un solo Claude haga todo:

```
SIN Agent Teams:
Tú → Claude (hace TODO) → resultado

CON Agent Teams:
Tú → Claude (orquestador) → lanza sub-agentes especializados
                           → cada uno guarda su trabajo en Engram
                           → tú apruebas en puntos clave
                           → el resultado es trazable y documentado
```

**Analogía:** Es como un equipo de desarrollo real. No le pides a un solo
desarrollador que sea analista, arquitecto, developer Y QA al mismo tiempo.
Le asignas roles especializados.

---

## 2. Arquitectura

### 2.1 Componentes del sistema

```
┌─────────────────────────────────────────────────────────┐
│                    TÚ (desarrollador)                   │
│              Apruebas en Human Gates (🚪)               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              CLAUDE (Orquestador)                       │
│  • NO hace trabajo real — solo coordina                 │
│  • Lanza sub-agentes con el Tool "Task"                 │
│  • Muestra resúmenes y pide aprobación                  │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌────────────┐ ┌─────────┐ ┌──────────┐
   │ Sub-agente │ │ Sub-ag. │ │ Sub-ag.  │   ... (8 agentes)
   │  Explorer  │ │Proposer │ │Spec Writ.│
   └─────┬──────┘ └────┬────┘ └─────┬────┘
         │             │            │
         ▼             ▼            ▼
┌─────────────────────────────────────────────────────────┐
│                    ENGRAM (memoria)                      │
│  • Persistencia entre sub-agentes                       │
│  • Sobrevive reinicios y compresión de contexto         │
│  • Naming: sdd/{change-name}/{artifact-type}            │
└─────────────────────────────────────────────────────────┘
```

### 2.2 El pipeline (DAG)

El pipeline es un grafo dirigido acíclico (DAG). Cada fase produce un
artifact que la siguiente fase consume:

```
Fase 1 — Exploración:
  explore ──→ propose ──→ 🚪 HUMAN GATE (tú apruebas)

Fase 2 — Diseño:
  spec ──┐
         ├──→ 🚪 HUMAN GATE (tú apruebas)
  design ┘  (corren en paralelo)

Fase 3 — Implementación:
  tasks ──→ apply ──→ 🚪 HUMAN GATE (tú apruebas)

Fase 4 — Validación:
  verify ──→ archive
```

### 2.3 Human Gates (🚪)

Son puntos donde el orquestador se detiene y te pide aprobación antes de
continuar. Existen en 3 momentos:

| Gate | Después de | Pregunta | Por qué |
|------|-----------|----------|---------|
| Gate 1 | Propuesta | "¿Procedo con la fase de diseño?" | Para que valides el scope antes de invertir en diseño |
| Gate 2 | Spec + Design | "¿Procedo con la implementación?" | Para que valides la arquitectura antes de escribir código |
| Gate 3 | Implementación | "¿Procedo con la verificación?" | Para que revises el código antes de cerrar |

**Puedes saltar los gates** usando `/sdd-ff` (fast-forward) cuando confías
en el flujo y no necesitas revisar cada paso.

---

## 3. Los 8 Sub-agentes

Cada sub-agente es un especialista. Nace con contexto limpio, hace UNA cosa,
guarda su resultado en Engram, y termina.

### 3.1 Tabla de roles

| # | Agente | Rol (analogía) | Qué hace | Qué produce |
|---|--------|----------------|----------|-------------|
| 1 | `sdd-explore` | Analista | Investiga el codebase, compara enfoques | Hallazgos y recomendaciones |
| 2 | `sdd-propose` | Product Manager | Define qué se va a hacer, scope y riesgos | Propuesta con rollback plan |
| 3 | `sdd-spec` | QA Lead | Escribe criterios de aceptación (Given/When/Then) | Specs delta |
| 4 | `sdd-design` | Arquitecto | Decide cómo construirlo, data flow, file changes | Documento de diseño |
| 5 | `sdd-tasks` | Tech Lead | Divide el trabajo en tareas concretas por fases | Checklist de implementación |
| 6 | `sdd-apply` | Developer | Escribe el código real siguiendo specs y diseño | Código + lint |
| 7 | `sdd-verify` | QA | Valida que el código cumple specs y diseño | Veredicto PASS/FAIL |
| 8 | `sdd-archive` | DevOps | Archiva artifacts, sugiere PR | Cambio cerrado |

### 3.2 Detalle de cada agente

#### sdd-explore (Explorador)

**Cuándo corre:** Primer paso de cualquier cambio nuevo.

**Qué hace:**
- Lee el codebase para entender el estado actual
- Identifica archivos relevantes
- Compara posibles enfoques
- Documenta hallazgos

**Qué NO hace:** No modifica archivos. Es 100% read-only.

**Artifact:** `sdd/{change-name}/explore`

---

#### sdd-propose (Proponedor)

**Cuándo corre:** Después del explore.

**Qué hace:**
- Lee los hallazgos del explorer
- Define el intent (qué queremos lograr)
- Define el scope (qué se toca y qué NO)
- Identifica riesgos
- Propone plan de rollback

**Artifact:** `sdd/{change-name}/proposal`

---

#### sdd-spec (Especificador)

**Cuándo corre:** Después de que apruebas la propuesta. Corre en paralelo con design.

**Qué hace:**
- Lee la propuesta
- Escribe specs delta (solo lo que cambia, no reescribe todo)
- Usa formato Given/When/Then para escenarios
- Incluye requisitos de tenant isolation (multi-tenancy)

**Artifact:** `sdd/{change-name}/spec`

---

#### sdd-design (Diseñador)

**Cuándo corre:** En paralelo con spec, después de aprobar la propuesta.

**Qué hace:**
- Lee la propuesta y el codebase actual
- Toma decisiones de arquitectura (con rationale)
- Define data flow
- Lista archivos a crear/modificar/eliminar
- Define estrategia de testing

**Artifact:** `sdd/{change-name}/design`

---

#### sdd-tasks (Planificador)

**Cuándo corre:** Después de spec + design.

**Qué hace:**
- Lee propuesta, specs y diseño
- Desglosa en tareas concretas organizadas por fases
- Cada tarea tiene: archivo, acción, criterio de verificación

**Fases estándar del proyecto:**

```
Fase 1: Foundation     → Modelos, migraciones, config
Fase 2: Core           → Serializers, views, componentes
Fase 3: Integration    → Conectar backend + frontend
Fase 4: Testing        → Pytest, verificación de specs
Fase 5: Cleanup & Lint → ruff check, npm run lint
```

**Artifact:** `sdd/{change-name}/tasks`

---

#### sdd-apply (Implementador)

**Cuándo corre:** Después de tasks. Puede correr varias veces (en batches).

**Qué hace:**
- Lee TODOS los artifacts anteriores (propuesta, specs, diseño, tasks)
- Implementa las tareas asignadas escribiendo código real
- Marca tareas completadas [x]
- Corre lint después de cada batch

**Es el ÚNICO agente que modifica archivos del proyecto.**

**Artifact:** `sdd/{change-name}/apply-progress`

---

#### sdd-verify (Verificador)

**Cuándo corre:** Después de la implementación.

**Qué hace 3 validaciones:**

1. **Completeness** — ¿Se implementaron todas las tareas?
2. **Correctness** — ¿El código cumple con los specs?
3. **Coherence** — ¿El código sigue el diseño?

**Veredicto:** PASS, PASS_WITH_WARNINGS, o FAIL (con razones).

**Artifact:** `sdd/{change-name}/verify`

---

#### sdd-archive (Archivador)

**Cuándo corre:** Después de verify con PASS.

**Qué hace:**
- Consolida todos los artifacts del cambio
- Actualiza `docs/SDD.md` si hubo cambio arquitectónico
- Sugiere crear PR a `develop`
- Registra learnings para futuras sesiones

**Artifact:** `sdd/{change-name}/archive`

---

## 4. Engram — La memoria compartida

### 4.1 ¿Qué es Engram?

Engram es un sistema de memoria persistente (vía MCP) que permite a los
sub-agentes compartir información sin estar en la misma conversación.

**Analogía:** Si los sub-agentes son miembros de un equipo, Engram es
su Confluence/Notion compartido donde dejan sus documentos.

### 4.2 ¿Cómo lo usan los agentes?

```
Agente Explorer termina → guarda en Engram:
  sdd/product-search/explore = "El Header está en Header.tsx, no hay endpoint..."

Agente Proposer inicia → busca en Engram:
  mem_search("sdd/product-search/explore") → encuentra el ID
  mem_get_observation(id) → lee el contenido completo

Agente Proposer termina → guarda en Engram:
  sdd/product-search/proposal = "Agregar barra de búsqueda al Header..."
```

### 4.3 Naming convention

Todos los artifacts siguen el patrón:

```
sdd/{nombre-del-cambio}/{tipo-de-artifact}
```

Ejemplos:
- `sdd/product-search/explore`
- `sdd/product-search/proposal`
- `sdd/product-search/spec`
- `sdd/product-search/design`
- `sdd/product-search/tasks`
- `sdd/product-search/apply-progress`
- `sdd/product-search/verify`
- `sdd/product-search/archive`

### 4.4 ¿Qué pasa si la conversación se corta?

Engram persiste entre sesiones. Si Claude pierde contexto o la conversación
se reinicia, puedes decir:

```
/sdd-continue product-search
```

El orquestador busca en Engram qué artifacts existen y retoma desde
el punto donde se quedó.

---

## 5. Ejemplo práctico: "Barra de búsqueda de productos"

Supongamos que quieres agregar una barra de búsqueda de productos al Header
de la aplicación.

### Paso 1: Iniciar el cambio

Tú escribes:
```
/sdd-new product-search
```

### Paso 2: Exploración (automático)

El orquestador lanza al **Explorer**. Este agente:
- Lee `frontend/src/components/Header.tsx`
- Lee `backend/products/models.py`
- Busca si existe algún endpoint de búsqueda
- Revisa qué contextos usa el Header (AuthContext, CartContext, etc.)

**Resultado guardado en Engram:**
> "El Header está en `frontend/src/components/Header.tsx`, usa AuthContext
> y CartContext. Los productos están en `backend/products/models.py` con
> campos name, description, price. No existe endpoint de búsqueda."

### Paso 3: Propuesta (automático)

El orquestador lanza al **Proposer**. Lee lo que encontró el Explorer y
genera:

> **Propuesta: product-search**
> - **Intent:** Permitir búsqueda de productos desde el Header
> - **Scope:** Backend (nuevo endpoint) + Frontend (nuevo componente)
> - **Out of scope:** Búsqueda avanzada con filtros, autocompletado
> - **Riesgo:** Bajo — no modifica funcionalidad existente
> - **Rollback:** Eliminar endpoint y componente SearchBar

### Paso 4: Human Gate 1 — TÚ DECIDES

El orquestador te muestra el resumen y pregunta:

> "¿Procedo con la fase de diseño?"

Opciones:
- **"Sí"** → continúa al paso 5
- **"Quiero que también busque por categoría"** → el orquestador ajusta
- **"No, cancelar"** → se detiene

### Paso 5: Spec + Design (paralelo)

El orquestador lanza **DOS agentes al mismo tiempo**:

**Spec Writer** produce:
> **Escenarios:**
> - Given usuario ve el Header, When escribe "zapato" y presiona Enter,
>   Then ve lista de productos que contienen "zapato" en el nombre
> - Given usuario busca "xyz123", When no hay resultados,
>   Then ve mensaje "No se encontraron productos"
> - Given usuario no autenticado, When busca productos,
>   Then la búsqueda funciona igual (no requiere auth)

**Designer** produce:
> **Decisiones:**
> - Crear `SearchView` con filtro `icontains` en name y description
> - Usar `ProductSerializer` existente (no crear uno nuevo)
> - Frontend: componente `SearchBar.tsx` como Client Component ("use client")
> - Debounce de 300ms para no saturar el backend
>
> **Archivos:**
> | Archivo | Acción |
> |---------|--------|
> | `backend/products/views.py` | Modificar — agregar SearchView |
> | `backend/products/urls.py` | Modificar — agregar ruta |
> | `frontend/src/components/SearchBar.tsx` | Crear |
> | `frontend/src/components/Header.tsx` | Modificar — integrar SearchBar |

### Paso 6: Human Gate 2 — TÚ DECIDES

> "Spec y diseño listos. ¿Procedo con la implementación?"

### Paso 7: Task Planning (automático)

El **Task Planner** desglosa:

```
Fase 1: Backend
  - [ ] 1.1 Crear SearchView en backend/products/views.py
        (ListView con filtro Q(name__icontains) | Q(description__icontains))
  - [ ] 1.2 Agregar URL path('search/', SearchView.as_view()) en urls.py

Fase 2: Frontend
  - [ ] 2.1 Crear componente SearchBar.tsx con "use client", input + debounce
  - [ ] 2.2 Integrar SearchBar en Header.tsx

Fase 3: Testing
  - [ ] 3.1 Test: GET /api/v1/products/search/?q=zapato retorna productos
  - [ ] 3.2 Test: GET /api/v1/products/search/?q=xyz retorna lista vacía

Fase 4: Lint
  - [ ] 4.1 ruff check backend/
  - [ ] 4.2 cd frontend && npm run lint
```

### Paso 8: Implementación (automático)

El **Implementador** escribe el código real:

- Crea la vista en Django con el filtro de búsqueda
- Agrega la ruta en urls.py
- Crea el componente SearchBar con debounce
- Lo integra en el Header
- Corre lint y corrige errores

### Paso 9: Human Gate 3 — TÚ DECIDES

> "Implementación completa. 8/8 tareas. ¿Procedo con la verificación?"

### Paso 10: Verificación (automático)

El **Verificador** chequea:
- ✅ Completeness: todas las tareas marcadas [x]
- ✅ Correctness: el endpoint filtra correctamente, el componente muestra resultados
- ✅ Coherence: se usó ProductSerializer existente como indicó el diseño

> **Veredicto: PASS**

### Paso 11: Archivado (automático)

El **Archivador**:
- Consolida todo
- Sugiere: "Crear PR de `feature/product-search` a `develop`"
- Registra learnings

### Resultado final

Después de todo el proceso tienes:
1. **Código funcional** — la feature implementada
2. **Documentación** — propuesta, specs, diseño, todo guardado en Engram
3. **Trazabilidad** — puedes ver por qué se tomó cada decisión
4. **PR listo** — para review del equipo

---

## 6. Trabajo en paralelo con Worktrees

### 6.1 ¿Cuándo usar worktrees?

Los worktrees permiten correr **dos pipelines SDD completamente
independientes** al mismo tiempo, cada uno en su propia copia del
repositorio.

### 6.2 Cuándo SÍ usarlos

Cuando las features tocan **archivos distintos**:

```bash
# Terminal 1 — Sistema de reviews (backend nuevo + página nueva)
claude --worktree reviews "sdd-new product-reviews"

# Terminal 2 — Dashboard de analytics (backend nuevo + página nueva)
claude --worktree analytics "sdd-new analytics-dashboard"
```

Cada terminal tiene su propio branch, su propio directorio, y sus propios
artifacts en Engram. No se interfieren.

### 6.3 Cuándo NO usarlos

Cuando las features tocan el **mismo componente**:

```
❌ Botón de carrito en Header  +  Botón de login en Header
   Ambos modifican Header.tsx → conflicto de merge garantizado
```

En este caso, haz **un solo flujo SDD** que incluya ambas funcionalidades:
```
/sdd-new header-cart-and-login
```

### 6.4 Regla simple

| Situación | Estrategia |
|-----------|-----------|
| Features en archivos distintos | 2 worktrees en paralelo |
| Features en el mismo componente | 1 solo flujo SDD secuencial |
| Feature grande + fix urgente separado | Worktree para el fix |

---

## 7. Comandos disponibles

| Comando | Qué hace | Cuándo usarlo |
|---------|----------|---------------|
| `/sdd-init` | Detecta stack, genera skill registry | Al inicio del proyecto o después de cambios en skills |
| `/sdd-new <nombre>` | Inicia pipeline completo: explore → propose → 🚪 | Cuando quieres empezar una feature nueva |
| `/sdd-continue [nombre]` | Retoma desde el último artifact guardado | Cuando la conversación se cortó o inicias nueva sesión |
| `/sdd-ff <nombre>` | Fast-forward sin human gates | Cuando confías en el flujo y no necesitas revisar |
| `/sdd-explore <tema>` | Solo exploración (sin pipeline completo) | Para investigar antes de decidir si hacer un cambio |
| `/sdd-apply [nombre]` | Implementar tareas pendientes | Cuando ya tienes tasks aprobados |
| `/sdd-verify [nombre]` | Validar implementación | Después de implementar |
| `/sdd-archive [nombre]` | Cerrar y archivar el cambio | Después de verificar con PASS |

---

## 8. Estructura de archivos del sistema

```
.claude/skills/
├── _shared/                          # Convenciones compartidas
│   ├── engram-convention.md          # Naming de artifacts en Engram
│   ├── persistence-contract.md       # Modos: engram/openspec/hybrid/none
│   └── openspec-convention.md        # Layout de archivos (modo openspec)
│
├── sdd-init/SKILL.md                 # Inicialización del proyecto
├── sdd-explore/SKILL.md              # Exploración del codebase
├── sdd-propose/SKILL.md              # Creación de propuestas
├── sdd-spec/SKILL.md                 # Escritura de specs
├── sdd-design/SKILL.md               # Diseño técnico
├── sdd-tasks/SKILL.md                # Desglose en tareas
├── sdd-apply/SKILL.md                # Implementación de código
├── sdd-verify/SKILL.md               # Verificación de calidad
├── sdd-archive/SKILL.md              # Archivado y cierre
│
├── skill-registry/SKILL.md           # Auto-descubrimiento de skills
├── multi-tenancy/SKILL.md            # Patrones multi-tenant
├── shadcn/SKILL.md                   # Uso de shadcn/ui
├── vercel-react-best-practices/SKILL.md  # React 19 + Next.js
└── web-design-guidelines/SKILL.md    # UI/UX guidelines
```

---

## 9. Preguntas frecuentes

### ¿Puedo usar solo algunos pasos del pipeline?

Sí. `/sdd-explore` funciona standalone para investigar sin comprometerte
a un cambio. `/sdd-apply` puede correr solo si ya tienes tasks definidos.

### ¿Qué pasa si un agente falla?

El orquestador te informa del error. Puedes:
- Reintentar el mismo paso
- Ajustar la propuesta y volver a correr
- Continuar manualmente

### ¿Puedo modificar lo que propone un agente?

Sí, en cada Human Gate puedes dar feedback. Por ejemplo:
- "Aprobado pero agrega también búsqueda por categoría"
- "Cambia el diseño para usar Server Component en vez de Client Component"

### ¿Necesito saber cómo funcionan los skills internamente?

No. Los skills son instrucciones para Claude, no para ti. Tú solo usas
los comandos (`/sdd-new`, `/sdd-continue`, etc.) y revisas en los gates.

### ¿Funciona para proyectos que no son NERBIS?

El patrón (el flujo del pipeline) es universal. Pero la implementación
actual tiene convenciones de NERBIS hardcodeadas (Django + Next.js,
multi-tenancy, lint con ruff). Para otro proyecto habría que adaptar
los skills.

### ¿Cuál es la diferencia entre `/sdd-new` y `/sdd-ff`?

| Aspecto | `/sdd-new` | `/sdd-ff` |
|---------|-----------|----------|
| Human Gates | Sí (3 puntos de aprobación) | No (corre todo de corrido) |
| Control | Máximo — revisas cada fase | Mínimo — confías en el proceso |
| Velocidad | Más lento (espera tu input) | Más rápido (automático) |
| Cuándo usar | Features importantes, primera vez | Features simples, flujo conocido |

---

## 10. Glosario

| Término | Significado |
|---------|-------------|
| **SDD** | Spec-Driven Development — desarrollo guiado por especificaciones |
| **DAG** | Directed Acyclic Graph — grafo que define el orden de ejecución |
| **Human Gate** | Punto de aprobación humana en el pipeline |
| **Engram** | Sistema de memoria persistente entre sesiones |
| **Artifact** | Documento producido por un sub-agente (propuesta, spec, diseño, etc.) |
| **Skill** | Archivo de instrucciones que un agente lee antes de actuar |
| **Worktree** | Copia aislada del repositorio para trabajo en paralelo |
| **Orquestador** | Claude principal que coordina pero no hace trabajo directo |
| **Sub-agente** | Instancia de Claude especializada lanzada por el orquestador |
| **Fast-forward** | Ejecución del pipeline sin detenerse en Human Gates |
| **MCP** | Model Context Protocol — protocolo de herramientas externas para Claude |
