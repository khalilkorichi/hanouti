# Hanouti - Smart Inventory & POS System

## Overview
Hanouti is an AI-powered Smart Inventory and Point of Sale (POS) system designed for retail businesses. It's a full-stack application aimed at providing comprehensive inventory management, sales processing, and reporting capabilities. The project's vision is to offer a robust and user-friendly system that streamlines retail operations, enhances efficiency through intelligent features, and provides valuable business insights.

## User Preferences
I prefer explanations that are straightforward and to the point. When implementing new features or making significant changes, please propose the approach first and wait for my approval before proceeding. I value iterative development and clear communication regarding progress and potential roadblocks. Do not make changes to the folder `electron/` or `electron-builder.yml`. Do not make changes to the file `backend/run_exe.py`.

## System Architecture
Hanouti is built as a full-stack application with a clear separation of concerns.

**Frontend:**
-   **Technology Stack:** React 19, TypeScript, Vite, Material UI v7, TanStack Query, Zustand.
-   **Performance:** Code splitting and lazy loading for pages via `React.lazy + Suspense`. All routes are preloaded after login using `requestIdleCallback` for instant navigation.
-   **UI/UX:**
    -   **Theming:** Centralized theme management (`ThemeContext.tsx`) for `mode` (light/dark), `primaryColor`, `fontSize`, `radius`, `density`, and `animSpeed`. All components derive styling from the theme, ensuring consistency.
    -   **RTL Support:** Full Right-to-Left (RTL) support implemented via `@mui/stylis-plugin-rtl` and logical CSS properties (`marginInlineStart`, `insetInlineEnd`, etc.). A single root `dir="rtl"` in `MainLayout.tsx` governs the primary layout.
    -   **Components:** Utilizes custom components for consistency (e.g., `CustomCard`, `PageHeader`) and implements glassmorphism for header, gradient stat cards, and animated hover states.
    -   **Font:** Cairo (Arabic) with Tajawal fallback.
    -   **Layout:** Persistent collapsible sidebar for desktop, temporary drawer for mobile.
    -   **Notifications:** Multi-notification queue system with up to 5 simultaneous toasts, progress bars, and interaction features.
-   **Cashier Workflow:** Optimized Sales page with keyboard shortcuts (F1-F4, F8-F10, +/-, Shift+?) for quick actions. Barcode quick-add supports `N*BARCODE` multiplier syntax.

**Backend:**
-   **Technology Stack:** FastAPI (Python), SQLAlchemy ORM, Uvicorn, GZip middleware.
-   **Database:** SQLite with WAL mode by default, with PostgreSQL support via `DATABASE_URL` environment variable.
-   **Data Model:** ORM models defined in `models.py` with corresponding Pydantic schemas for validation.
-   **API Structure:** Modular routers for authentication, products, categories, sales, inventory, reports, and backup.
-   **Reports:** Comprehensive reporting capabilities including KPIs, sales over time, top products, stock status, profit margins, sales by category, payment methods, sales by weekday/hour, and inventory value. Special attention to SQLAlchemy aggregate queries for correct joins.

**Desktop Edition (Windows):**
-   **Framework:** Electron 33 with `electron-builder` for packaging into a Windows `.exe`.
-   **Auto-updater:** Robust auto-updater leveraging GitHub Releases API with SHA-256 file-level comparison for atomic updates. Supports both full installer updates and frontend-only "hot" updates.
-   **Hot Updates:** Frontend-only changes can be applied live without requiring a full reinstall, using `frontend-dist.tar.gz` assets and an atomic channel switching mechanism. Includes self-healing properties for corrupted updates.
-   **Backend Integration:** The Electron app spawns `backend.exe` as a bundled process, managing its lifecycle and database path.

## External Dependencies
-   **React:** Frontend framework.
-   **Vite:** Frontend build tool.
-   **Material UI:** UI component library.
-   **TanStack Query:** Data fetching and caching library.
-   **Zustand:** State management library.
-   **FastAPI:** Backend web framework.
-   **SQLAlchemy:** Python ORM for database interaction.
-   **Uvicorn:** ASGI server for FastAPI.
-   **SQLite:** Default database.
-   **PostgreSQL:** Optional database.
-   **Electron:** Framework for desktop application.
-   **electron-builder:** Tool for packaging Electron apps.
-   **PyInstaller:** For bundling the Python backend into an executable.
-   **Axios:** HTTP client for API calls.
-   **@mui/stylis-plugin-rtl:** For RTL styling with Material UI.