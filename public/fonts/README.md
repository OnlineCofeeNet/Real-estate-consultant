# فونت‌های محلی (Self-hosted)

برای نمایش بهینه فارسی روی همه دستگاه‌ها (به‌خصوص آفلاین و اندروید):

1. فایل‌های زیر را دانلود و در همین پوشه قرار دهید:

   - `Vazirmatn-Variable.woff2` یا `Vazirmatn-Regular.woff2`
   - `IRANSans.woff2`
   - `IRANSans-Bold.woff2` (اختیاری)

2. منابع پیشنهادی:
   - Vazirmatn: https://github.com/rastikerdar/vazirmatn
   - IRANSans: نسخه وب‌فونت رسمی

3. پس از قرار دادن فایل‌ها، CSS به‌صورت خودکار از مسیر `/fonts/...` استفاده می‌کند.

اگر فایل‌ها موجود نباشند، سیستم به CDN و سپس به فونت‌های سیستمی (Tahoma / Segoe UI) fallback می‌کند.
