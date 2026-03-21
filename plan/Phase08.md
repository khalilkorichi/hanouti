# Phase 08: Advanced Settings & UI Improvements

## الأهداف
تحسين تجربة المستخدم من خلال خيارات تخصيص متقدمة، تحسينات في الجداول ونقطة البيع، وإضافة أدوات إدارة البيانات والتعريف بالمطور.

## المهام المطلوبة

### 1. تحسينات الجداول (Global UI)
- [ ] تفعيل `checkboxSelection` في `Products.tsx`.
- [ ] تفعيل `checkboxSelection` في `SalesList.tsx`.
- [ ] تفعيل `checkboxSelection` في `Inventory.tsx`.

### 2. نقطة البيع (POS)
- [ ] تعديل `CartStore` لدعم تغيير السعر اليدوي.
- [ ] تحديث واجهة عنصر السلة (`CartItem`) للسماح بتعديل السعر (Input field or Edit Mode).

### 3. نظام الثيمات (Theming System)
- [ ] إنشاء `ThemeContext` متقدم يدعم:
  - `mode`: light/dark
  - `primaryColor`: لون مخصص
  - `fontSize`: صغير/متوسط/كبير
- [ ] تحديث `App.tsx` لاستخدام الثيم الديناميكي.
- [ ] توفير لوحات ألوان جاهزة (Presets):
  - Default (Blue)
  - Emerald (Green)
  - Purple (Violet)
  - Amber (Orange)
  - Rose (Red)

### 4. صفحة الإعدادات (Settings Page)
- [ ] **Tab: عام (General)**
  - تعديل اسم المستخدم (Mock currently, or update via Auth API if exists).
- [ ] **Tab: المظهر (Appearance)**
  - اختيار الوضع (ليلي/نهاري).
  - اختيار اللون الرئيسي (Color Picker/Presets).
  - شريط تمرير أو أزرار لحجم الخط.
- [ ] **Tab: البيانات (Data)**
  - زر "تصدير نسخة احتياطية" (JSON Download).
  - زر "استعادة نسخة احتياطية" (File Upload).
- [ ] **Tab: حول (About)**
  - شعار البرنامج.
  - "تم التطوير بواسطة: خليل قريشي".
  - زر واتساب: `https://wa.me/213663730533`.

### 5. Backend Support (Backup/Restore)
- [ ] إنشاء endpoint `GET /backup/export` لتجميع كل البيانات.
- [ ] إنشاء endpoint `POST /backup/import` لاستعادة البيانات.

## التنفيذ
سنبدأ بالـ Backend لدعم النسخ الاحتياطي، ثم ننتقل لتحسينات الـ Frontend بالترتيب.
