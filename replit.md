# Hanouti - Smart Inventory & POS System

## Overview
Hanouti is an AI-powered Smart Inventory and Point of Sale (POS) system for retail businesses, with a React frontend and FastAPI backend. The UI is in Arabic (RTL layout).

## Architecture
- **Frontend**: React 19 + TypeScript + Vite, Material UI, TanStack Query, Zustand, running on port 5000
- **Backend**: FastAPI (Python), SQLAlchemy ORM, Uvicorn server, running on port 8000
- **Database**: SQLite (default for development), PostgreSQL supported via DATABASE_URL env var

## Project Structure
```
/backend         - FastAPI Python application
  main.py        - App entry point, CORS, router registration
  database.py    - DB connection (SQLite default, Postgres via DATABASE_URL)
  models.py      - SQLAlchemy ORM models
  schemas.py     - Pydantic validation schemas
  crud.py        - Database CRUD operations
  routers/       - API route modules (auth, products, categories, sales, inventory, reports, backup)

/frontend        - React + Vite application
  src/
    components/  - UI components by feature
    pages/       - Main app views (Dashboard, Inventory, Reports, etc.)
    services/    - Axios API client (proxied through /api to backend)
    store/       - Zustand state stores
  vite.config.ts - Vite config: host 0.0.0.0, port 5000, proxy /api -> localhost:8000
```

## Workflows
- **Start application**: `cd frontend && npm run dev` (port 5000, webview)
- **Backend API**: `cd backend && python -m uvicorn main:app --host localhost --port 8000 --reload` (port 8000, console)

## API Proxy
The frontend uses Vite's proxy to route `/api/*` requests to the backend at `localhost:8000`. This means:
- Frontend API calls use relative paths like `/api/products`
- The backend API base URL in `frontend/src/services/api.ts` is set to `/api`

## Default Credentials
- Username: `admin`
- Password: `1234`

## Deployment
Configured for autoscale deployment:
- Build: `cd frontend && npm run build`
- Run: `cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 5000`
