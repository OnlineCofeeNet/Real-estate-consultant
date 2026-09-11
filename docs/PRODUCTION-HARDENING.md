# Production Hardening

## 1. منبع حقیقت داده

PostgreSQL منبع حقیقت سامانه است. لایه `src/db/db.ts` یک API data-access layer است و IndexedDB فقط برای snapshot محلی مرورگر استفاده می‌شود.

قواعد:

- داده تجاری نهایی در PostgreSQL نگهداری می‌شود.
- UI نباید برای تصمیم امنیتی به Permission سمت مرورگر اعتماد کند.
- هر mutation باید از API عبور کند.
- قطع اینترنت باید با retry/sync queue واقعی تکمیل شود؛ snapshot مرورگر نباید به‌صورت خودکار روی سرور restore شود.

## 2. احراز هویت

احراز هویت در `src/routes/api.ts` و `src/server/auth.ts` انجام می‌شود.

- Password verification فقط روی سرور انجام می‌شود.
- Password hash و salt از API کاربران برگردانده نمی‌شوند.
- Session با توکن امضاشده HMAC و زمان انقضا کنترل می‌شود.
- `AUTH_SECRET` در Production باید حداقل ۳۲ کاراکتر تصادفی باشد.
- Login دارای محدودیت تلاش در سطح IP + username است.
- APIهای Bot و ارسال پیام نیز باید از همان احراز هویت Server-side عبور کنند؛ Webhookهای ورودی تنها مسیر عمومی هستند.

## 3. RBAC

Permissionها در Server تعریف شده‌اند و UI فقط نقش کمکی دارد.

| نقش | سطح کلی |
|---|---|
| admin | کامل |
| manager | مدیریت عملیاتی + مالی |
| agent | مشتری، قرارداد، ملک |
| accountant | مالی + خواندن داده‌های مرتبط |

هیچ route حساس نباید فقط با `ProtectedRoute` سمت React محافظت شود.

## 4. Validation

تمام mutationهای CRUD قبل از ورود به ORM اعتبارسنجی می‌شوند. فیلدهای زیر از payload عمومی حذف می‌شوند:

- `id`
- `createdAt`
- `updatedAt`
- `passwordHash`
- `salt`
- `securityAnswer1Hash`
- `securityAnswer2Hash`

## 5. Backup

دو لایه وجود دارد:

1. Server/PostgreSQL backup: مرجع اصلی Disaster Recovery
2. Browser backup: snapshot ثانویه برای شرایط محلی

Browser backup نباید بدون عملیات صریح restore، PostgreSQL را overwrite کند.

Scheduler سرور مستقل از مرورگر اجرا می‌شود و Shutdown کنترل‌شده نیز backup می‌سازد.

## 6. Production checklist

قبل از انتشار:

- `NODE_ENV=production`
- `AUTH_SECRET` تصادفی و غیرقابل حدس
- `BACKUP_ENCRYPTION_KEY` برای رمزنگاری backup
- PostgreSQL روی شبکه عمومی بدون دسترسی مستقیم قرار نگیرد
- HTTPS/TLS در reverse proxy فعال باشد
- Backup خارج از همان دیسک سرور نیز replicate شود
- Restore به‌صورت دوره‌ای روی محیط staging آزمایش شود
- لاگ‌های حساس شامل password/token نباشند
- `npm run lint`, `npm test`, `npm run build` موفق باشند

## 7. استقرار پیشنهادی

```text
Internet
   |
 HTTPS / Reverse Proxy
   |
 Express Supervisor
   |
 +-- React/Vite
 +-- API + RBAC
 +-- Bot services
 +-- Backup scheduler
   |
 PostgreSQL
   |
 Backup storage / S3-compatible storage
```

برای چند سرور، Scheduler backup باید فقط روی یک worker فعال باشد یا با distributed lock اجرا شود تا چند backup همزمان تولید نشود.

## 8. Security findings pass

- `bot-settings.json` و `bot-users.json` در ignore قرار گرفته‌اند و نباید دوباره track شوند.
- Bot APIها باید قبل از production احراز هویت شوند.
- connected users نباید سقف ثابت و بی‌صدا داشته باشد.
- شناسه‌های Bot نباید بین platformها به‌صورت خودکار cross-resolve شوند.
- نبود provider پیامک نباید پاسخ موفق ساختگی تولید کند.
