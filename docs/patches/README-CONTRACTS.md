# بازیابی نسخه کامل Contracts.tsx (Multi-Agency)

به‌دلیل محدودیت اندازه API، فایل کامل قرارداد در دو بخش ذخیره شده است.

## روش ادغام

```bash
cat docs/patches/Contracts.part1.tsx docs/patches/Contracts.part2.tsx > src/pages/Contracts.tsx
```

یا:

```bash
bash docs/patches/merge-contracts.sh
```

پس از ادغام، فایل شامل این قابلیت‌هاست:

- `useAgency` + فیلتر مشتریان/قراردادها/املاک بر اساس آژانس
- ذخیره `agencyId` و `createdByUserId`
- سهم‌بندی واقعی طرفین (نه همیشه نصف‌نصف)
- انتخاب ملک مرتبط + به‌روزرسانی وضعیت ملک
- یکتایی شماره قرارداد در سطح آژانس
