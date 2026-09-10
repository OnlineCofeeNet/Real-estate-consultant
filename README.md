# سامانه مشاور املاک (Real Estate Consultant)

سامانه مدیریت مشتریان، قراردادها، فاکتورها و پیام‌رسانی هوشمند برای مشاوران املاک.

## ویژگی‌ها

- مدیریت مشتریان با جستجوی پیشرفته و عملیات گروهی
- ثبت و مدیریت قراردادهای رهن/اجاره و خرید/فروش
- صدور فاکتور، محاسبه کمیسیون و مالیات، پیگیری پرداخت‌ها
- ارسال خودکار پیام و فاکتور از طریق تلگرام، بله و روبیکا
- داشبورد آماری و گزارش‌گیری
- سیستم احراز هویت و نقش‌های کاربری (admin, manager, agent, accountant)
- لاگ حسابرسی (Audit Log)
- پشتیبان‌گیری و بازیابی داده

## پیش‌نیازها

- Node.js 18 یا بالاتر
- PostgreSQL
- توکن ربات (تلگرام / بله / روبیکا) — اختیاری

## نصب و اجرا

```bash
git clone https://github.com/OnlineCofeeNet/Real-estate-consultant.git
cd Real-estate-consultant
cp .env.example .env
# مقادیر .env را ویرایش کنید
npm install
npm run dev
```

Production:

```bash
npm run build
npm start
```

## اسکریپت‌ها

| دستور | توضیح |
|-------|--------|
| `npm run dev` | اجرای محیط توسعه |
| `npm run build` | ساخت production |
| `npm start` | اجرای نسخه production |
| `npm run lint` | بررسی TypeScript |
| `npm test` | اجرای تست‌های واحد |

## ساختار پروژه

```
├── server.ts              # سرور Express + polling ربات‌ها
├── src/
│   ├── pages/             # صفحات اصلی (Contracts, Customers, ...)
│   ├── components/        # کامپوننت‌های مشترک
│   ├── db/                # Drizzle schema و اتصال
│   ├── utils/             # توابع کمکی و تست‌ها
│   ├── routes/            # API routes
│   └── services/          # سرویس‌های احراز هویت و ...
├── docs/                  # مستندات
└── .env.example           # نمونه متغیرهای محیطی
```

## امنیت

- هش رمز عبور با PBKDF2 (310k iterations)
- Session با HMAC-SHA256
- Rate limiting و Security headers
- کنترل دسترسی بر اساس نقش

## مشارکت

- از commit کردن اسکریپت‌های موقت `patch_*` / `fix_*` خودداری کنید.
- تغییرات را از طریق branch و Pull Request ارسال نمایید.
- قبل از PR حتماً `npm test` و `npm run lint` را اجرا کنید.
