# مكونات UI الأساسية - Hanouti Design System

هذا المجلد يحتوي على جميع مكونات واجهة المستخدم الأساسية المستخدمة في نظام حانوتي.

## 📋 المكونات المتاحة

### 1. **UnifiedModal** - نافذة منبثقة موحدة
نافذة منبثقة احترافية مع تصميم موحد عبر التطبيق.

**المميزات:**
- تصميم موحد (رأس/جسم/تذييل)
- انتقالات سلسة (Fade + Slide)
-روايا دائرية (Rounded)
- دعم RTL كامل
- تأثيرات بصرية متقدمة

**مثال الاستخدام:**
```typescript
import { UnifiedModal, CustomButton } from '@/components/Common';

<UnifiedModal
  open={open}
  onClose={handleClose}
  title="عنوان النافذة"
  maxWidth="md"
  actions={
    <>
      <CustomButton onClick={handleClose}>إلغاء</CustomButton>
      <CustomButton variant="contained" onClick={handleSave}>حفظ</CustomButton>
    </>
  }
>
  <p>محتوى النافذة المنبثقة هنا...</p>
</UnifiedModal>
```

---

### 2. **CustomIconButton** - زر أيقونة مخصص
زر أيقونة بتأثيرات بصرية محسنة.

**المميزات:**
- زوايا دائرية
- تأثيرات hover متحركة
- دعم tooltip
- variants للألوان المختلفة
- تأثير النبض عند الضغط

**مثال الاستخدام:**
```typescript
import CustomIconButton from '@/components/Common/CustomIconButton';
import { Edit, Delete } from '@mui/icons-material';

<CustomIconButton
  tooltip="تعديل"
  variant="primary"
  onClick={handleEdit}
>
  <Edit />
</CustomIconButton>

<CustomIconButton
  tooltip="حذف"
  variant="error"
  onClick={handleDelete}
>
  <Delete />
</CustomIconButton>
```

---

### 3. **CustomInput** - حقل إدخال مخصص
حقل إدخال بتصميم موحد ومحسن.

**المميزات:**
- زوايا دائرية
- تأثيرات focus محسنة
- دعم الأيقونات (start/end)
- تحقق بصري فوري
- دعم RTL

**مثال الاستخدام:**
```typescript
import { CustomInput } from '@/components/Common';
import { Search } from '@mui/icons-material';

<CustomInput
  label="اسم المنتج"
  placeholder="أدخل اسم المنتج"
  startIcon={<Search />}
  value={productName}
  onChange={handleChange}
  required
/>
```

---

### 4. **CustomSelect** - قائمة اختيار مخصصة
قائمة اختيار بتصميم محسن وتأثيرات انتقالية.

**المميزات:**
- زوايا دائرية
- قائمة منسدلة محسنة
- دعم الأيقونات في الخيارات
- تأثيرات hover سلسة
- تصميم متسق

**مثال الاستخدام:**
```typescript
import { CustomSelect } from '@/components/Common';

const options = [
  { value: 1, label: 'الفئة الأولى' },
  { value: 2, label: 'الفئة الثانية' },
  { value: 3, label: 'الفئة الثالثة', disabled: true },
];

<CustomSelect
  label="اختر الفئة"
  options={options}
  value={selectedCategory}
  onChange={handleCategoryChange}
  required
/>
```

---

### 5. **CustomButton** - زر مخصص
زر بتصميم احترافي مع ميزات متقدمة.

**المميزات:**
- زوايا دائرية
- حالة التحميل (loading state)
- خيار التدرج اللوني
- دعم الأيقونات
- تأثيرات hover وانتقالية

**مثال الاستخدام:**
```typescript
import { CustomButton } from '@/components/Common';
import { Add } from '@mui/icons-material';

// زر عادي
<CustomButton variant="contained">
  حفظ
</CustomButton>

// زر مع أيقونة
<CustomButton variant="outlined" icon={<Add />}>
  إضافة جديد
</CustomButton>

// زر بتدرج لوني
<CustomButton variant="contained" gradient>
  حفظ التغييرات
</CustomButton>

// زر بحالة تحميل
<CustomButton variant="contained" loading={isLoading}>
  حفظ
</CustomButton>
```

---

### 6. **CustomCard** - بطاقة مخصصة
بطاقة بتصميم احترافي ومتعدد الاستخدامات.

**المميزات:**
- زوايا دائرية
- تأثيرات hover اختيارية
- حدود ملونة قابلة للتخصيص
- تأثير glassmorphism
- تدرجات لونية خلفية
- تصميم تفاعلي

**مثال الاستخدام:**
```typescript
import { CustomCard } from '@/components/Common';
import { CardContent, Typography } from '@mui/material';

// بطاقة عادية
<CustomCard>
  <CardContent>
    <Typography variant="h6">عنوان البطاقة</Typography>
    <Typography>محتوى البطاقة</Typography>
  </CardContent>
</CustomCard>

// بطاقة مع تأثيرات
<CustomCard
  hoverEffect
  borderColor="#0052CC"
  borderPosition="left"
  interactive
  onClick={handleClick}
>
  <CardContent>
    <Typography>بطاقة تفاعلية</Typography>
  </CardContent>
</CustomCard>

// بطاقة بتأثير الزجاج
<CustomCard glassEffect gradient>
  <CardContent>
    <Typography>بطاقة بتأثير زجاجي</Typography>
  </CardContent>
</CustomCard>
```

---

## 🎨 نظام الألوان

المكونات تستخدم نظام الألوان المحدد في `Context.md`:

- **Primary**: `#0052CC` - أزرق احترافي
- **Secondary**: `#00B8D9` - سماوي
- **Success**: `#36B37E` - أخضر
- **Warning**: `#FFAB00` - برتقالي
- **Error**: `#FF5630` - أحمر
- **Background**: `#F4F5F7` - رمادي فاتح
- **Surface**: `#FFFFFF` - أبيض
- **Text Primary**: `#172B4D` - أزرق داكن
- **Text Secondary**: `#6B778C` - رمادي

## 📐 المبادئ التصميمية

1. **Rounded Everywhere**: جميع العناصر بزوايا دائرية (border-radius)
2. **Smooth Transitions**: انتقالات سلسة بين الحالات
3. **RTL Support**: دعم كامل للغة العربية من اليمين لليسار
4. **Consistent Experience**: تجربة موحدة عبر التطبيق
5. **Interactive Feedback**: ردود فعل بصرية واضحة للتفاعلات

## 🔧 التثبيت والاستخدام

```typescript
// استيراد المكونات
import {
  UnifiedModal,
  CustomIconButton,
  CustomInput,
  CustomSelect,
  CustomButton,
  CustomCard
} from '@/components/Common';

// أو استيراد مكون واحد
import CustomButton from '@/components/Common/CustomButton';
```

## 📝 ملاحظات

- جميع المكونات تدعم جميع خصائص المكونات الأصلية من MUI
- يمكن تخصيص الأنماط عبر خاصية `sx`
- المكونات مبنية بطريقة قابلة لإعادة الاستخدام
- توثيق كامل باللغة العربية
- دعم TypeScript الكامل

---

**تم الإنشاء بواسطة**: فريق تطوير حانوتي  
**التاريخ**: نوفمبر 2025  
**الإصدار**: 1.0.0
