---
trigger: always_on
---

# CodingGuide

هذا الدليل يصف ال Stack، هيكلة الأكواد، الأوامر، أدوات الديباغ، وكيفية التشغيل محليًا وإنتاجيًا.

## 1) المتطلبات
- Node.js ≥ 20, PNPM أو NPM
- Python ≥ 3.11, Poetry أو uv
- Docker + Docker Compose (PostgreSQL)
- Git

## 2) بنية المستودع
```
hanouti/
├─ backend/
│  └─ app/
│     ├─ main.py
│     ├─ api/ (products.py, sales.py, inventory.py, reports.py, auth.py)
│     ├─ models/ (product.py, sale.py, sale_item.py, category.py, customer.py, stock_move.py)
│     ├─ schemas/ (pydantic)
│     ├─ services/ (product_service.py, sale_service.py, ai_service.py)
│     ├─ db/ (session.py, init_db.py, migrations/)
│     └─ core/ (config.py, security.py, pagination.py)
└─ frontend/
   └─ src/ (pages, components, hooks, services, theme, assets)
```

## 3) الإعداد السريع

### قاعدة البيانات (Docker)
```bash
docker compose up -d postgres
# DB URL: postgresql://hanouti:hanouti@localhost:5432/hanouti
```

### Backend (FastAPI)
- مدير الحزم: **Poetry** (أو uv)
```bash
cd backend
poetry install
poetry run alembic upgrade head    # تطبيق الهجرات
poetry run uvicorn app.main:app --reload --port 8000
```
- .env (مثال):
```
DATABASE_URL=postgresql://hanouti:hanouti@localhost:5432/hanouti
JWT_SECRET=change-me
JWT_EXPIRES=3600
DEFAULT_PASSWORD_HASH=$2b$12$<bcrypt-of-1234>
TAX_DEFAULT=0.00
```
- الهجرات: Alembic (مجلد migrations).

### Frontend (React + Vite + MUI)
```bash
cd frontend
pnpm i
pnpm dev
```
- تفعيل RTL، إضافة Theme بالألوان المذكورة.
- إضافة MUI DataGrid، dnd-kit، React Hook Form + Zod، TanStack Query، Zustand، Recharts، xlsx.

## 4) أدوات الديباغ
- **Backend:**
  - Uvicorn `--reload` + Logging (DEBUG في dev).
  - FastAPI Docs: `http://localhost:8000/docs`
  - SQL echo اختياري في dev لرصد الاستعلامات.
  - pytest + coverage.
- **Frontend:**
  - React DevTools، **TanStack Query Devtools**.
  - ESLint + Prettier (قواعد موحّدة).
  - React Error Boundary لالتقاط الأخطاء.

## 5) معيار الكود
- Type hints في Python.
- ESLint config موحّد + Prettier.
- أسماء ملفات/دوال واضحة: `add_product_to_stock`, `complete_sale`.
- عدم ربط UI بـ business logic مباشرة—استعمل services.

## 6) وحدات جاهزة (Contracts مختصرة)

### Auth
- `POST /auth/login {password}` → JWT كوكي httpOnly. يرفض عند خطأ.
- إجبار تغيير كلمة المرور الافتراضية.

### Products
- `GET /products?query=&category=&status=&unit=&sort=&page=&limit=`
- `POST /products` / `PUT /products/{id}` / `DELETE ...`
- Import/Export باستخدام SheetJS (Front) + CSV/Excel (Back).

### Sales
- `POST /sales` (draft) → `POST /sales/{id}/complete`
- `POST /sales/{id}/cancel` (سبب الإلغاء)
- `GET /sales?...` ، `GET /sales/{id}` تفاصيل + PDF.

### Inventory
- `GET /inventory` (قائمة مدمجة) + `GET /stock/movements`

### Reports
- `GET /reports/kpis?period=last_30`
- `GET /reports/sales`
- `GET /reports/top-products`
- `GET /reports/stock-status`

## 7) PDF/طباعة
- خادمي: WeasyPrint لقوالب HTML/CSS → PDF.
- عميل: react-to-print لحالات فورية.
- الخطوط تدعم العربية، اتجاه RTL.

## 8) الأمن
- Hash للسر (bcrypt)، كوكي httpOnly، CSRF على POST الحسّاس.
- Rate limit على `/sales/*`، `/auth/*`.
- Audit log لإلغاء الفواتير وتعديل الأسعار/الكميات.

## 9) الأداء
- فهارس DB صحيحة، استخدام `ILIKE` على LOWER(name) مع index.
- Pagination خادمي + Cursor حيث يلزم.
- Virtualized lists (MUI DataGrid + virtualization).

## 10) الذكاء الاصطناعي (لاحقًا)
- `ai_service.get_restock_suggestions()`
- `ai_service.chat_about_inventory(question)`
