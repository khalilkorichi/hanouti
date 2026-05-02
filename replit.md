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
    components/Layout/
      MainLayout.tsx  - Persistent sidebar (desktop) + temporary drawer (mobile)
      Header.tsx      - Glassmorphism header with page title, theme toggle, user avatar
      Sidebar.tsx     - Permanent (desktop) / temporary (mobile), collapsible
    pages/
      Login.tsx      - Modern login with gradient background, show/hide password
      Dashboard.tsx  - KPI cards + Quick actions + Top products (real API data)
      Products.tsx, Categories.tsx, Sales.tsx, SalesList.tsx
      Inventory.tsx, Reports.tsx, Settings.tsx
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
