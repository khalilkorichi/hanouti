# Hanouti — حانوتي

> نظام إدارة المخزون ونقاط البيع الذكي، باللغة العربية، يعمل بالكامل دون إنترنت.
> Smart Inventory & POS for small Algerian/Arabic shops — fully offline-first, RTL-native.

<p align="center">
  <a href="https://github.com/khalilkorichi/hanouti/releases/latest">
    <img alt="Latest release" src="https://img.shields.io/github/v/release/khalilkorichi/hanouti?label=%D8%A2%D8%AE%D8%B1%20%D8%A5%D8%B5%D8%AF%D8%A7%D8%B1&style=for-the-badge&color=0EA5E9">
  </a>
  <a href="https://github.com/khalilkorichi/hanouti/releases/latest">
    <img alt="Downloads" src="https://img.shields.io/github/downloads/khalilkorichi/hanouti/total?label=%D8%AA%D9%86%D8%B2%D9%8A%D9%84%D8%A7%D8%AA&style=for-the-badge&color=10B981">
  </a>
  <img alt="Platform" src="https://img.shields.io/badge/Windows-10%2F11-0078D4?style=for-the-badge&logo=windows">
  <img alt="License" src="https://img.shields.io/badge/license-Proprietary-A855F7?style=for-the-badge">
</p>

---

## ⚡ التحميل السريع — Quick Download

<p align="center">
  <a href="https://github.com/khalilkorichi/hanouti/releases/latest/download/Hanouti-Setup-1.0.0-x64.exe">
    <img src="https://img.shields.io/badge/%E2%AC%87%EF%B8%8F_%D8%AA%D9%86%D8%B2%D9%8A%D9%84_%D9%84%D9%80_Windows-Hanouti--Setup--x64.exe-0EA5E9?style=for-the-badge&logo=windows&logoColor=white" alt="Download for Windows" height="60">
  </a>
</p>

> **رابط ثابت يحدّث نفسه تلقائياً** — يحوّلك دائماً إلى أحدث نسخة:
> [`releases/latest/download/Hanouti-Setup-x64.exe`](https://github.com/khalilkorichi/hanouti/releases/latest)

### التثبيت (3 خطوات)
1. **حمّل** المثبّت من الرابط أعلاه (~70 ميغابايت)
2. **شغّل** `Hanouti-Setup-x64.exe` → اختر اللغة (العربية مفعّلة افتراضياً) → التالي
3. **افتح** "Hanouti" من قائمة ابدأ أو من اختصار سطح المكتب

> ⚠️ عند أوّل تشغيل قد يظهر تحذير **Windows SmartScreen** لأن المثبّت غير مُوقّع رقمياً بعد. اضغط **"المزيد من المعلومات" → "تشغيل على أي حال"**. سنضيف توقيعاً رقمياً قريباً.

---

## ✨ الميزات

- 🛍️ **نقطة بيع كاملة** — فاتورة سريعة، باركود، خصومات، طرق دفع متعدّدة
- 📦 **إدارة المخزون** — منتجات، كميات، حدّ أدنى، تنبيهات نفاد
- 📊 **تقارير ذكية** — مبيعات يومية/شهرية، أكثر المنتجات مبيعاً، KPIs
- 👥 **متعدّد المستخدمين** — أدوار وصلاحيات (مدير، بائع، محاسب)
- 💾 **تخزين محلي بالكامل** — قاعدة بيانات SQLite في `%APPDATA%\Hanouti\data\`
- 🌙 **وضع داكن وفاتح** — مع دعم RTL كامل للواجهة العربية
- 🔄 **تحديث تلقائي** — من إعدادات التطبيق مباشرة (دون إعادة تثبيت)
- 🔒 **آمن** — تجزئة كلمات المرور بـ Argon2، JWT للجلسات

---

## 🔄 نظام التحديث التلقائي

التطبيق يحتوي **نظامين للتحديث**:

### 1. تحديث سريع داخل التطبيق (الإعدادات → التحديثات)
- يقارن الملفات مع GitHub بشكل ذكي (SHA-verified)
- يحمّل ما تغيّر فقط (لا تحميل كامل)
- يطبّق التحديث بشكل **ذرّي** — إذا فشل، يعود تلقائياً للنسخة السابقة
- آمن من أعطال الكهرباء — له تعافٍ عند البدء التالي

### 2. تحديث الإصدار الكامل (تحميل المثبّت من جديد)
عند صدور إصدار رئيسي جديد، يفتح التطبيق صفحة Releases تلقائياً.

---

## 🛡️ الأمان والخصوصية

- ✅ **لا يُرسل أي بيانات خارج جهازك** — عمل أوفلاين 100%
- ✅ **قاعدة البيانات محلّية** في `%APPDATA%\Hanouti\data\hanouti.db`
- ✅ **النسخ الاحتياطية** يدوية وتحت تحكّمك الكامل
- ✅ **لا تتبّع، لا إعلانات، لا حسابات سحابية إجبارية**

---

## 📋 متطلّبات التشغيل

| المكوّن | الحد الأدنى | المُوصى به |
|--------|-------------|-------------|
| النظام | Windows 10 (1809+) x64 | Windows 11 x64 |
| الذاكرة | 2 GB RAM | 4 GB RAM |
| القرص الصلب | 200 MB | 500 MB |
| الشاشة | 1024×768 | 1366×768+ |

---

## 🏗️ البناء من المصدر

للمطوّرين فقط — راجع [README-WINDOWS.md](./README-WINDOWS.md) للتعليمات الكاملة.

```powershell
# على Windows 10/11 مع Node 20 + Python 3.12
git clone https://github.com/khalilkorichi/hanouti.git
cd hanouti
npm install --legacy-peer-deps
pip install -r backend/requirements-build.txt
npm run dist:win
# → release/Hanouti-Setup-1.0.0-x64.exe
```

أو ببساطة **ادفع علامة إصدار** (`v1.0.x`) إلى المستودع وسير العمل التلقائي على GitHub Actions يبني المثبّت وينشره في Releases خلال ~10 دقائق.

---

## 🤝 المساهمة والدعم

- 🐛 **بلّغ عن خطأ:** [Issues](https://github.com/khalilkorichi/hanouti/issues)
- 💡 **اقترح ميزة:** [Discussions](https://github.com/khalilkorichi/hanouti/discussions)
- 📧 **تواصل مباشر:** khalil@hanouti.app

---

## 📜 الترخيص

برمجية احتكارية — جميع الحقوق محفوظة لخليل قريشي © 2026.
الاستخدام التجاري يتطلّب ترخيصاً صريحاً.

---

<p align="center">
  صُنع بـ ❤️ في الجزائر — Made with ❤️ in Algeria
</p>
