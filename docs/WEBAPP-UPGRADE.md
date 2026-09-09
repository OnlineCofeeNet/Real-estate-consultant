# ارتقای وب‌اپلیکیشن «مشاور املاک فراز»

## اصل راهبردی

هسته فعلی پروژه حفظ می‌شود و بازنویسی از صفر انجام نمی‌شود.

مواردی که باید حفظ شوند:

- React + TypeScript + Vite
- Tailwind CSS و رابط کاربری RTL فارسی
- Dashboard
- Customers
- Contracts
- Finance
- Invoices / Payments
- Persian/Jalali date handling
- Backup / Restore
- Authentication فعلی به‌عنوان پایه نسخه Local-first
- پیام‌رسان‌ها و SMS به‌عنوان Integrationهای موجود
- منطق محاسبه کمیسیون و مالیات
- قالب‌های چاپ و خروجی PDF/Excel

## هدف معماری جدید

نسخه فعلی از Local-first به یک Web Application حرفه‌ای، چندکاربره و قابل استقرار ارتقا می‌یابد؛ بدون حذف قابلیت‌های موجود.

```text
React/Vite UI
    |
    | HTTPS REST API
    v
Express API
    |
    +--> PostgreSQL (داده اصلی)
    +--> Object Storage (تصاویر و فایل‌ها)
    +--> Message Services
          +--> Telegram
          +--> Bale
          +--> Rubika
          +--> SMS
```

## قانون مهاجرت داده

Dexie/IndexedDB در فاز اول حذف نمی‌شود.

- Dexie برای Offline cache، migration و backward compatibility حفظ می‌شود.
- PostgreSQL منبع اصلی داده در حالت آنلاین خواهد بود.
- Sync layer باید idempotent باشد.
- حذف یا overwrite داده محلی بدون migration صریح ممنوع است.

## امنیت

Credentialهای پیام‌رسان و SMS نباید از Browser ارسال شوند.

Browser فقط داده عملیاتی را ارسال می‌کند:

```json
{
  "customerId": 123,
  "platform": "bale",
  "message": "..."
}
```

Server credential را از environment/secret manager دریافت می‌کند.

الزامات:

- HttpOnly + Secure + SameSite session cookie
- RBAC سمت سرور
- validation برای تمام APIها
- rate limiting
- audit trail
- CSRF protection در صورت استفاده از cookie authentication
- عدم ثبت token/password در log
- عدم قرار دادن secret در Git

## نقش‌ها

- `admin`: مدیریت کامل
- `manager`: مدیریت عملیات، مشتری، قرارداد و مالی
- `agent`: مشتری، ملک، درخواست و قراردادهای مجاز
- `accountant`: فاکتور، پرداخت و گزارش مالی

## موجودیت‌های جدید

برای تبدیل سیستم به CRM/MLS، این موجودیت‌ها اضافه می‌شوند:

- agents
- properties
- property_images
- property_features
- property_documents
- property_requests
- favorites
- areas
- property_types
- messages
- notifications

موجودیت‌های فعلی customers، contracts، invoices، payments و audit_logs حفظ و در صورت نیاز نرمال‌سازی می‌شوند.

## Property

حداقل فیلدهای پیشنهادی:

- id
- code
- title
- propertyType
- transactionType
- status
- price
- deposit
- rent
- area
- bedrooms
- floor
- totalFloors
- yearBuilt
- address
- latitude
- longitude
- description
- ownerId
- assignedAgentId
- createdAt
- updatedAt

## CRM

برای هر مشتری باید امکان ثبت این موارد فراهم شود:

- اطلاعات هویتی و تماس
- نقش مشتری
- درخواست خرید/فروش/رهن/اجاره
- مناطق مورد علاقه
- محدوده قیمت
- متراژ مورد نظر
- تاریخ پیگیری بعدی
- یادداشت‌ها
- ملک‌های پیشنهادی
- تاریخچه تماس و پیام

## پیام‌رسان‌ها

شناسه پیام‌رسان از شماره تلفن جداست.

ترتیب استفاده:

```text
telegramId -> Telegram
baleId     -> Bale
rubikaId   -> Rubika
```

phone فقط برای SMS و lookup استفاده می‌شود؛ مگر اینکه provider به‌صورت رسمی phone را به chat identifier تبدیل کند.

هر ارسال باید دارای:

- provider
- recipient
- messageId
- status
- errorCode
- errorMessage
- sentAt
- retryCount

باشد.

## صف پیام

ارسال پیام‌های خودکار نباید با request اصلی UI قفل شود.

```text
Event
  -> Message Queue
  -> Provider Adapter
  -> Send
  -> Retry
  -> Delivery Log
```

Retry باید محدود و idempotent باشد تا پیام تکراری ارسال نشود.

## API پیشنهادی

```text
/api/auth
/api/users
/api/properties
/api/customers
/api/requests
/api/contracts
/api/invoices
/api/payments
/api/agents
/api/messages
/api/notifications
/api/reports
/api/settings
/api/backups
```

## UI پیشنهادی

```text
Dashboard
Properties
Customers
Requests
Contracts
Invoices
Payments
Agents
Messages
Reports
Commission Calculator
Calendar
Favorites
Notifications
Settings
Help
```

UI باید mobile-first، RTL، سریع و قابل استفاده با صفحه لمسی باشد.

## مهاجرت مرحله‌ای

### Phase 1 — Stabilize

- تثبیت build و type-check
- حذف patchهای تکراری از مسیر production
- حفظ behavior فعلی
- افزودن testهای regression

### Phase 2 — Secure

- انتقال credentialها به server
- authentication سمت سرور
- RBAC
- validation / rate limit / audit

### Phase 3 — Data

- PostgreSQL schema
- API
- migration از IndexedDB
- sync و offline cache

### Phase 4 — MLS/CRM

- Properties
- Requests
- Agents
- Favorites
- Search / filters

### Phase 5 — Messaging

- Telegram/Bale/Rubika adapters
- SMS adapter
- queue/retry/logging

### Phase 6 — Production

- environment configuration
- health check
- error monitoring
- backup
- CI/CD
- responsive QA

## معیار پذیرش

ارتقا زمانی کامل است که:

1. قابلیت‌های فعلی Customers/Contracts/Finance/Invoices/Payments بدون regression کار کنند.
2. Build و type-check بدون خطا باشند.
3. کاربران مختلف داده مشترک و کنترل دسترسی صحیح داشته باشند.
4. Tokenهای پیام‌رسان در Browser قابل مشاهده یا ارسال نباشند.
5. ارسال Bale/Telegram/Rubika از server انجام شود.
6. هر پیام نتیجه ارسال و خطای provider را ثبت کند.
7. ملک، تصویر، درخواست مشتری و مشاور قابل مدیریت باشند.
8. جستجوی ترکیبی ملک بر اساس منطقه، قیمت، متراژ، نوع و وضعیت وجود داشته باشد.
9. نسخه موبایل و دسکتاپ از یک UI مشترک و RTL استفاده کنند.
10. داده‌های Local فعلی بدون از دست رفتن اطلاعات قابل مهاجرت باشند.

## ممنوعیت‌ها

- بازنویسی کامل پروژه
- حذف Dexie در فاز اول
- حذف Customers/Contracts/Finance
- تغییر قراردادهای موجود بدون migration
- انتقال secret به frontend
- ذخیره secret در Git
- استفاده از phone به‌عنوان chatId پیام‌رسان بدون mapping معتبر
- تغییر مستقیم main قبل از تست و تأیید
