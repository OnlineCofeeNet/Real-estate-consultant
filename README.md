# سامانه مشاور املاک (Real Estate Consultant)

سامانه مدیریت مشتریان، قراردادها، فاکتورها و پیام‌رسانی برای مشاوران املاک.

## ویژگی‌ها
- مدیریت مشتریان و جستجوی پیشرفته
- ثبت و مدیریت قراردادها با پشتیبانی از چند طرف
- صدور فاکتور و پیگیری پرداخت‌ها
- ارسال پیام و فاکتور از طریق تلگرام، بله و روبیکا
- داشبورد آماری
- سیستم احراز هویت و نقش‌های کاربری (admin, manager, agent, accountant)
- لاگ حسابرسی (Audit Log)

## پیش‌نیازها
- Node.js 18+
- PostgreSQL
- توکن ربات تلگرام / بله / روبیکا (اختیاری)

## نصب و اجرا

```bash
git clone https://github.com/OnlineCofeeNet/Real-estate-consultant.git
cd Real-estate-consultant
npm install
# تنظیم متغیرهای محیطی (DATABASE_URL, AUTH_SECRET و ...)
npm run dev
```

برای production:
```bash
npm run build
npm start
```

## ساختار پروژه
- `server.ts` — سرور Express + polling ربات‌ها
- `src/` — فرانت‌اند React + API routes
- `src/db/` — schema و اتصال Drizzle ORM
- `docs/` — مستندات احراز هویت و ارتقا

## امنیت
- هش رمز عبور با PBKDF2
- session با HMAC
- rate limiting
- نقش‌های دسترسی برای CRUD

## مشارکت
لطفاً اسکریپت‌های موقت patch/fix را به مخزن commit نکنید. تغییرات را از طریق branch و Pull Request ارسال کنید.
