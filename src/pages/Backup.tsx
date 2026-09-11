import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { db } from '../db/db';
import { Save, Download, RefreshCw, ShieldCheck, Clock3, Database, HardDrive, AlertTriangle } from 'lucide-react';

const DEFAULTS = { enabled: true, intervalMinutes: 30, backupOnExit: true, retentionCount: 30 };

type BackupConfig = typeof DEFAULTS;

const Backup = () => {
  const [config, setConfig] = useState<BackupConfig>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastBackup, setLastBackup] = useState<number | null>(null);

  useEffect(() => {
    db.settings.get(1).then((settings: any) => {
      if (settings?.backupSettings) setConfig({ ...DEFAULTS, ...settings.backupSettings });
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const current: any = (await db.settings.get(1)) || { id: 1 };
      const next = { ...current, backupSettings: {
        ...config,
        intervalMinutes: Math.max(1, Math.min(1440, Number(config.intervalMinutes) || 30)),
        retentionCount: Math.max(1, Math.min(365, Number(config.retentionCount) || 30)),
      }};
      await db.settings.put(next, 1);
      await axios.post('/api/bot/sync-settings', { settings: next });
      setConfig(next.backupSettings);
      toast.success('تنظیمات پشتیبان‌گیری ذخیره شد');
    } catch (e) {
      toast.error('ذخیره تنظیمات پشتیبان‌گیری ناموفق بود');
    } finally { setSaving(false); }
  };

  const createLocalBackup = async () => {
    setBusy(true);
    try {
      const tables = db.tables;
      const data: Record<string, unknown> = {};
      for (const table of tables) data[table.name] = await table.toArray();
      const payload = { format: 'real-estate-consultant-local-backup', version: 1, createdAt: Date.now(), data };
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-local-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const now = Date.now(); setLastBackup(now);
      toast.success('نسخه پشتیبان محلی ایجاد و دانلود شد');
    } catch (e) {
      toast.error('ایجاد نسخه پشتیبان محلی ناموفق بود');
    } finally { setBusy(false); }
  };

  const nextRun = useMemo(() => {
    if (!lastBackup || !config.enabled) return null;
    return new Date(lastBackup + config.intervalMinutes * 60000);
  }, [lastBackup, config.enabled, config.intervalMinutes]);

  return <div className="space-y-6 pb-24" dir="rtl">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><h2 className="text-2xl font-bold text-slate-800">پشتیبان‌گیری و بازیابی</h2><p className="text-xs text-slate-500 mt-1">مدیریت Backup خودکار، دوره‌ای و نسخه محلی اطلاعات</p></div>
      <div className="flex gap-2">
        <button onClick={createLocalBackup} disabled={busy} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"><Download size={17}/> پشتیبان دستی</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"><Save size={17}/> ذخیره تنظیمات</button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5"><ShieldCheck className="text-emerald-600 mb-3"/><div className="font-bold">Backup سمت سرور</div><div className="text-xs text-slate-500 mt-1">برای نسخه آنلاین و چندکاربره، Backup در Server انجام می‌شود.</div></div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5"><Database className="text-blue-600 mb-3"/><div className="font-bold">پایگاه داده</div><div className="text-xs text-slate-500 mt-1">اطلاعات PostgreSQL در Backup سرور قرار می‌گیرد.</div></div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5"><HardDrive className="text-amber-600 mb-3"/><div className="font-bold">نسخه محلی</div><div className="text-xs text-slate-500 mt-1">یک فایل JSON از داده‌های مرورگر برای نگهداری مستقل ایجاد می‌شود.</div></div>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center gap-3"><Clock3 className="text-emerald-600"/><div><h3 className="font-bold">زمان‌بندی پشتیبان‌گیری</h3><p className="text-xs text-slate-500">زمان‌بندی روی سرور اعمال می‌شود و به باز بودن مرورگر وابسته نیست.</p></div></div>
      <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200"><span className="font-bold text-sm">فعال بودن پشتیبان‌گیری خودکار</span><input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} className="w-5 h-5"/></label>
      <label className="flex items-center justify-between gap-4"><span className="font-medium text-sm">فاصله پشتیبان‌گیری (دقیقه)</span><input type="number" min={1} max={1440} value={config.intervalMinutes} onChange={e => setConfig({ ...config, intervalMinutes: Number(e.target.value) })} className="w-32 border rounded-xl p-2.5 text-center"/></label>
      <label className="flex items-center justify-between gap-4"><span className="font-medium text-sm">تعداد نسخه‌های قابل نگهداری</span><input type="number" min={1} max={365} value={config.retentionCount} onChange={e => setConfig({ ...config, retentionCount: Number(e.target.value) })} className="w-32 border rounded-xl p-2.5 text-center"/></label>
      <label className="flex items-center justify-between gap-4"><span className="font-medium text-sm">پشتیبان‌گیری هنگام خروج از Server</span><input type="checkbox" checked={config.backupOnExit} onChange={e => setConfig({ ...config, backupOnExit: e.target.checked })} className="w-5 h-5"/></label>
    </div>

    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3"><AlertTriangle className="text-amber-600 shrink-0"/><div className="text-xs text-amber-900 leading-6"><b>نکته امنیتی:</b> Backup حاوی اطلاعات حساس سامانه است. پوشه Backup نباید در Git، مسیر عمومی وب یا فضای اشتراکی بدون رمزنگاری قرار گیرد.</div></div>

    {nextRun && <div className="text-xs text-slate-500 flex items-center gap-2"><RefreshCw size={14}/> بر اساس آخرین Backup محلی، زمان تقریبی بعدی: {nextRun.toLocaleString('fa-IR')}</div>}
  </div>;
};

export default Backup;
