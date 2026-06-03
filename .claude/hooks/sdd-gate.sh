#!/bin/bash
# SDD Gate Hook — Bloquea edits de código en worktrees hasta aprobación humana
#
# El usuario desbloquea con: sdd-go (touch .sdd-approved)
# El usuario re-bloquea con: sdd-reset (rm .sdd-approved)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Si no hay file_path, permitir
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Detectar si estamos en un worktree (.git es un archivo, no directorio)
PROJECT_DIR=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$PROJECT_DIR" ]; then
  exit 0
fi

GIT_PATH="$PROJECT_DIR/.git"
if [ -d "$GIT_PATH" ]; then
  # .git es directorio = repo principal, no worktree → permitir
  exit 0
fi

# Estamos en un worktree. Verificar si .sdd-approved existe
if [ -f "$PROJECT_DIR/.sdd-approved" ]; then
  exit 0
fi

# Verificar si el archivo es infraestructura SDD (permitir siempre)
# Usar grep para matching más robusto que case con paths relativos/absolutos
if echo "$FILE_PATH" | grep -qE '(^|/)(\.(claude|atl|sdd-)|openspec/|\.gitignore$)'; then
  exit 0
fi

# BLOQUEAR: worktree sin aprobación, archivo es código
cat <<'DENY'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"SDD GATE: No puedes editar código sin aprobación del usuario. Presenta el plan completo (tasks + archivos + enfoque) y pide al usuario que ejecute: sdd-go"}}
DENY
exit 2
