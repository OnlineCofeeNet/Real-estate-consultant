# ذخیره رسانه املاک (عکس و فیلم)

## معماری

- فایل‌ها **داخل PostgreSQL ذخیره نمی‌شوند**
- متادیتا در جدول `property_media`
- باینری روی دیسک محلی یا S3-compatible (MinIO / AWS / R2)
- در صورت تنظیم `CDN_BASE_URL`، لینک عمومی از CDN ساخته می‌شود

## نصب

```bash
npm install
psql -f drizzle/0002_property_media.sql
```

برای thumbnail ویدیو (اختیاری):

```bash
# Ubuntu/Debian
sudo apt install ffmpeg
```

## حالت محلی (پیش‌فرض)

```env
STORAGE_DRIVER=local
AGENCY_STORAGE_QUOTA_MB=2048
```

فایل‌ها در `uploads/properties/` ذخیره می‌شوند.

## MinIO / S3 / R2

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=http://127.0.0.1:9000
S3_REGION=us-east-1
S3_BUCKET=real-estate-media
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL=http://127.0.0.1:9000/real-estate-media
```

Cloudflare R2 نمونه:

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=real-estate-media
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true
CDN_BASE_URL=https://media.yourdomain.com
```

## CDN

```env
CDN_BASE_URL=https://cdn.example.com
```

اگر تنظیم شود، اولویت با CDN است.

## سهمیه آژانس

- پیش‌فرض: ۲۰۴۸ مگابایت
- API وضعیت: `GET /api/media/quota`
- در صورت پر شدن سهمیه، آپلود با کد `413` رد می‌شود

## فشرده‌سازی

- عکس‌ها با `sharp` به WebP (یا PNG شفاف) تبدیل و تا عرض/ارتفاع ۱۹۲۰ پیکسل کوچک می‌شوند
- thumbnail ویدیو با `ffmpeg` (اگر نصب باشد) در ثانیهٔ ۱ ساخته می‌شود

## APIها

| متد | مسیر | توضیح |
|-----|------|--------|
| GET | `/api/media/quota` | مصرف و سقف فضا |
| POST | `/api/media/upload` | آپلود چندفایلی |
| GET | `/api/media/property/:id` | لیست رسانه ملک |
| PATCH | `/api/media/:id/primary` | تصویر اصلی |
| DELETE | `/api/media/:id` | حذف فایل + رکورد |
