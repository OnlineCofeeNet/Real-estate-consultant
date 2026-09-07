# مدل احراز هویت سامانه

## وضعیت قبل از این تغییر

نسخه قبلی routeهای React را بدون Login نمایش می‌داد و برای داده‌های local-first هیچ لایه احراز هویت نداشت. همچنین اتوماسیون پیام‌رسان در شروع برنامه می‌توانست قبل از ورود کاربر به IndexedDB و credentialهای پیام‌رسان دسترسی داشته باشد.

## معماری فعلی

```text
Browser
  |
  +--> AuthGate
  |      +--> first-run admin setup
  |      +--> login
  |      +--> session validation
  |
  +--> Layout / protected routes
  |      +--> Dashboard
  |      +--> Contracts
  |      +--> Customers
  |      +--> Finance
  |      +--> Settings (admin only)
  |
  +--> Dexie / IndexedDB
         +--> users
         +--> customers
         +--> contracts
         +--> invoices
         +--> payments
```

## Password handling

- رمز عبور هرگز به‌صورت plaintext ذخیره نمی‌شود.
- برای هر حساب یک salt تصادفی ۱۲۸ بیتی ساخته می‌شود.
- مشتق‌سازی رمز با Web Crypto PBKDF2، SHA-256 و 310,000 iteration انجام می‌شود.
- فقط `passwordHash` و `salt` در IndexedDB ذخیره می‌شوند.

## Session

Session در `sessionStorage` قرار می‌گیرد تا با بسته شدن تب از بین برود.

Session شامل شناسه کاربر، نام کاربری، نقش و زمان ایجاد است و پس از ۸ ساعت منقضی می‌شود.

این session برای نسخه local-first یک access gate است، نه جایگزین احراز هویت سمت سرور. اگر برنامه به صورت چندکاربره روی سرور منتشر شود، باید session سمت سرور با cookieهای `HttpOnly`, `Secure` و `SameSite` پیاده‌سازی شود.

## Roles

- `admin`: دسترسی کامل
- `manager`: دسترسی عملیاتی و مالی
- `agent`: قرارداد و مشتریان
- `accountant`: امور مالی

Routeها علاوه بر UI با `ProtectedRoute` کنترل می‌شوند؛ بنابراین مخفی کردن آیتم منو تنها مکانیزم امنیتی نیست.

## Automation boundary

`useAutoMessages` قبل از اجرای automation و قبل از ارسال هر پیام `hasActiveSession()` را بررسی می‌کند. Logout نیز session را پاک می‌کند و اجرای مجدد برنامه نیازمند ورود است.

## محدودیت مهم

داده‌های کسب‌وکار هنوز local-first هستند و Bot Tokenها هنوز بخشی از `Settings` هستند. برای Production چندکاربره باید مرحله بعد انجام شود:

1. انتقال کاربران، مشتریان، قراردادها و مالی به PostgreSQL.
2. ساخت API احراز هویت سمت سرور.
3. انتقال Bot/SMS credentials به environment/secret manager.
4. حذف ارسال credential از body درخواست‌های عمومی مثل `/api/send-message`.
5. افزودن CSRF protection، rate limiting، audit trail سمت سرور و rotation برای secrets.
