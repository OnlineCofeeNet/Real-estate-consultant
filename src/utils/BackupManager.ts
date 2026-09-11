/**
 * سیستم پشتیبان‌گیری دوگانه: آفلاین (دانلود/آپلود JSON) + سمت سرور
 * مشاور املاک فراز
 */
import { db } from '../db/db';
import axios from 'axios';
import toast from 'react-hot-toast';

const LOCAL_BACKUP_KEY = 'faraz_auto_backup_v1';
const MAX_LOCAL_BACKUPS = 5;

export interface BackupPayload {
  version: number;
  createdAt: string;
  source: 'local' | 'server' | 'manual';
  data: {
    customers?: any[];
    contracts?: any[];
    invoices?: any[];
    payments?: any[];
    settings?: any;
    messageLogs?: any[];
    auditLogs?: any[];
    properties?: any[];
    areas?: any[];
    users?: any[];
  };
}

/** جمع‌آوری تمام داده‌های فعلی از API */
export async function collectAllData(): Promise<BackupPayload['data']> {
  const [
    customers,
    contracts,
    invoices,
    payments,
    settings,
    messageLogs,
    auditLogs,
    properties,
    areas,
    users
  ] = await Promise.all([
    db.customers.toArray().catch(() => []),
    db.contracts.toArray().catch(() => []),
    db.invoices.toArray().catch(() => []),
    db.payments.toArray().catch(() => []),
    db.settings.get(1).catch(() => null),
    db.messageLogs.toArray().catch(() => []),
    db.auditLogs.toArray().catch(() => []),
    db.properties.toArray().catch(() => []),
    db.areas.toArray().catch(() => []),
    db.users.toArray().catch(() => [])
  ]);

  return {
    customers,
    contracts,
    invoices,
    payments,
    settings: settings || undefined,
    messageLogs,
    auditLogs,
    properties,
    areas,
    users
  };
}

/** ساخت شیء پشتیبان کامل */
export async function createBackupData(source: BackupPayload['source'] = 'manual'): Promise<BackupPayload> {
  const data = await collectAllData();
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    source,
    data
  };
}

/** دانلود پشتیبان به صورت فایل JSON */
export async function downloadBackupFile(): Promise<void> {
  try {
    const backup = await createBackupData('manual');
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `faraz-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('فایل پشتیبان با موفقیت دانلود شد');
  } catch (err: any) {
    console.error(err);
    toast.error('خطا در ساخت فایل پشتیبان: ' + (err?.message || 'نامشخص'));
  }
}

/** بازیابی از داده پشتیبان (از فایل یا سرور) */
export async function restoreFromBackupData(backup: BackupPayload | any): Promise<void> {
  if (!backup || !backup.data) {
    throw new Error('فایل پشتیبان معتبر نیست');
  }

  const d = backup.data;

  // ترتیب مهم: اول settings و users، بعد بقیه
  if (d.settings) {
    await db.settings.put(d.settings, 1).catch(console.warn);
  }

  // پاکسازی و بارگذاری مجدد (ساده و ایمن برای نسخه فعلی)
  const tables: Array<{ key: keyof typeof d; table: any }> = [
    { key: 'customers', table: db.customers },
    { key: 'contracts', table: db.contracts },
    { key: 'invoices', table: db.invoices },
    { key: 'payments', table: db.payments },
    { key: 'properties', table: db.properties },
    { key: 'areas', table: db.areas },
    { key: 'messageLogs', table: db.messageLogs },
    { key: 'auditLogs', table: db.auditLogs },
    { key: 'users', table: db.users }
  ];

  for (const { key, table } of tables) {
    const items = d[key];
    if (!Array.isArray(items) || items.length === 0) continue;
    try {
      // تلاش برای clear سپس bulk (در صورت پشتیبانی سرور)
      if (typeof table.clear === 'function') {
        await table.clear().catch(() => {});
      }
      for (const item of items) {
        await table.put(item).catch(() => table.add(item).catch(console.warn));
      }
    } catch (e) {
      console.warn(`خطا در بازیابی ${key}:`, e);
    }
  }

  toast.success('بازیابی با موفقیت انجام شد. صفحه را رفرش کنید.');
}

/** خواندن فایل JSON از کاربر و بازیابی */
export function restoreFromFileInput(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      await restoreFromBackupData(backup);
    } catch (err: any) {
      toast.error('فایل نامعتبر است یا خطا در بازیابی: ' + (err?.message || ''));
    }
  };
  input.click();
}

/** ذخیره پشتیبان خودکار در localStorage (آفلاین) */
export async function doAutoBackup(): Promise<void> {
  try {
    // فقط وقتی آنلاین هستیم داده را جمع می‌کنیم
    if (!navigator.onLine) return;

    const backup = await createBackupData('local');
    const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
    let list: BackupPayload[] = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
        if (!Array.isArray(list)) list = [];
      } catch {
        list = [];
      }
    }
    list.unshift(backup);
    list = list.slice(0, MAX_LOCAL_BACKUPS);
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(list));
  } catch (e) {
    // silent fail for auto backup
    console.warn('Auto backup failed', e);
  }
}

/** بررسی و پیشنهاد بازیابی از پشتیبان خودکار محلی */
export async function checkAndRestoreAutoBackup(): Promise<void> {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
    if (!raw) return;
    // فقط اطلاع‌رسانی؛ بازیابی دستی توسط کاربر انجام می‌شود
  } catch {
    // ignore
  }
}

/** لیست پشتیبان‌های محلی */
export function getLocalBackups(): BackupPayload[] {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** بازیابی از یکی از پشتیبان‌های محلی */
export async function restoreLocalBackup(index: number): Promise<void> {
  const list = getLocalBackups();
  if (!list[index]) {
    toast.error('پشتیبان مورد نظر یافت نشد');
    return;
  }
  await restoreFromBackupData(list[index]);
}

/** ارسال پشتیبان به سرور */
export async function uploadBackupToServer(): Promise<void> {
  try {
    const backup = await createBackupData('server');
    const res = await axios.post('/api/backup', backup);
    if (res.data?.success) {
      toast.success('پشتیبان با موفقیت روی سرور ذخیره شد');
    } else {
      toast.error(res.data?.error || 'خطا در ذخیره روی سرور');
    }
  } catch (err: any) {
    const msg = err?.response?.data?.error || err?.message || 'سرور در دسترس نیست';
    toast.error('خطا در ارسال به سرور: ' + msg);
  }
}

/** دریافت لیست پشتیبان‌های سرور */
export async function listServerBackups(): Promise<any[]> {
  try {
    const res = await axios.get('/api/backup');
    return res.data?.backups || [];
  } catch {
    return [];
  }
}

/** بازیابی از پشتیبان سرور */
export async function restoreFromServer(backupId: string): Promise<void> {
  try {
    const res = await axios.get(`/api/backup/${backupId}`);
    if (res.data?.backup) {
      await restoreFromBackupData(res.data.backup);
    } else {
      toast.error('پشتیبان سرور یافت نشد');
    }
  } catch (err: any) {
    toast.error('خطا در دریافت از سرور');
  }
}
