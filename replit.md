# Hanouti - Smart Inventory & POS System

## Overview
Hanouti is an AI-powered Smart Inventory and Point of Sale (POS) system for retail businesses. Full-stack app with a React/Vite frontend and FastAPI backend. The UI is in Arabic (RTL layout) using the Cairo font.

## Architecture
- **Frontend**: React 19 + TypeScript + Vite, Material UI v7, TanStack Query (staleTime 30s, gcTime 30min, placeholderData=keepPreviousData for instant nav-back), Zustand — port 5000
- **Backend**: FastAPI (Python), SQLAlchemy ORM, Uvicorn, GZip middleware — port 8000
- **Database**: SQLite with WAL mode, 64MB cache, 256MB mmap, NORMAL synchronous, 5s busy timeout (default `backend/hanouti.db`), PostgreSQL with connection pool (10+20) supported via `DATABASE_URL` env var
- **Composite DB indexes**: products(category_id+is_active, stock_qty+min_qty, is_active+name), sales(status+created_at, created_at), sale_items(sale_id, product_id, sale_id+product_id), stock_movements(product_id+created_at)
- **Code splitting + preload**: Pages are lazy-loaded via `React.lazy + Suspense`. After login, all routes are preloaded in background via `requestIdleCallback` for instant navigation.
- **Hooks**: `src/hooks/useDebounce.ts` — 350ms debounce applied to search inputs in Inventory, SalesList, ProductExplorer

## Desktop Edition (Windows .exe)

The project also ships as a **professional Windows desktop application** built
with Electron 33 + electron-builder (NSIS installer).

```
electron/
  main.cjs              - Main process, BrowserWindow, lifecycle
  preload.cjs           - contextBridge → exposes window.electronAPI / electronUpdater
  backend-launcher.cjs  - Spawns bundled backend.exe and health-checks it
  updater.cjs           - GitHub SHA-diff atomic auto-updater (miftah-style)
  config.cjs            - Constants (ports, repo defaults, paths)
backend/
  run_exe.py            - PyInstaller entry-point (uses HANOUTI_DB_PATH env var)
  build_exe.py          - Builds backend.exe via PyInstaller
  requirements-build.txt - Build-time pip deps (incl. PyInstaller)
electron-builder.yml    - NSIS installer config (perUser, multi-language, RTL Arabic)
build/installer.nsh     - NSIS hooks (per-user data dir at %APPDATA%\Hanouti)
.github/workflows/build-windows.yml - CI: builds .exe on windows-latest, tags = release
frontend/src/
  services/electronUpdater.ts        - Typed wrapper for window.electronUpdater
  components/Settings/UpdaterPanel.tsx - Updater UI (in Settings → التحديثات tab)
```

**Auto-updater** (Settings → التحديثات) — rewritten in v1.0.5/v1.0.6,
extended in v1.0.7 with **comprehensive file-level (SHA-256) comparison**:
uses the standard **GitHub Releases API** (default repo `khalilkorichi/hanouti`).

**File-level diff (manifest.json)** — at build time `scripts/build-manifest.cjs`
walks the staged `app-files/` (frontend-dist + backend-dist), SHA-256 hashes
every file, and writes a sorted manifest:
```
{ schemaVersion:1, version, generatedAt, fileCount, totalSize,
  files: [ { path, size, sha256 }, ... ] }
```
The CI workflow uploads `manifest.json` as a release asset alongside the
`.exe`. The updater downloads it, computes the local manifest of the
installed `app-files/` (resolved via `path.dirname(app.getAppPath())` when
packaged), and diffs them — returning `{counts:{changed,added,removed,
unchanged,total}, downloadSize, changed[], added[], removed[], truncated}`
(per-category cap of 200 entries to keep IPC payload sane). The manifest
fetch reuses the same HTTPS + GitHub host allow-list and re-validates the
host post-CDN redirect.

Flow:
1. `checkForUpdates()` → `GET /repos/<owner>/<repo>/releases/latest`, parses
   `tag_name`, runs strict semver compare (incl. proper §11 prerelease ordering
   so `rc10` > `rc2`). **In parallel**: fetches `manifest.json` and computes
   the local SHA-256 manifest, then diffs them. `updateAvailable = versionIsNewer
   OR (fileDiff.available && !fileDiff.inSync)` — this catches hot-fix
   re-publishes that share the same tag but ship different files. Returns
   release notes + `.exe` asset metadata + `fileDiff` payload.
