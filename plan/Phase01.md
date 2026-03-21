
# Phase01 – الأساس والبنية والهوية

## الأهداف
- تهيئة المستودع، Docker Postgres، مشاريع Front/Back.
- تطبيق Theme + Design Tokens (الألوان + الزوايا + الظلال).
- مكوّنات أساسية: Buttons, Cards, UnifiedModal, IconButton, Inputs.
- Layout عام: Header + Sidebar + Content.
- Dashboard مبدئي (Quick Actions + 4 Stats + أقسام فارغة).

## المهام
1) إنشاء `hanouti/` بهيكل المجلدات.
2) إعداد Docker Compose لـ Postgres + متغيرات البيئة.
3) تهيئة FastAPI + SQLAlchemy + Alembic.
4) تهيئة React + Vite + MUI + RTL + Theme (الألوان والـ radius).
5) بناء مكوّنات UI الأساسية (Rounded).
6) بناء Layout الأساسي وصفحة `/dashboard`.

## نقاط القبول (Acceptance)
- تشغيل `pnpm dev` و `uvicorn` بنجاح.
- رؤية الـ Sidebar/Header والـ Dashboard الفارغ.
- المكوّنات الأساسية تظهر Rounded، والألوان مطبقة.

## اختبارات
- لقطات بصرية (Storybook اختياري).
- وحدة: اختبار إعدادات Config و Health endpoint.
