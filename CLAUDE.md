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

Al detectar que estás trabajando en un worktree, ejecutar este setup **ANTES de cualquier otro trabajo**:

```bash
# 1. Detectar paths absolutos (funciona desde cualquier subdirectorio del worktree)
MAIN_REPO="$(git rev-parse --git-common-dir | sed 's|/\.git$||')"
WT_ROOT="$(git rev-parse --show-toplevel)"

# 2. Symlink de node_modules (evita duplicar ~500MB de dependencias)
if [ -d "$MAIN_REPO/frontend/node_modules" ]; then
  if [ -d "$WT_ROOT/frontend/node_modules" ] && [ ! -L "$WT_ROOT/frontend/node_modules" ]; then
    echo "⚠️  frontend/node_modules es un directorio real. Eliminándolo para crear symlink..."
    rm -rf "$WT_ROOT/frontend/node_modules"
  fi
  ln -sfn "$MAIN_REPO/frontend/node_modules" "$WT_ROOT/frontend/node_modules"
  echo "✅ Symlink node_modules → repo principal"
fi

# 3. Symlink de .env.local (variables de entorno compartidas)
if [ -f "$MAIN_REPO/frontend/.env.local" ]; then
  ln -sfn "$MAIN_REPO/frontend/.env.local" "$WT_ROOT/frontend/.env.local"
  echo "✅ Symlink .env.local → repo principal"
fi

# 4. Symlink de backend .env si existe
if [ -f "$MAIN_REPO/.env" ]; then
  ln -sfn "$MAIN_REPO/.env" "$WT_ROOT/.env"
  echo "✅ Symlink .env → repo principal"
fi
```

**Verificación post-setup** (OBLIGATORIO — no continuar si falla):
```bash
WT_ROOT="$(git rev-parse --show-toplevel)"
[ -L "$WT_ROOT/frontend/node_modules" ] && echo "✅ node_modules OK" || { echo "❌ node_modules FALTA — DETENERSE"; exit 1; }
[ -L "$WT_ROOT/frontend/.env.local" ] && echo "✅ .env.local OK" || echo "⚠️  .env.local no existe (puede ser normal)"
```

**Dev server automático post-desarrollo** (OBLIGATORIO cuando el cambio toca UI):

Al finalizar el desarrollo (commit hecho, build y lint pasando), evaluar si el cambio tocó archivos visuales:
- **Levantar server si:** el cambio toca componentes, pages, estilos, layouts, o cualquier archivo que afecte lo que el usuario ve en el browser
- **NO levantar si:** el cambio es cleanup, backend, docs, CI, configuración, o solo elimina código sin cambio visual

Cuando aplique:
```bash
cd frontend && npm run dev -- --port 3001 &
# Informar: "Preview disponible en http://localhost:3001 — verifica los cambios en el browser"
```

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
[bootstrap: init + branch + symlinks] → explore → propose → 🚪 → spec + design (paralelo) → 🚪 → tasks → apply → 🚪 → verify → archive → [commit + push + PR a develop]
```

**Regla de oro:** Si `git branch --show-current` devuelve `develop` o `main` en cualquier
punto del pipeline, **DETENERSE INMEDIATAMENTE**. Algo salió mal en el bootstrap.

### Bootstrap automático (OBLIGATORIO en flujo SDD)

Al iniciar `sdd-new`, `sdd-ff`, o cualquier comando SDD que inicie un cambio nuevo,
ejecutar estos pasos **en orden, sin saltar ninguno, sin preguntar**. Si un paso falla,
**DETENERSE e informar al usuario**. NO continuar con el pipeline hasta que todos pasen.

#### Paso 1 — sdd-init (si no existe skill registry)
1. Verificar si `.atl/skill-registry.md` existe
2. Si NO existe → lanzar `sdd-init` automáticamente
3. Si SÍ existe → saltar

#### Paso 2 — Crear branch aislado (CRÍTICO — NO SALTAR)

**Determinar el nombre del branch:**
- Si el usuario referencia un issue: `feature/issue-{N}-{descripcion-corta}`
- Si es un fix: `fix/{change-name}`
- Si es feature: `feature/{change-name}`

**Determinar el contexto actual:**

```bash
CURRENT_BRANCH=$(git branch --show-current)
IS_WORKTREE=$(git rev-parse --is-inside-work-tree >/dev/null 2>&1 && [ "$(git rev-parse --git-common-dir)" != "$(git rev-parse --git-dir)" ] && echo "yes" || echo "no")
```

**Caso A — Estás en el repo principal (no worktree):**
```bash
# Guardar el branch actual del usuario para no perderlo
USER_BRANCH="$CURRENT_BRANCH"

