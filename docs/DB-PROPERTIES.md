# ساخت جداول ماژول املاک

برای استفاده از صفحه **املاک** باید سه جدول زیر در PostgreSQL وجود داشته باشند:

- `areas`
- `properties`
- `property_images`

## روش ۱ — اجرای مستقیم SQL (پیشنهادی و ساده)

```bash
# از ریشه پروژه
psql -h localhost -U postgres -d real_estate -f drizzle/0001_properties.sql
```

یا اگر داخل psql هستید:

```sql
\i drizzle/0001_properties.sql
```

## روش ۲ — با Drizzle Kit (همگام‌سازی از روی schema.ts)

ابتدا متغیرهای محیطی را در `.env` تنظیم کنید:

```env
SQL_HOST=localhost
SQL_DB_NAME=real_estate
SQL_ADMIN_USER=postgres
SQL_ADMIN_PASSWORD=...
```

سپس:

```bash
# اعمال مستقیم schema روی دیتابیس (بدون فایل migration)
npm run db:push

# یا تولید migration و سپس اعمال دستی
npm run db:generate
```

## بررسی صحت

```sql
\dt
SELECT COUNT(*) FROM properties;
```

اگر جداول ساخته شده باشند، صفحه `/properties` بدون خطا کار می‌کند.
