# Hanouti — حانوتي · Windows Desktop Edition

This document explains how the desktop build works, how to run it locally, and
how the GitHub-based auto-updater is wired.

---

## 1 · Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Hanouti.exe   (Electron 33 launcher)                                 │
│                                                                       │
│   ┌──────────────────┐    spawn child    ┌─────────────────────────┐ │
│   │ Electron main    │ ───────────────►  │ backend.exe             │ │
│   │ (electron/*.cjs) │                   │ (PyInstaller-bundled    │ │
│   │  · BrowserWindow │  IPC + http call  │  FastAPI on 127.0.0.1)  │ │
│   │  · Updater       │ ◄──────────────── │  → SQLite at %APPDATA%  │ │
│   └────────┬─────────┘                   └─────────────────────────┘ │
│            │                                                          │
│            ▼ contextBridge (preload.cjs)                              │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │ React 19 + Vite renderer (frontend/dist)                      │   │
│   │  · MUI v7 RTL · TanStack Query · UpdaterPanel                 │   │
│   └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Files added for desktop

| Path                                     | Purpose                                       |
|-----------------------------------------|-----------------------------------------------|
| `package.json` (root)                    | Electron + electron-builder scripts           |
| `electron/main.cjs`                      | Main process: window, backend spawn, IPC      |
| `electron/preload.cjs`                   | Safe contextBridge for renderer ↔ main       |
| `electron/backend-launcher.cjs`          | Spawns/health-checks backend.exe              |
| `electron/updater.cjs`                   | GitHub SHA-diff atomic updater (miftah-style) |
| `electron/config.cjs`                    | Constants: ports, repo defaults, paths        |
| `backend/run_exe.py`                     | PyInstaller entry point                       |
| `backend/build_exe.py`                   | PyInstaller build script                      |
| `backend/requirements-build.txt`         | Build-time pip deps                           |
| `electron-builder.yml`                   | NSIS installer + extraResources config        |
| `build/installer.nsh`                    | NSIS hooks (per-user data dir)                |
| `.github/workflows/build-windows.yml`    | CI: build .exe + publish release branch       |
| `frontend/src/services/electronUpdater.ts`         | Typed wrapper for window APIs       |
| `frontend/src/components/Settings/UpdaterPanel.tsx`| Updater UI (Settings → التحديثات)  |

---

## 2 · Build the Windows installer

### Easy way — GitHub Actions (recommended)

1. Push to `master` (or trigger manually from the Actions tab).
2. Workflow `Build Windows Installer` runs on `windows-latest`:
   - Installs Python + Node
   - Builds `backend.exe` via PyInstaller
   - Builds the React frontend (`frontend/dist`)
   - Stages everything under `app-files/`
   - Runs `electron-builder --win --x64`
   - Uploads `release/Hanouti-Setup-<ver>-x64.exe` as a workflow artifact
3. To cut a release, push a tag like `v1.0.1`. The workflow then **also**:
   - Creates a GitHub Release with the installer attached
   - Force-pushes built artifacts (`frontend-dist/`, `backend-dist/`) to the
     `release-windows` branch — this is where the in-app updater pulls from.

### Manual way — local Windows machine

```powershell
# Prereqs: Node 20, Python 3.12, npm, git
git clone https://github.com/khalilkorichi/hanouti.git
cd hanouti

# Install everything
pip install -r backend/requirements-build.txt
npm install --legacy-peer-deps
npm install --prefix frontend --legacy-peer-deps

# Build
python backend/build_exe.py
npm --prefix frontend run build

# Stage
mkdir app-files\frontend-dist app-files\backend-dist
xcopy /E /Y frontend\dist\*  app-files\frontend-dist\
xcopy /E /Y backend-dist\*   app-files\backend-dist\

# Package
npx electron-builder --win --x64
# → release/Hanouti-Setup-1.0.0-x64.exe
```

> ⚠️ Building from Linux/macOS is technically possible (`electron-builder`
> supports cross-build) but needs Wine and produces an unsigned binary that may
> trigger SmartScreen. The GitHub Actions workflow on `windows-latest` is the
> stable path.

---

## 3 · Run during development

You need **three** parallel processes:

```bash
# 1. Backend (FastAPI) — port 51730 in desktop mode, 8000 in web mode
cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 51730

# 2. Frontend (Vite dev server) — port 5000
npm --prefix frontend run dev

# 3. Electron shell pointing at the dev URL
HANOUTI_DEV=1 npm run electron:dev
```

The Replit workflows still serve the web version (port 5000 + 8000) for in-browser preview; the
Electron shell is a separate path for desktop testing.

---

## 4 · Auto-update flow

The updater (`electron/updater.cjs`) is a faithful re-implementation of the
"miftah" (مفتاح) pattern described in the project brief:

### Steps

1. **Scan** — `GET /repos/khalilkorichi/hanouti` → resolves the configured branch
   (default: `release-windows`); fetches the recursive tree; computes a git-blob
   SHA1 of every locally-installed file under `app-files/`; emits a diff.
2. **Backup** — opens a folder picker via `dialog.showOpenDialog`, copies the
   current `app-files/` content to `<chosen>/hanouti-backup-<ts>/`.
3. **Apply (atomic)**:
   - Creates a temp staging dir `%TEMP%/hanouti-update-XXXX`.
   - For every changed file, downloads from `raw.githubusercontent.com` with a
     cache-buster, **verifies the git-blob SHA matches the GitHub tree SHA**
     (3 retries with exponential backoff).
   - If even one download fails → wipes staging, leaves the live install
     untouched.
   - On success → copies staged files into the live `app-files/` dir, then
     deletes any tracked files that no longer exist on the remote.
4. **Restart** — user clicks "إعادة التشغيل" → `app.relaunch()`.

### Security

- **Path safety**: rejects absolute paths, `..` segments, NUL bytes, and any
  file whose normalized path doesn't start with one of `trackedPrefixes`.
- **SHA verification**: identical algorithm to git (`sha1("blob N\0<content>")`).
- **contextBridge**: renderer cannot touch disk directly — every operation
  flows through whitelisted IPC channels in `preload.cjs`.
- **Atomic writes**: the live install is only modified after every staged file
  has been SHA-verified.

### Settings → التحديثات (UI)

Inside the running app, navigate to **الإعدادات → التحديثات** to:

- See current version, branch, commit history (last 5)
- Click "فحص التحديثات" → live diff (modified / added / removed counts)
- Click "نسخة احتياطية" → backup before update
- Click "تطبيق التحديث" → atomic apply with a live progress bar
- Click ⚙ to change the update source (repo owner / name / branch / tracked paths)

Default tracked prefixes: `frontend-dist/` and `backend-dist/`.

---

## 5 · Where data lives

| What                      | Path on Windows                                  |
|---------------------------|--------------------------------------------------|
| Installed app             | `%LOCALAPPDATA%\Programs\Hanouti\`               |
| Updatable files           | `%LOCALAPPDATA%\Programs\Hanouti\app-files\`     |
| User database (SQLite)    | `%APPDATA%\Hanouti\data\hanouti.db`              |
| Updater config            | `%APPDATA%\Hanouti\\updater-config.json`          |
| Logs (electron-log)       | `%APPDATA%\Hanouti\logs\`                        |

The uninstaller does **not** delete `%APPDATA%\Hanouti\` — your data
survives reinstalls. Delete that folder manually for a full reset.

---

## 6 · Optional: app icon

Drop a `build/icon.ico` (multi-resolution, 256×256 included). If absent,
electron-builder uses the default Electron icon. See `build/README-icon.md`.