2. `downloadInstaller()` (no renderer args; main process re-fetches the release
   and picks the asset itself) streams the `.exe` to
   `%APPDATA%/Hanouti/updates/<name>.partial`, validates HTTPS + GitHub host
   allow-list (`github.com`, `objects.githubusercontent.com`,
   `release-assets.githubusercontent.com`, `codeload.github.com`), re-validates
   after CDN redirect, verifies downloaded byte-count matches `asset.size`,
   atomic rename to final.
3. `installAndRelaunch(path)` stops the backend, `spawn(detached:true,
   stdio:'ignore')` + `unref()` the installer, then `app.quit()` after 1.2s
   so NSIS can take over (UAC + auto-relaunch).

The NSIS installer is still used for the actual replacement step because
`electron.exe` and `backend.exe` are file-locked at runtime — only the
installer can atomically swap them after killing the running process.
The file-level diff exists to **detect** drift and **show** the user a
precise breakdown (changed/added/removed file lists in `UpdaterPanel`),
not to replace files in-place.

IPC contract is intentionally minimal so the renderer cannot inject arbitrary
download URLs. Path-traversal-safe (filename whitelist + updates-dir confinement),
contextBridge-isolated. Auto-checks every 6 hours and shows a Windows desktop
notification when an update is available.

**Build instructions**: see `README-WINDOWS.md`. Trigger via GitHub Actions
(`Build Windows Installer` workflow) or locally via `npm run dist:win` on Windows.

**Backend in production**: `electron/main.cjs` spawns `backend.exe` on a fixed
port (51730) with `HANOUTI_DB_PATH` pointing at `%APPDATA%\Hanouti\data\hanouti.db`.
The frontend `services/api.ts` auto-detects Electron via `window.electronAPI` and
switches axios baseURL from the Vite `/api` proxy to `http://127.0.0.1:51730`.

## Project Structure
```
/backend
  main.py          - App entry, CORS, router registration
  database.py      - DB connection (SQLite default, Postgres via DATABASE_URL)
  models.py        - SQLAlchemy ORM models
  schemas.py       - Pydantic validation schemas
  crud.py          - Database CRUD operations
  routers/         - auth, products, categories, sales, inventory, reports, backup

/frontend
  index.html       - HTML entry with Cairo/Tajawal fonts
  src/
    contexts/
      ThemeContext.tsx  - SINGLE SOURCE OF TRUTH for theming. Persisted tokens (localStorage): mode (light/dark), primaryColor (6 presets + custom hex), fontSize (small/medium/large), radius (sharp/medium/rounded), density (compact/comfortable/spacious), animSpeed (off/fast/normal). Drives MUI theme.shape.borderRadius + per-component overrides for Button/Card/TextField/Chip/Tooltip/Dialog padding & radius. Components must NOT hardcode `fontFamily: 'Cairo'` or `borderRadius: N` — theme handles both globally.
      NotificationContext.tsx  - Multi-notification queue system: up to 5 simultaneous toasts, progress bar, hover-to-pause, slide animation, action buttons
    components/Common/
      PageHeader.tsx  - UNIFIED page-top hero used by ALL pages.
                        Props: title, subtitle, icon, titleEmoji, actions, accent, compact, sx, disableGlow.
                        Renders: gradient avatar circle + gradient title + subtitle + actions slot + corner glow.
                        Dark mode: alpha 0.22 (vs 0.07 light), brighter title gradient via primary.light/secondary.light,
                        inner highlight box-shadow, stronger border. RTL-safe (insetInlineEnd).
                        Replaces ad-hoc page headers in Dashboard/Products/Categories/SalesList/Inventory/Reports/Settings.
      CustomCard, CustomButton, CustomIconButton, CustomInput, CustomSelect, SearchInput,
      BulkActionsBar, UnifiedModal — other shared primitives.
    components/Layout/
      MainLayout.tsx  - Persistent sidebar (desktop) + temporary drawer (mobile)
      Header.tsx      - Glassmorphism header with page title, theme toggle, user avatar
      Sidebar.tsx     - Permanent (desktop) / temporary (mobile), collapsible
    pages/
      Login.tsx      - Modern login with gradient background, show/hide password
      Dashboard.tsx  - KPI cards + Quick actions + Top products (real API data)
      Products.tsx, Categories.tsx, Sales.tsx, SalesList.tsx
      Inventory.tsx, Settings.tsx
      Categories.tsx — Pro redesign (Task #3): 4 KPI cards (total/active/inactive/total-products),
                       toolbar (search + status filter + sort + view-toggle + Excel export),
                       DataGrid table view + Cards view with @dnd-kit drag-drop reorder,
                       BulkActionsBar (activate/deactivate/delete), color picker (24 swatches) +
                       icon picker (28 Material icons in CATEGORY_ICONS registry), live preview,
                       duplicate-name guard. Reorder controls (drag + up/down arrows) are auto-
                       disabled with an info banner + tooltip when sort != 'display_order' or any
                       filter is active — prevents corrupting global order from a partial subset.
      Reports.tsx    - Hero header, 4 KPI cards with growth chips (% vs previous period),
                       insights strip (top category/peakday/peakhour), 9 chart sections:
                       gradient area chart, donut(stock+center number), top-products with progress bars,
                       category donut, weekday bar, payment-methods bars, hour line,
                       radial profit margin, inventory value stats. Error state + retry.
    services/
      api.ts         - Axios instance with baseURL '/api' (proxied to backend)
      reportsService.ts, productService.ts, salesService.ts, etc.
  vite.config.ts   - host 0.0.0.0, port 5000, proxy /api → localhost:8000
```