git fetch origin develop

# Verificar si el branch ya existe (ej: pipeline reiniciado)
if git show-ref --verify --quiet "refs/heads/{branch-name}"; then
  # Branch existe — retomar trabajo previo
  git checkout {branch-name} || {
    echo "❌ ERROR: No se pudo hacer checkout de '{branch-name}' (¿en uso por otro worktree?). DETENERSE."
    exit 1
  }
  echo "✅ Branch '{branch-name}' ya existía, retomando"
  echo "📌 Branch anterior del usuario: $USER_BRANCH"

  # Verificar si hay commits nuevos en develop
  BEHIND=$(git rev-list --count {branch-name}..origin/develop)
  if [ "$BEHIND" -gt 0 ]; then
    echo "⚠️  develop tiene $BEHIND commits nuevos. Rebaseando..."
    git rebase origin/develop || {
      echo "❌ CONFLICTOS en rebase. Abortando pipeline."
      git rebase --abort
      exit 1
    }
  fi
else
  # Branch no existe — crear desde develop
  git checkout -b {branch-name} origin/develop || {
    echo "❌ ERROR: No se pudo crear branch '{branch-name}'. DETENERSE."
    exit 1
  }
  echo "✅ Branch '{branch-name}' creado desde develop"
  echo "📌 Branch anterior del usuario: $USER_BRANCH"
fi
```

**Caso B — Estás en un worktree:**
```bash
# En worktrees, el branch ya fue asignado al crear el worktree.
# Solo verificar que NO estamos en develop o main directamente.
if [ "$CURRENT_BRANCH" = "develop" ] || [ "$CURRENT_BRANCH" = "main" ]; then
  echo "❌ ERROR: El worktree está en '$CURRENT_BRANCH'. Creando branch desde develop..."
  git fetch origin develop
  if git show-ref --verify --quiet "refs/heads/{branch-name}"; then
    git checkout {branch-name} || {
      echo "❌ ERROR: No se pudo hacer checkout de '{branch-name}' (¿en uso por otro worktree?). DETENERSE."
      exit 1
    }
  else
    git checkout -b {branch-name} origin/develop || {
      echo "❌ ERROR: No se pudo crear branch '{branch-name}'. DETENERSE."
      exit 1
    }
  fi
fi
echo "✅ Worktree en branch: $(git branch --show-current)"
```

**Verificación post-branch (OBLIGATORIO):**
```bash
# Confirmar que NO estamos en develop ni main
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "develop" ] || [ "$BRANCH" = "main" ]; then
  echo "❌ FATAL: Seguimos en '$BRANCH'. El bootstrap falló. DETENERSE."
  exit 1
fi
echo "✅ Branch de trabajo confirmado: $BRANCH"
```

#### Paso 3 — Setup de symlinks (si es worktree)

Si `IS_WORKTREE` es "yes", ejecutar el **setup automático de worktrees** descrito arriba
en la sección "Setup automático en worktrees". Esto crea symlinks de node_modules, .env.local, y .env.

#### Paso 4 — Vincular issue de GitHub (si aplica)
Si el usuario referencia un issue:
1. Leer el issue completo (`gh issue view {N}` o MCP GitHub)
2. Usar su contenido como intent del pipeline
3. Al crear PR al final: incluir `Closes #{N}` en el body

#### Paso 5 — Confirmar al usuario

Mostrar un resumen antes de continuar:
```text
🚀 SDD Bootstrap completo:
  Branch: {branch-name}
  Base: develop (commit {short-hash})
  Worktree: {sí/no}
  Symlinks: {node_modules ✅, .env.local ✅/⚠️}
  Issue: #{N} (si aplica)
  Persistencia: engram

Iniciando pipeline: explore → propose → ...
```

**Esto garantiza que:**
- Cada cambio SDD vive en su PROPIO branch aislado
- El usuario puede probar cada cambio independientemente antes de merge
- NUNCA se trabaja directamente en develop o main
- Los worktrees tienen todos los symlinks necesarios
- El usuario sabe exactamente dónde está parado

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
