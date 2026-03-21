# Phase 03 – إدارة المنتجات والمخزون (التنفيذ التفصيلي)

## 🎯 الأهداف
بناء النظام الأساسي لإدارة المخزون: الفئات (Categories) والمنتجات (Products)، مع واجهات عرض قوية (DataGrid) وإمكانيات التصدير والاستيراد.

## 🛠️ المهام التقنية (Technical Tasks)

### 1. قاعدة البيانات (Backend - SQLAlchemy)
- [ ] **إنشاء النماذج (Models)**:
  - `Category`: (id, name, description, is_active, created_at).
  - `Product`: (id, name, sku, barcode, category_id, purchase_price, sale_price, stock_qty, min_qty, unit, image_url, is_active, created_at, updated_at).
- [ ] **إنشاء العلاقات**: ربط المنتج بالفئة (One-to-Many).
- [ ] **إنشاء ملفات التهجير (Migrations)**: باستخدام Alembic.

### 2. واجهة برمجة التطبيقات (Backend - FastAPI)
- [ ] **Schemas (Pydantic)**:
  - `CategoryCreate`, `CategoryUpdate`, `CategoryResponse`.
  - `ProductCreate`, `ProductUpdate`, `ProductResponse` (مع التحقق من صحة البيانات).
- [ ] **CRUD Endpoints**:
  - `GET /categories`, `POST /categories`, `PUT /categories/{id}`, `DELETE /categories/{id}`.
  - `GET /products` (مع دعم Pagination, Search, Filtering).
  - `POST /products`, `PUT /products/{id}`, `DELETE /products/{id}`.
  - `GET /products/low-stock` (للتنبيهات).

### 3. الواجهة الأمامية (Frontend - React/MUI)
- [ ] **إدارة الحالة (State Management)**:
  - استخدام `TanStack Query` لجلب البيانات وتخزينها مؤقتًا (Caching).
- [ ] **صفحة الفئات (Categories Page)**:
  - جدول بسيط أو قائمة بطاقات.
  - نافذة منبثقة (UnifiedModal) للإضافة والتعديل.
- [ ] **صفحة المنتجات (Products Page)**:
  - **MUI DataGrid**: عرض متقدم مع ترتيب، فلترة، وتصفح (Pagination).
  - **أعمدة مخصصة**: عرض الصورة، الحالة (نشط/غير نشط)، وتنسيق العملة.
  - **شريط أدوات (Toolbar)**: بحث سريع، زر إضافة، زر تصدير.
- [ ] **نافذة إدارة المنتج (Product Form)**:
  - استخدام `react-hook-form` + `zod` للتحقق.
  - تبويبات (Tabs):
    1. **بيانات أساسية**: الاسم، الباركود (توليد تلقائي)، الفئة.
    2. **التسعير**: سعر الشراء، سعر البيع، الضريبة.
    3. **المخزون**: الكمية الحالية، حد الطلب، الوحدة.

### 4. الاستيراد والتصدير (Excel/CSV)
- [ ] **التصدير (Export)**:
  - استخدام مكتبة `xlsx` (SheetJS) في المتصفح.
  - تصدير البيانات المعروضة حاليًا في الجدول.
- [ ] **الاستيراد (Import)**:
  - زر لرفع ملف Excel/CSV.
  - قراءة الملف في الواجهة الأمامية وعرض معاينة (Preview).
  - إرسال البيانات للـ Backend للمعالجة والحفظ (Bulk Insert).

## ✅ معايير القبول (Acceptance Criteria)
1. **قاعدة البيانات**: الجداول منشأة بشكل صحيح مع الفهارس (Indexes) على `sku` و `barcode`.
2. **المنتجات**:
   - لا يمكن تكرار `sku` أو `barcode`.
   - البحث يعمل بسرعة على الاسم والباركود.
   - التصفح (Pagination) يعمل بكفاءة مع عدد كبير من المنتجات.
3. **واجهة المستخدم**:
   - استجابة سريعة (Optimistic Updates عند الإمكان).
   - رسائل خطأ واضحة (مثلاً: "هذا الباركود مستخدم بالفعل").
   - تصميم متجاوب (Responsive) للجداول.

## 📅 الخطة الزمنية المقترحة
- **اليوم 1**: Backend Models + CRUD APIs.
- **اليوم 2**: Frontend Categories + Basic Product Grid.
- **اليوم 3**: Advanced Product Form + Validation.
- **اليوم 4**: Import/Export + Polish & Testing.

---
**ملاحظة**: يرجى تحديث ملف `Context.md` بأي قرارات تصميمية جديدة أثناء التنفيذ.
