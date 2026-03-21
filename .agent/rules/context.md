---
trigger: always_on
---

# Context

> **Hanouti – نظام إدارة المخزون والمبيعات بواجهة عصرية**  
هذا الملف يوثّق كل قرار تم اتخاذه، ولماذا اتخذناه. فكرة الملف: *سجلّ قرارات* (Decision Log). أي تفصيلة—even فاصلة—نكتب سببها.

## 1) الهوية البصرية و الـ Design System
- **قاعدة شكلية (Golden Rule):** جميع العناصر التفاعلية مربعات بزوايا دائرية (Rounded Rectangles). لا زوايا حادّة.  
  السبب: توحيد اللغة البصرية + راحة عين + سهولة تمييز المناطق التفاعلية.
- **الأيقونات:** Solid + Rounded + تفاعلية (Hover/Active)، حجم موحّد (24px في الأغلب).  
  السبب: ثبات الهوية وتقليل الحمل المعرفي.
- **الألوان (مستوحاة من Daftra):**
  - Primary: `#0052CC`
  - Secondary: `#00B8D9`
  - Accent/Success: `#36B37E`
  - Warning: `#FFAB00`
  - Danger: `#FF5630`
  - Background: `#F4F5F7`
  - Surface: `#FFFFFF`
  - Text Primary: `#172B4D`
  - Text Secondary: `#6B778C`
  السبب: تباين جيد، مظهر مهني، سهولة قراءة.

- **المودالات (UnifiedModal):** نفس الرأس/الجسم/التذييل، نفس الأنيميشن (Fade + Scale)، نفس أحجام الأزرار وترتيبها.  
  السبب: تعلّم سريع للمستخدم وتقليل المفاجآت.

## 2) بنية النظام (Stack) وسبب الاختيار
- **Back-end:** Python + FastAPI (+ SQLAlchemy/SQLModel).  
  السبب: سرعة التطوير + وضوح + تكامل ممتاز مع الذكاء الاصطناعي لاحقًا.
- **Database:** PostgreSQL.  
  السبب: قوة، فهارس، قابلية للتوسّع، دعم أنواع وعمليات متقدمة.
- **Front-end:** React + Vite + MUI (DataGrid) + dnd-kit (Drag & Drop) + TanStack Query + Zustand.  
  السبب: واجهات حديثة، جداول قوية، أداء ممتاز، حالة واضحة.
- **Charts:** Recharts. **PDF/Print:** WeasyPrint (خادمي) + خيار React-to-Print (عميل).
- **Excel:** SheetJS (xlsx).
- **Auth:** جلسة JWT عبر كوكي httpOnly. كلمة مرور افتراضية 1234 **مشفّرة** (bcrypt) + مطالبة بتغييرها.

## 3) الصفحات والميزات (ملخّص)
- **Login:** شاشة احترافية، صندوق Rounded، زر دخول، “تذكرني”، خطأ واضح.
- **Dashboard:** Quick Actions + 4 Stats + Recent Sales + Top Products، ألوان موحّدة.
- **POS (Sales Page):** مستكشف منتجات (بحث/فلاتر/شبكة/سحب)، سلة (تعديل فوري/خصم/ضرائب)، إتمام البيع، طباعة PDF.
- **Sales List:** فلاتر تاريخ/طريقة دفع/حالة، جدول، نافذة تفاصيل، إلغاء/طباعة.
- **Products:** شريط أدوات (إضافة/فئات/استيراد/تصدير)، كروت/جداول، نافذة إضافة/تعديل، تحقق فوري.
- **Inventory:** جدول قوي + تعديل سريع + حركة مخزون + مؤشرات لونية.
- **Reports:** KPIs + خطوط/أعمدة/دونات + تقارير تفصيلية + تصدير PDF/Excel.
- **Settings:** عام/بيع/أمان/نسخ احتياطي/استعادة/حول/إعادة تعيين مع تأكيد مزدوج.
- **Notifications:** Toast + لوحة جرس + عدّاد غير مقروء.

## 4) قاعدة البيانات (نظرة عامة)
- `products(id, name, sku, barcode, category_id, unit, purchase_price, sale_price, qty, min_qty, reorder_point, created_at, updated_at)`  
  فهارس: (LOWER(name), sku, barcode), category_id, qty, updated_at.
- `categories(id, name, is_active)`
- `customers(id, name, phone, balance, created_at)` (+ فهرس phone)
- `sales(id, invoice_no, customer_id, status, payment_method, subtotal, discount_value, discount_type, tax_value, total, paid_amount, due_amount, created_at)`  
  فهارس: created_at, status, payment_method, customer_id.
- `sale_items(id, sale_id, product_id, qty, unit_price, tax_rate, line_total)`
- `stock_movements(id, product_id, change, reason, ref_type, ref_id, created_at)`

