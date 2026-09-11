# پشتیبانی Multi-Agency (چندآژانسی)

این سند تغییرات اعمال‌شده برای پشتیبانی از حالت تک‌آژانسی و چندآژانسی را توضیح می‌دهد.

## فایل‌های اضافه‌شده

| فایل | توضیح |
|------|--------|
| `drizzle/0004_multi_agency.sql` | Migration کامل PostgreSQL |
| `src/context/AgencyContext.tsx` | Context مدیریت آژانس فعلی |
| `src/components/AgencySwitcher.tsx` | کامپوننت تعویض آژانس در هدر |
| `src/hooks/useAgencyQuery.ts` | هوک‌های فیلتر داده‌ها بر اساس agencyId |
| `docs/MULTI-AGENCY.md` | این مستند |

## مراحل اعمال

### ۱. اجرای Migration دیتابیس

```bash
# با drizzle-kit یا مستقیماً با psql
psql -d real_estate -f drizzle/0004_multi_agency.sql
```

یا از طریق Drizzle:

```bash
npx drizzle-kit push
```

### ۲. قرار دادن AgencyProvider در App

در `src/App.tsx` یا `src/main.tsx`:

```tsx
import { AgencyProvider } from './context/AgencyContext';

// داخل return:
<AgencyProvider>
  <BrowserRouter>
    {/* ... */}
  </BrowserRouter>
</AgencyProvider>
```

### ۳. اضافه کردن AgencySwitcher به Layout

در `src/components/Layout.tsx` در قسمت هدر:

```tsx
import AgencySwitcher from './AgencySwitcher';

// در هدر:
<AgencySwitcher />
```

### ۴. تغییرات لازم در Contracts.tsx

#### الف) Importها

```tsx
import { useAgency } from '../context/AgencyContext';
import { useAgencyCustomers, useAgencyContracts, useAgencyProperties } from '../hooks/useAgencyQuery';
```

#### ب) جایگزینی queryها

```tsx
const { currentAgency } = useAgency();
const customers = useAgencyCustomers();
const contracts = useAgencyContracts();
const properties = useAgencyProperties();
```

#### ج) در handleSave

قبل از `db.contracts.add` این فیلدها را اضافه کنید:

```tsx
agencyId: currentAgency!.id,
createdByUserId: /* از session */,
party1SharePercent: contractData.party1SharePercent ?? 50,
party2SharePercent: contractData.party2SharePercent ?? 50,
```

و فاکتورها را بر اساس درصد سهم واقعی بسازید (نه همیشه نصف‌نصف).

#### د) انتخاب ملک (اختیاری اما توصیه‌شده)

در فرم قرارداد یک select برای `propertyId` اضافه کنید که از `properties` فیلترشده استفاده کند.

## رفتار حالت تک‌آژانسی

- یک Agency با `id=1` و `slug=default` ساخته می‌شود.
- همه داده‌های قبلی به آن مهاجرت می‌شوند.
- کاربر هیچ تغییری در UI احساس نمی‌کند (Switcher فقط نام آژانس را نشان می‌دهد).

## رفتار حالت چندآژانسی

- کاربر می‌تواند عضو چند آژانس باشد (جدول `user_agencies`).
- با AgencySwitcher بین آژانس‌ها جابه‌جا می‌شود.
- همه queryها فقط داده همان آژانس را برمی‌گردانند.
- شماره قرارداد و کد ملک در سطح هر آژانس یکتا هستند.

## نکات امنیتی

- در آینده تمام APIها باید `agencyId` را از session کاربر بگیرند و فیلتر کنند.
- Tokenهای پیام‌رسان باید در `agencies.settings` ذخیره شوند نه Settings سراسری.
- هیچ‌وقت `agencyId` را از body درخواست کلاینت بدون اعتبارسنجی قبول نکنید.

## فازهای بعدی پیشنهادی

1. تکمیل API سمت سرور با فیلتر agencyId
2. صفحه مدیریت آژانس‌ها (فقط admin)
3. وبسایت عمومی `/agency/:slug`
4. Sync لایه Dexie با فیلتر agencyId
