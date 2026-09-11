# پشتیبانی Multi-Agency (چندآژانسی)

## وضعیت روی برنچ `feature/multi-agency`

| مورد | وضعیت |
|------|--------|
| Migration SQL (`drizzle/0004_multi_agency.sql`) | ✅ اعمال شد |
| Types (`Agency`, `agencyId`, ...) | ✅ اعمال شد |
| `AgencyContext` + `AgencySwitcher` | ✅ اعمال شد |
| هوک‌های `useAgencyQuery` | ✅ اعمال شد |
| `App.tsx` ← `AgencyProvider` | ✅ اعمال شد |
| `Layout.tsx` ← `AgencySwitcher` | ✅ اعمال شد |
| `Contracts.tsx` منطق Multi-Agency | ⚠️ جزئی (جزئیات پایین) |

**PR:** https://github.com/OnlineCofeeNet/Real-estate-consultant/pull/8

## Migration

```bash
psql -d real_estate -f drizzle/0004_multi_agency.sql
```

## Contracts.tsx

به‌خاطر محدودیت حجم GitHub API برای یک فایل ~100KB، نسخه کامل UI قرارداد در یک مرحله آپلود نشد.

### آنچه در برنچ هست

- Importهای `useAgency` / `useAgencyCustomers` / `useAgencyContracts` / `useAgencyProperties`
- `handleSave` با `agencyId`، سهم‌بندی، و فاکتور/پرداخت وابسته به آژانس

### بازیابی UI کامل (توصیه)

1. از `main` فایل اصلی را بگیرید:
   ```bash
   git checkout main -- src/pages/Contracts.tsx
   ```
2. این تغییرات را اعمال کنید:

**Import:**
```tsx
import { useAgency } from '../context/AgencyContext';
import { useAgencyCustomers, useAgencyContracts, useAgencyProperties } from '../hooks/useAgencyQuery';
import { getSession } from '../services/auth';
```

**Query:**
```tsx
const { currentAgency } = useAgency();
const customers = useAgencyCustomers();
const contracts = useAgencyContracts();
const properties = useAgencyProperties();
```

**داخل `db.contracts.add`:**
```tsx
agencyId: currentAgency!.id,
createdByUserId: (getSession() as any)?.userId,
party1SharePercent: contractData.party1SharePercent ?? 50,
party2SharePercent: contractData.party2SharePercent ?? 50,
```

**داخل `invoices.add` / `payments.add`:** فیلد `agencyId: currentAgency.id` را اضافه کنید.

**اختیاری UI:** Select ملک + درصد سهم طرفین در گام ۱ فرم.

## رفتار تک‌آژانسی / چندآژانسی

- تک‌آژانسی: Agency پیش‌فرض `id=1` / `slug=default` — UI تقریباً بدون تغییر
- چندآژانسی: تعویض آژانس با `AgencySwitcher` و فیلتر داده بر اساس `agencyId`
