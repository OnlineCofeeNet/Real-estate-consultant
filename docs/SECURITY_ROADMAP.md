# نقشه راه امنیت و استقرار

## وضعیت فعلی

- احراز هویت local-first با PBKDF2 و salt تصادفی
- نشست با عمر محدود و timeout عدم فعالیت
- RBAC در رابط کاربری
- مدیریت کاربران و رمز عبور
- Audit Log محلی

## مرحله بعدی الزامی برای محیط چندکاربره

1. PostgreSQL به‌عنوان منبع اصلی داده
2. API احراز هویت سمت سرور با session cookie امن (`HttpOnly`, `Secure`, `SameSite`)
3. RBAC سمت سرور؛ هیچ مجوزی صرفاً به UI وابسته نباشد
4. انتقال مشتریان، قراردادها، فاکتورها و پرداخت‌ها به DB مرکزی
5. انتقال Tokenهای Telegram/Bale/Rubika و اطلاعات SMS/POS به Secret Manager یا متغیرهای محیطی امن
6. عدم دریافت Token ربات از مرورگر در endpointهای ارسال پیام
7. rate limiting سمت سرور برای login و endpointهای حساس
8. CSRF protection برای درخواست‌های state-changing در صورت استفاده از cookie session
9. ثبت Audit Log سمت سرور با actor، زمان، IP، entity و نتیجه عملیات
10. backup رمزنگاری‌شده و برنامه restore آزمایش‌شده
11. health/readiness endpoint و logging ساختاریافته
12. تست خودکار برای احراز هویت، RBAC، قرارداد، فاکتور و پرداخت

این سند مرز بین hardening فعلی و معماری production-grade را مشخص می‌کند.
