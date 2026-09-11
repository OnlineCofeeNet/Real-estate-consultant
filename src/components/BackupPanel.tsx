import React, { useState, useEffect } from 'react';
import {
  downloadBackupFile,
  restoreFromFileInput,
  uploadBackupToServer,
  getLocalBackups,
  restoreLocalBackup,
  listServerBackups,
  restoreFromServer,
  type BackupPayload
} from '../utils/BackupManager';
import {
  Download,
  Upload,
  CloudUpload,
  CloudDownload,
  HardDrive,
  RefreshCw,
  Shield,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function BackupPanel() {
  const [localBackups, setLocalBackups] = useState<BackupPayload[]>([]);
  const [serverBackups, setServerBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLocalBackups(getLocalBackups());
    setLoading(true);
    try {
      const list = await listServerBackups();
      setServerBackups(list);
    } catch {
      setServerBackups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="text-emerald-600" size={22} />
        <div>
          <h3 className="text-lg font-bold text-slate-800">پشتیبان‌گیری و بازیابی</h3>
          <p className="text-xs text-slate-500">آفلاین (فایل + حافظه محلی) و سمت سرور</p>
        </div>
      </div>

      {/* عملیات اصلی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => downloadBackupFile()}
          className="flex items-center gap-2 justify-center px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition"
        >
          <Download size={18} />
          دانلود پشتیبان (JSON)
        </button>

        <button
          type="button"
          onClick={() => restoreFromFileInput()}
          className="flex items-center gap-2 justify-center px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-medium text-sm shadow-sm transition"
        >
          <Upload size={18} />
          بازیابی از فایل
        </button>

        <button
          type="button"
          onClick={async () => {
            setLoading(true);
            await uploadBackupToServer();
            await refresh();
            setLoading(false);
          }}
          disabled={loading}
          className="flex items-center gap-2 justify-center px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition disabled:opacity-60"
        >
          <CloudUpload size={18} />
          ذخیره روی سرور
        </button>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 justify-center px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          بروزرسانی لیست
        </button>
      </div>

      {/* هشدار */}
      <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <p>
          قبل از بازیابی، یک پشتیبان جدید بگیرید. بازیابی داده‌های فعلی را جایگزین می‌کند.
          پشتیبان خودکار محلی هنگام بستن تب ذخیره می‌شود (حداکثر ۵ نسخه).
        </p>
      </div>

      {/* پشتیبان‌های محلی */}
      <div>
        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <HardDrive size={16} />
          پشتیبان‌های محلی (آفلاین)
        </h4>
        {localBackups.length === 0 ? (
          <p className="text-xs text-slate-400">هنوز پشتیبان محلی ذخیره نشده است.</p>
        ) : (
          <ul className="space-y-2">
            {localBackups.map((b, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
              >
                <span>
                  {new Date(b.createdAt).toLocaleString('fa-IR')} — {b.source}
                </span>
                <button
                  type="button"
                  onClick={() => restoreLocalBackup(i)}
                  className="px-2.5 py-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium"
                >
                  بازیابی
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* پشتیبان‌های سرور */}
      <div>
        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <CloudDownload size={16} />
          پشتیبان‌های سرور
        </h4>
        {serverBackups.length === 0 ? (
          <p className="text-xs text-slate-400">
            {loading ? 'در حال بارگذاری...' : 'هیچ پشتیبانی روی سرور یافت نشد (یا سرور در دسترس نیست).'}
          </p>
        ) : (
          <ul className="space-y-2">
            {serverBackups.map((b: any) => (
              <li
                key={b.id || b.createdAt}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
              >
                <span>
                  {b.createdAt ? new Date(b.createdAt).toLocaleString('fa-IR') : b.id}
                </span>
                <button
                  type="button"
                  onClick={() => restoreFromServer(b.id)}
                  className="px-2.5 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium"
                >
                  بازیابی
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
