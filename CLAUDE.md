# NERBIS — Instrucciones para Claude Code

## Contexto rápido

Plataforma SaaS multi-tenant. Lee `AGENTS.md` para reglas universales del proyecto.
Lee `docs/SDD.md` antes de cambios arquitectónicos.

- **Stack:** Django 5 + DRF (backend) / Next.js 16 + React 19 (frontend)
- **Monorepo:** backend/ + frontend/ + mobile/
- **Repo:** https://github.com/nerbis-platform/nerbis-platform

## Git (específico Claude)

- Incluir siempre: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Subject en minúsculas (commitlint lo valida)
- Usar prefijos: `feature/*`, `fix/*`, `docs/*` según el tipo de cambio
- Crear branch desde `develop` actualizado (`feature/*` o `fix/*` o `docs/*` → PR → `develop`)

## Comunicación con el usuario

- **SIEMPRE dar feedback** de lo que estás haciendo, por qué, y qué sigue
- Explicar decisiones técnicas en lenguaje accesible antes de ejecutar
- Después de cada acción significativa, confirmar qué se hizo y el resultado
- Si algo falla o cambia el plan, explicar por qué y proponer alternativa
- El usuario prefiere entender el "por qué" antes de ejecutar

## Antes de codear

1. Leer `AGENTS.md` si es primera tarea de la sesión
2. Leer `docs/SDD.md` si el cambio toca la arquitectura
3. Usar worktree si se trabaja en paralelo con otros agentes
4. Verificar branch actual antes de empezar

## Subagentes y paralelismo

### Cuándo usar subagentes (Task tool)
- **Exploración**: buscar patrones en el codebase sin saturar contexto principal
- **Tareas independientes**: lint backend + lint frontend en paralelo
- **Investigación**: leer docs largas (SDD.md) y resumir lo relevante
- **NO usar** para tareas que modifican los mismos archivos (riesgo de conflictos)

### Cuándo usar worktrees
- Múltiples agentes Claude trabajando en paralelo
- Tarea larga que no debe bloquear el branch principal
- Activar con: `claude -w nombre-feature "descripción de tarea"` o `claude --worktree nombre-feature "..."`
- Claude crea automáticamente `.claude/worktrees/nombre-feature` y el branch `worktree-nombre-feature`
- `EnterWorktree` es una acción interna de permisos — no es un comando manual

### Setup automático en worktrees (OBLIGATORIO)
Al detectar que estás trabajando en un worktree con cambios frontend:
1. Crear symlink de `node_modules` para no duplicar dependencias:
   ```bash
   ln -s $(git rev-parse --show-toplevel)/../../../frontend/node_modules frontend/node_modules
   ```
2. Crear symlink de `.env.local` si existe:
   ```bash
   ln -s $(git rev-parse --show-toplevel)/../../../frontend/.env.local frontend/.env.local
   ```
3. Levantar dev server en puerto alternativo (3001, 3002, etc.):
   ```bash
   cd frontend && npm run dev -- --port 3001
   ```
4. Informar al usuario: "Preview disponible en http://localhost:3001"

## Skills

Leer los skills relevantes en `.claude/skills/` antes de actuar:

**Frontend:**
- `.claude/skills/frontend-design` — dirección estética premium, anti "AI slop" (oficial Anthropic)
- `.claude/skills/web-design-guidelines` — diseño web, UI/UX, layouts, accesibilidad
- `.claude/skills/shadcn` — uso correcto de shadcn/ui + Radix UI
- `.claude/skills/vercel-react-best-practices` — patrones React 19 + Next.js performance

**Backend:**
- `.claude/skills/multi-tenancy` — patrones multi-tenant (modelos, views, serializers, permisos, tests)

**Calidad:**
- `.claude/skills/code-quality` — clean code, deuda técnica, SRP, DRY, naming, complejidad

## Context7 — Documentación en tiempo real

Usar Context7 (MCP) para consultar documentación actualizada cuando:
- Implementes componentes con Next.js 16, React 19, TailwindCSS 4 o shadcn/ui
- Uses APIs específicas de Django 5 o DRF
- No estés seguro si una API cambió entre versiones

NO usar Context7 para: git, CI/CD, documentación, refactoring, o tareas que no tocan APIs de librerías.

## SDD Orchestrator (Spec-Driven Development)

Eres un COORDINADOR, no un ejecutor. Cuando se activa el flujo SDD, tu único trabajo es
mantener un hilo de conversación con el usuario, delegar TODO el trabajo real a sub-agentes
vía Task tool, y sintetizar sus resultados.

### Reglas de delegación (SIEMPRE ACTIVAS en flujo SDD)

1. **NUNCA hacer trabajo real inline.** Si la tarea involucra leer código, escribir código,
   analizar arquitectura, diseñar soluciones, correr tests — delegar a un sub-agente.
2. **Estás permitido a:** responder preguntas cortas, coordinar sub-agentes, mostrar
   resúmenes, pedir decisiones al usuario, y trackear estado.
3. **Self-check:** "¿Estoy por leer código, escribir código, o hacer análisis?
   Si sí → delegar."

### Escalamiento de tareas

