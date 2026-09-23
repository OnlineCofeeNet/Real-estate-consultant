# مشاور املاک فراز | Real Estate Consultant

سیستم جامع مدیریت فایل املاک، درخواست مشتری، تطبیق هوشمند، قرارداد، مالی و پیام‌رسان ویژه آژانس‌های املاک ایران.

رابط کاملاً فارسی و RTL · تاریخ جلالی · ارسال امن فایل بدون افشای تلفن مالک · مسیر اصلی داده روی **PostgreSQL**.

---

## معماری (گزینه B)

| لایه | منبع حقیقت |
|------|------------|
| املاک، درخواست، مچ، رسانه، share | **PostgreSQL + API سرور** (`/api/properties`, `/api/matching`, `/api/media`) |
| مشتریان / قرارداد / تنظیمات UI | ترکیبی Dexie + همگام‌سازی سرور |
| احراز هویت | `AuthGate` + نقش‌ها (admin / manager / agent / accountant) |

صفحه **املاک** و **مچ سرور** مسیر اصلی عملیاتی هستند.  
**تطبیق هوشمند** (`/smart-matching`) رابط ترکیبی/آفلاین مکمل است.

---

## ویژگی‌های کلیدی

### املاک و رسانه
- ثبت فایل ملک با کد یکتا، نوع معامله، وضعیت، امکانات
- آپلود عکس و فیلم واحد (`PropertyMediaGallery` + `/api/media`)
- تصویر اصلی روی کارت لیست
- پشتیبانی ذخیره local یا S3/MinIO با سهمیه و فشرده‌سازی (sharp)

### درخواست مشتری و مچ
- ثبت نیاز مشتری (بودجه، متراژ، نوع معامله)
- الگوریتم تطبیق هوشمند با امتیاز، سطح (عالی/خوب/متوسط) و breakdown
- مچ خودکار پس از ثبت فایل (`POST /api/matching/auto-match/:id`)
- ارسال به مشتری از بات/پیامک **بدون شماره مالک**

### قرارداد، مالی، مباشر
- قرارداد رهن/اجاره/خرید و فروش + فاکتور
- حسابداری و چک‌ها
- مباشرین و مشاوران

### امنیت
- ورود، ثبت‌نام، بازیابی رمز (سوال امنیتی / پیامک)
- کنترل دسترسی نقش‌محور روی مسیرها

---

## تکنولوژی

| لایه | تکنولوژی |
|------|----------|
| Frontend | React 19 · TypeScript · Vite · Tailwind 4 |
| Backend | Express · TypeScript |
| ORM / DB | Drizzle ORM · PostgreSQL |
| آفلاین کمکی | Dexie (IndexedDB) |
| رسانه | multer · sharp · S3-compatible optional |
| تاریخ | moment-jalaali |

---

## نصب

```bash
git clone https://github.com/OnlineCofeeNet/Real-estate-consultant.git
cd Real-estate-consultant
npm install
cp .env.example .env   # سپس مقادیر را پر کنید
```

### دیتابیس

```bash
# ساخت/همگام‌سازی جداول
npm run db:push

# یا اجرای migrationهای موجود در پوشه drizzle/
```

جداول مهم: `properties`, `property_media`, `property_requests`, `property_shares`, `areas`

### اجرا

```bash
npm run dev      # توسعه — معمولاً http://localhost:3000
npm run build && npm start   # production
```

---

## مسیرهای اصلی UI

| مسیر | توضیح |
|------|--------|
| `/properties` | مدیریت فایل املاک + گالری رسانه (مسیر اصلی B) |
| `/matching` | درخواست مشتری · مچ سرور · ارسال امن |
| `/smart-matching` | تطبیق هوشمند ترکیبی |
| `/customers` | مشتریان |
| `/contracts` | قرارداد و فاکتور |
| `/accounting` | حسابداری |
| `/agents` | مباشرین |
| `/users` | کاربران (admin) |
| `/settings` | تنظیمات آژانس و بات |

---

## API مرتبط با املاک

```text
CRUD  /api/properties
CRUD  /api/propertyMedia
CRUD  /api/propertyRequests
POST  /api/media/upload
GET   /api/matching/requests
GET   /api/matching/requests/:id/matches
POST  /api/matching/auto-match/:propertyId
POST  /api/matching/share
```

---

## نقش‌ها

| نقش | دسترسی تقریبی |
|-----|----------------|
| admin | همه چیز + کاربران |
| manager | عملیات + تنظیمات |
| agent | مشتریان، املاک، مچ، قرارداد |
| accountant | مالی / حسابداری |

---

## اسکریپت‌ها

```bash
npm run dev
npm run build
npm start
npm run lint
npm run db:push
npm run db:generate
npm run db:studio
```

---

## مستندات

- `docs/AUTHENTICATION.md` — مدل احراز هویت
- `docs/WEBAPP-UPGRADE.md` — نقشه ارتقا
- `drizzle/` — migrationهای املاک و رسانه

---

## وضعیت

- مسیر اصلی املاک/مچ: **سرور (PostgreSQL)**
- احراز هویت: **فعال (AuthGate)**
- رسانه واحد: **فعال روی فرم ملک**
- SmartMatching: مکمل UI / آفلاین

---

## لایسنس

Apache-2.0

**ساخته‌شده برای نیازهای واقعی مشاوران املاک ایران**