## Workflows
- **Start application**: `cd frontend && npm run dev` (port 5000, webview)
- **Backend API**: `cd backend && python -m uvicorn main:app --host localhost --port 8000 --reload`

## API Proxy
Frontend routes `/api/*` through Vite proxy → backend `localhost:8000`.
All fetch calls use relative `/api/...` paths — never hardcoded localhost URLs.

## Reports Endpoints (10 total)
- `/reports/kpis?period=...` — current + `previous{}` + `growth{}` (% change vs equivalent prev period)
- `/reports/sales-over-time`, `/reports/top-products?limit=N`, `/reports/stock-status`
- `/reports/profit-margin` (revenue/cost/profit/margin%)
- `/reports/sales-by-category` (uses `.select_from(Category)` to disambiguate joins)
- `/reports/payment-methods`, `/reports/sales-by-weekday`, `/reports/sales-by-hour`
- `/reports/inventory-value` (cost_value/retail_value/potential_profit/total_units/total_skus)
- **SQLAlchemy gotcha**: aggregate queries that mix columns from multiple unrelated tables MUST
  use `.select_from(<central_table>)` before `.join(...)` chains, else InvalidRequestError.

## RTL & UI Consistency Rules (IMPORTANT)
The app uses MUI + emotion `@mui/stylis-plugin-rtl` for bidi behavior. To avoid breaking RTL:

1. **NEVER use `direction: 'rtl'` inside `sx`** — use the `dir="rtl"` HTML attribute instead.
2. **Single root `dir="rtl"`** lives in `MainLayout.tsx`. Page roots must NOT add their own `dir="rtl"` (it cascades). EXCEPTION: content rendered inside MUI `Dialog`/`Popover` portals needs its own `dir="rtl"` because portals escape the React tree.
3. **Use logical CSS properties** for any directional spacing/positioning:
   - `marginInlineStart` / `marginInlineEnd` (NOT `ml`/`mr`/`marginLeft`/`marginRight`)
   - `insetInlineStart` / `insetInlineEnd` (NOT `left`/`right`)
   - `paddingInlineStart` / `paddingInlineEnd`
   - `borderInlineStart` / `borderInlineEnd`
4. **Never hardcode `fontFamily: 'Cairo'` in components** — `ThemeContext.tsx` typography sets it globally on every MUI component. Hardcoding it overrides font-size scaling from Settings.
5. **Use `theme.palette.*` for colors** — only category-style accent colors may be inlined (e.g. sidebar menu badges). Never duplicate `theme.palette.primary.main` as a hex.
6. **Use the `api` service (axios) for all backend calls** — never `fetch('/api/...')`. The api service handles baseURL, headers, and credentials uniformly.
7. **Use the `PageHeader` common component for every page top header** — never reinvent gradient-title + subtitle + actions markup inline. Pass `actions={<>...</>}` for the right-side cluster. For sub-section headers (Settings), use `compact` + `accent={color}`.

## UI Design System
- **Font**: Cairo (Arabic), Tajawal fallback
- **Theme**: Modern indigo (#4F46E5) primary, teal secondary, proper dark mode
- **Layout**: Persistent collapsible sidebar on desktop (256px / 72px collapsed), temporary drawer on mobile
- **Components**: Glassmorphism header, gradient stat cards, animated hover states
- **RTL**: Full right-to-left support via emotion/stylis-plugin-rtl

## Default Credentials
- Username: `admin`
- Password: `1234`

## Deployment
- Build: `cd frontend && npm run build`
- Run: `cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 5000`
- Target: autoscale