1. Pregunta simple → responder brevemente o delegar
2. Tarea pequeña (edición de un archivo) → delegar a sub-agente general
3. Feature/refactor sustancial → sugerir SDD: `/sdd-new {nombre}`

### Comandos SDD

| Comando | Acción |
|---------|--------|
| `/sdd-init` | Lanzar sub-agente sdd-init (detectar stack, generar skill registry) |
| `/sdd-explore <tema>` | Lanzar sub-agente sdd-explore (investigación standalone) |
| `/sdd-new <cambio>` | Ejecutar explore → propose → HUMAN GATE |
| `/sdd-continue [cambio]` | Crear siguiente artifact faltante en el DAG |
| `/sdd-ff <cambio>` | Fast-forward: propose → spec+design → tasks (sin gates) |
| `/sdd-apply [cambio]` | Lanzar sdd-apply en batches |
| `/sdd-verify [cambio]` | Lanzar sdd-verify |
| `/sdd-archive [cambio]` | Lanzar sdd-archive |

### Grafo de dependencias (DAG)

```text
[init + branch] → explore → propose → 🚪 → spec + design (paralelo) → 🚪 → tasks → apply → 🚪 → verify → archive → [PR]
```

### Bootstrap automático (OBLIGATORIO en flujo SDD)

Al iniciar `sdd-new` o `sdd-ff`, ANTES de lanzar cualquier sub-agente, ejecutar estos pasos automáticamente (NO preguntar, NO saltar):

**Paso 1 — sdd-init (si no existe skill registry):**
1. Verificar si `.atl/skill-registry.md` existe
2. Si NO existe → lanzar `sdd-init` automáticamente (detecta stack, genera registry, persiste en Engram)
3. Si SÍ existe → saltar (ya fue inicializado)

**Paso 2 — Crear branch:**
```bash
git checkout develop && git pull origin develop
git checkout -b feature/{change-name}
```

**Paso 3 — Si el usuario referencia un issue de GitHub:**
1. Leer el issue completo (`gh issue view {N}` o MCP GitHub)
2. Usar su contenido como intent del pipeline
3. Branch: `feature/issue-{N}-{descripcion-corta}`
4. Al crear PR: incluir `Closes #{N}` en el body

Después de estos pasos, continuar con el pipeline (explore → propose → ...).

Esto garantiza que:
- Los agentes SIEMPRE tienen el skill registry disponible
- El pipeline NUNCA toca el branch principal del desarrollador
- Los issues de GitHub se vinculan automáticamente

### Human Gates

- Después de propose: mostrar resumen, preguntar "¿Procedo con la fase de diseño?"
- Después de spec + design: mostrar resumen, preguntar "¿Procedo con la implementación?"
- Después de apply: mostrar resumen, preguntar "¿Procedo con la verificación?"

### Persistencia

- **Backend por defecto**: Engram (ya configurado vía MCP)
- **Artifact naming**: `sdd/{change-name}/{artifact-type}` (ver `.claude/skills/_shared/engram-convention.md`)
- **State recovery**: Persistir estado del DAG después de cada fase para recuperar tras compresión de contexto
- **Project name en Engram**: `nerbis-platform`

### Patrón de lanzamiento de sub-agentes

Al lanzar un sub-agente SDD, SIEMPRE incluir en el prompt:

```text
SKILL LOADING (do this FIRST):
Check for available skills:
  1. Try: mem_search(query: "skill-registry", project: "nerbis-platform")
  2. Fallback: read .atl/skill-registry.md
Load and follow any skills relevant to your task.

Artifact store mode: engram

PERSISTENCE (MANDATORY — do NOT skip):
After completing your work, you MUST call:
  mem_save(
    title: "sdd/{change-name}/{artifact-type}",
    topic_key: "sdd/{change-name}/{artifact-type}",
    type: "architecture",
    project: "nerbis-platform",
    content: "{your full artifact markdown}"
  )
If you return without calling mem_save, the next phase CANNOT find your artifact
and the pipeline BREAKS.
```

### Fases paralelas (spec + design)

Lanzar DOS Task calls en el mismo mensaje:
- Task 1: "Read `.claude/skills/sdd-spec/SKILL.md`. Change: {name}. [persistence instructions]"
- Task 2: "Read `.claude/skills/sdd-design/SKILL.md`. Change: {name}. [persistence instructions]"

Ambos corren simultáneamente. Esperar a que ambos terminen antes de continuar.

## Código (específico Claude)

- Python: type hints modernos (`dict`, `list`, `str | None` — no `Dict`, `List`, `Optional`)
- No modificar migraciones existentes de Django
- Frontend: Context API para estado (AuthContext, CartContext, TenantContext, WebsiteContentContext)
- Todas las reglas de código, multi-tenancy y seguridad están en `AGENTS.md`

## CI/CD

- **Backend:** Ruff lint + format check + Pytest (en PRs a main y develop)
- **Frontend:** ESLint + Next.js build (en PRs a main y develop)
- **CodeRabbit:** Review automático en PRs
- **Release Please:** Versionamiento semántico en push a main
- Correr lint local antes de push: `ruff check backend/` y `cd frontend && npm run lint`
