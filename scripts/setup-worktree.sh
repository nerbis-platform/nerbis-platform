#!/usr/bin/env bash
# setup-worktree.sh — Crea symlinks de .env y node_modules en un worktree
# Uso: ./scripts/setup-worktree.sh [ruta-worktree]
#   Si no se pasa ruta, usa el directorio actual (asume que es un worktree)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKTREE="${1:-$(pwd)}"

# Validar que el worktree existe y no es el repo principal
if [ "$WORKTREE" = "$REPO_ROOT" ]; then
  echo "Error: No se debe ejecutar sobre el repo principal."
  exit 1
fi

if [ ! -d "$WORKTREE" ]; then
  echo "Error: El directorio $WORKTREE no existe."
  exit 1
fi

created=0

# --- Symlinks de .env en la raiz ---
for envfile in "$REPO_ROOT"/.env*; do
  [ -f "$envfile" ] || continue
  fname="$(basename "$envfile")"
  target="$WORKTREE/$fname"
  if [ ! -e "$target" ] && [ ! -L "$target" ]; then
    ln -s "$envfile" "$target"
    echo "  [raiz] $fname -> symlink creado"
    ((created++))
  fi
done

# --- Symlinks de .env en backend/ ---
if [ -d "$WORKTREE/backend" ]; then
  for envfile in "$REPO_ROOT"/backend/.env*; do
    [ -f "$envfile" ] || continue
    fname="$(basename "$envfile")"
    target="$WORKTREE/backend/$fname"
    if [ ! -e "$target" ] && [ ! -L "$target" ]; then
      ln -s "$envfile" "$target"
      echo "  [backend] $fname -> symlink creado"
      ((created++))
    fi
  done
fi

# --- Symlinks de .env y node_modules en frontend/ ---
if [ -d "$WORKTREE/frontend" ]; then
  # .env files
  for envfile in "$REPO_ROOT"/frontend/.env*; do
    [ -f "$envfile" ] || continue
    fname="$(basename "$envfile")"
    target="$WORKTREE/frontend/$fname"
    if [ ! -e "$target" ] && [ ! -L "$target" ]; then
      ln -s "$envfile" "$target"
      echo "  [frontend] $fname -> symlink creado"
      ((created++))
    fi
  done

  # node_modules
  if [ -d "$REPO_ROOT/frontend/node_modules" ] && [ ! -e "$WORKTREE/frontend/node_modules" ]; then
    ln -s "$REPO_ROOT/frontend/node_modules" "$WORKTREE/frontend/node_modules"
    echo "  [frontend] node_modules -> symlink creado"
    ((created++))
  fi
fi

if [ "$created" -eq 0 ]; then
  echo "Worktree ya tiene todos los symlinks."
else
  echo "Listo: $created symlink(s) creados en $WORKTREE"
fi
