import { useAgency } from '../context/AgencyContext';
import { useLiveQuery } from '../db/db';
import { db } from '../db/db';

/**
 * هوک‌های کمکی برای فیلتر خودکار داده‌ها بر اساس آژانس فعلی
 * در حالت تک‌آژانسی همه داده‌ها برمی‌گردند (چون agencyId = 1)
 */

export function useAgencyCustomers() {
  const { currentAgency } = useAgency();

  return useLiveQuery(
    async () => {
      if (!currentAgency) return [];
      const all = await db.customers.toArray();
      // فیلتر سمت کلاینت تا زمان آماده شدن کامل where در API
      return all.filter((c: any) => !c.agencyId || c.agencyId === currentAgency.id);
    },
    [currentAgency?.id]
  );
}

export function useAgencyContracts() {
  const { currentAgency } = useAgency();

  return useLiveQuery(
    async () => {
      if (!currentAgency) return [];
      const all = await db.contracts.toArray();
      return all.filter((c: any) => !c.agencyId || c.agencyId === currentAgency.id);
    },
    [currentAgency?.id]
  );
}

export function useAgencyProperties() {
  const { currentAgency } = useAgency();

  return useLiveQuery(
    async () => {
      if (!currentAgency) return [];
      const all = await db.properties.toArray();
      return all.filter((p: any) => !p.agencyId || p.agencyId === currentAgency.id);
    },
    [currentAgency?.id]
  );
}

export function useAgencyInvoices() {
  const { currentAgency } = useAgency();

  return useLiveQuery(
    async () => {
      if (!currentAgency) return [];
      const all = await db.invoices.toArray();
      return all.filter((i: any) => !i.agencyId || i.agencyId === currentAgency.id);
    },
    [currentAgency?.id]
  );
}

export function useCurrentAgencyId(): number | null {
  const { currentAgency } = useAgency();
  return currentAgency?.id ?? null;
}