> **ملاحظة:** كل عمليات البيع تتم داخل Transaction لضمان سلامة البيانات.

## 5) الأداء
- **Pagination خادمي** + **Cursor** للبيانات الضخمة.
- **Lazy Loading** + **Virtualized Lists** في الجداول الضخمة.
- **فهارس صحيحة** لكل حقول البحث والفرز.
- **Debounce** للبحث 300–500ms.

## 6) الأمان
- كلمة 1234 مخزّنة كـ hash (bcrypt/argon2). إجبار تغييرها أول دخول.
- كوكي httpOnly + CSRF حماية النماذج الحسّاسة.
- سجل تدقيق (Audit) لعمليات: إلغاء فاتورة/تعديل سعر/كمية.

## 7) أشياء دقيقة (نكتبها، ولماذا):
- **Rounded Everywhere:** حتى حقول الإدخال → لأن “نَفَس” بصري موحّد.
- **Sparklines** داخل البطاقات → لمحة بصرية سريعة بلا ازدحام.
- **Toast مع شريط تقدم** → يختفي تلقائيًا ويعطي إحساس استجابة.
- **Drag & Drop بظلال/Outline** → Feedback حسي واضح للمستخدم.

## 8) مكونات UI الأساسية (Phase 01 - تم الإنجاز ✅)
تمّ إنشاء جميع مكونات واجهة المستخدم الأساسية المطلوبة في Phase 01:

### **UnifiedModal** - نافذة منبثقة موحدة
- تصميم موحد (Header/Content/Actions)
- انتقالات سلسة (Slide + Scale Animation)
- دعم RTL كامل + زوايا دائرية
- تأثيرات backdrop blur
- التاريخ: 2025-11-20

### **CustomIconButton** - زر أيقونة مخصص
- Variants للألوان (primary, secondary, success, warning, error, info)
- تأثيرات hover متحركة (scale + shadow)
- دعم Tooltip تلقائي
- تأثير النبض (ripple) عند الضغط
- زوايا دائرية متسقة

### **CustomInput** - حقول إدخال مخصصة
- نمطين: outlined و filled
- دعم الأيقونات (startIcon/endIcon)
- تأثيرات focus محسّنة مع box-shadow
- حالات: عادي، خطأ، معطّل
- انتقالات سلسة بين الحالات

### **CustomSelect** - قائمة اختيار مخصصة
- قائمة منسدلة محسّنة مع تأثيرات
- دعم الأيقونات في الخيارات
- تدوير أيقونة السهم عند الفتح
- تأثير translateX عند hover على الخيار
- زوايا دائرية في القائمة

### **CustomButton** - أزرار مخصصة
- حالة التحميل (loading) مع CircularProgress
- خيار التدرج اللوني (gradient)
- 3 أنماط: contained, outlined, text
- تأثير الموجة (wave) عند الضغط
- دعم الأيقونات الاختيارية

### **CustomCard** - بطاقات مخصصة
- تأثير hover اختياري
- حدود ملونة (top/left/right/bottom)
- تأثير glassmorphism (شفافية + blur)
- تدرجات لونية خلفية
- حالة تفاعلية (interactive) للأزرار

**الملفات المُنشأة:**
- `/frontend/src/components/Common/UnifiedModal.tsx`
- `/frontend/src/components/Common/CustomIconButton.tsx`
- `/frontend/src/components/Common/CustomInput.tsx`
- `/frontend/src/components/Common/CustomSelect.tsx`
- `/frontend/src/components/Common/CustomButton.tsx`
- `/frontend/src/components/Common/CustomCard.tsx`
- `/frontend/src/components/Common/index.ts` (ملف التصدير الموحد)
- `/frontend/src/components/Common/README.md` (توثيق شامل)
- `/frontend/src/pages/ComponentsDemo.tsx` (صفحة عرض توضيحية)

**تحديثات Theme:**
- تطبيق الألوان المحددة من Daftra (Primary: #0052CC، Secondary: #00B8D9، إلخ)
- تحسين الألوان للوضع الليلي (Dark Mode)
- إضافة Success, Warning, Error بألوان محددة
- تطبيق نظام Typography موحد

**القرارات المتّخذة:**
- جميع المكونات تستخدم `forwardRef` للتوافق الكامل مع MUI
- Type-only imports لتجنب مشاكل TypeScript verbatimModuleSyntax
- زوايا دائرية موحدة (borderRadius: 2 أو 3 حسب الحجم)
- انتقالات بمدة 0.3s وتوقيت cubic-bezier(0.4, 0, 0.2, 1)
- دعم كامل لجميع خصائص MUI الأصلية + خصائص مخصصة إضافية

— انتهى السياق الحالي (يتحدّث الملف معنا طول التطوير).
