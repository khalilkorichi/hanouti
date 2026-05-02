#!/bin/bash
# Hanouti post-merge setup.
# Runs automatically after a task is merged into main. Must be:
#   - idempotent (re-runnable without side-effects)
#   - non-interactive (stdin is /dev/null)
#   - fast (under the configured timeout)
#
# Installs Node deps for both the root (Electron) and the frontend
# (Vite/React), and Python deps for the FastAPI backend. Workflow
# reconciliation runs separately after this script.

set -euo pipefail

log() { printf '\n[post-merge] %s\n' "$*"; }

# ─── Root npm install (Electron + build scripts) ─────────────────
if [ -f package.json ]; then
  log "Installing root npm deps (Electron / build tooling)…"
  npm install --no-audit --no-fund --prefer-offline
fi

# ─── Frontend npm install (Vite + React UI) ──────────────────────
if [ -f frontend/package.json ]; then
  log "Installing frontend npm deps (Vite + React)…"
  npm --prefix frontend install --no-audit --no-fund --prefer-offline
fi

# ─── Backend Python deps ─────────────────────────────────────────
# Skipped intentionally: this Replit project's Python interpreter
# lives under /nix/store and is externally managed (PEP 668), so
# `pip install` into the system site-packages fails. Backend deps
# (FastAPI / SQLAlchemy / Alembic / etc.) are provisioned by the
# Replit Nix package manager — adding a new Python dep means using
# the package-management workflow, not this script.
#
# Likewise Alembic migrations are skipped here: backend SQLite DBs
# (hanouti.db / pos.db) are checked into the repo for dev convenience,
# and the packaged Electron app runs its own migrations at startup.

log "Done."
