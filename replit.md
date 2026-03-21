# Hanouti - Smart Inventory & POS System

## Overview
Hanouti is an AI-powered Smart Inventory and Point of Sale (POS) system for retail businesses. Full-stack app with a React/Vite frontend and FastAPI backend. The UI is in Arabic (RTL layout) using the Cairo font.

## Architecture
- **Frontend**: React 19 + TypeScript + Vite, Material UI v7, TanStack Query, Zustand — port 5000
- **Backend**: FastAPI (Python), SQLAlchemy ORM, Uvicorn — port 8000
- **Database**: SQLite (default, `backend/hanouti.db`), PostgreSQL supported via `DATABASE_URL` env var

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
      ThemeContext.tsx  - MUI theme: modern color system, Cairo font, rich shadows
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
