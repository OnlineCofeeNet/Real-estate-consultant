# پشتیبانی آفلاین، PWA و پشتیبان‌گیری دوگانه

## خلاصه تغییرات این نسخه

### ۱. فونت‌ها (سازگاری با همه دستگاه‌ها)
- تعریف `@font-face` با اولویت فایل محلی (`/fonts/*.woff2`)
- fallback به CDN و سپس فونت‌های سیستمی (Tahoma, Segoe UI)
- `font-display: swap` برای جلوگیری از متن نامرئی
- بهبود رندر روی اندروید و iOS

**اقدام لازم:** فایل‌های woff2 را طبق `public/fonts/README.md` اضافه کنید.

### ۲. قابلیت PWA (نصب روی ویندوز و اندروید)
- `public/manifest.json` — قابل نصب از مرورگر
- `public/sw.js` — Service Worker با استراتژی Network-first
- ثبت خودکار SW در `index.html`
- متا‌تگ‌های Apple و theme-color

**نحوه نصب:**
- اندروید (Chrome): منوی مرورگر → «افزودن به صفحه اصلی» یا Install
- ویندوز (Edge/Chrome): آیکون Install در نوار آدرس

### ۳. پشتیبان‌گیری آفلاین + سرور

| نوع | روش |
|-----|------|
| آفلاین (فایل) | دانلود JSON کامل / بازیابی از فایل |
| آفلاین (محلی) | ذخیره خودکار در localStorage هنگام بستن تب (حداکثر ۵ نسخه) |
| سمت سرور | API `/api/backup` — ذخیره در پوشه `backups/` روی سرور |

کامپوننت UI: `src/components/BackupPanel.tsx`

برای استفاده در تنظیمات، این کامپوننت را در صفحه Settings import و رندر کنید:

```tsx
import BackupPanel from '../components/BackupPanel';
// ...
<BackupPanel />
```

### ۴. API سرور

```
GET  /api/backup          → لیست پشتیبان‌ها
POST /api/backup          → ذخیره پشتیبان جدید
GET  /api/backup/:id      → دریافت یک پشتیبان
DELETE /api/backup/:id    → حذف
```

پوشه `backups/` در ریشه پروژه ایجاد می‌شود و حداکثر ۳۰ نسخه نگه داشته می‌شود.

### ۵. محدودیت‌های فعلی آفلاین
- داده‌های داینامیک هنوز از API می‌آیند → برای آفلاین کامل نیاز به لایه IndexedDB + Sync است (فاز بعدی طبق WEBAPP-UPGRADE.md).
- Service Worker فقط فایل‌های استاتیک و صفحه اصلی را کش می‌کند.

### مراحل بعدی پیشنهادی
1. اضافه کردن فایل‌های فونت محلی
2. قرار دادن `<BackupPanel />` در Settings
3. اتصال route پشتیبان در `src/routes/api.ts` یا `server.ts`
4. توسعه Offline Queue برای پیام‌ها
