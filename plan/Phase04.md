# Phase04 – نقطة البيع (POS)

## الأهداف
- مستكشف المنتجات (بحث/فلاتر/شبكة Rounded + Hover).
- سحب وإفلات الكروت إلى السلة (dnd-kit).
- سلة قابلة للتعديل الفوري (Qty/Price/Remove).
- خصم/ضريبة/إجمالي + طرق دفع.
- حفظ تلقائي واسترجاع للسلة.

## المهام
1) مكوّن ProductExplorer (بحث ILIKE على name/barcode/SKU، فلاتر فئة/حالة/ترتيب).
2) Grid 4×… Responsive + Lazy Loading.
3) CartPanel (قائمة + Summary + Payment).
4) AutoSave/Restore (Local + Server).
5) `POST /sales (draft)` + حسابات الإجمـالي.
6) `POST /sales/{id}/complete` مع تحقق المخزون + خصم الكميات + PDF.

## القبول
- Drag&Drop يعمل + Highlight للسلة.
- منع بيع كمية أكبر من المتوفرة برسالة واضحة.
- طباعة فاتورة PDF عربية RTL.

## اختبارات
- تكامل: create draft → add items → complete.
- UI: اختصارات Enter/Esc/F9/F10 تعمل.
