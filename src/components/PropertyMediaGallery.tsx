import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ImagePlus, Star, Video, Loader2, Trash2, HardDrive } from 'lucide-react';
import type { PropertyMedia } from '../types';

type QuotaInfo = {
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
  usedPercent: number;
  driver?: string;
};

function formatMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export function PropertyMediaGallery({ propertyId }: { propertyId: number }) {
  const [items, setItems] = useState<PropertyMedia[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadQuota = async () => {
    try {
      const { data } = await axios.get('/api/media/quota');
      setQuota(data);
    } catch {
      /* optional */
    }
  };

  const load = async () => {
    try {
      const { data } = await axios.get(`/api/media/property/${propertyId}`);
      setItems(Array.isArray(data) ? data : []);
      await loadQuota();
    } catch {
      toast.error('خطا در بارگذاری رسانه‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [propertyId]);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    fd.append('propertyId', String(propertyId));
    Array.from(files).forEach((f) => fd.append('files', f));
    setUploading(true);
    try {
      const { data } = await axios.post('/api/media/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('فایل‌ها با موفقیت بارگذاری شدند');
      if (data?.storage) setQuota(data.storage);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'خطا در آپلود');
      if (e?.response?.data?.usedBytes != null) {
        setQuota({
          usedBytes: e.response.data.usedBytes,
          quotaBytes: e.response.data.quotaBytes,
          remainingBytes: Math.max(0, e.response.data.quotaBytes - e.response.data.usedBytes),
          usedPercent: e.response.data.quotaBytes
            ? Math.round((e.response.data.usedBytes / e.response.data.quotaBytes) * 1000) / 10
            : 0,
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const setPrimary = async (id: number) => {
    try {
      await axios.patch(`/api/media/${id}/primary`);
      toast.success('به‌عنوان تصویر اصلی تنظیم شد');
      await load();
    } catch {
      toast.error('خطا در تنظیم تصویر اصلی');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('این فایل حذف شود؟')) return;
    try {
      await axios.delete(`/api/media/${id}`);
      toast.success('حذف شد');
      await load();
    } catch {
      toast.error('خطا در حذف');
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-slate-500 flex items-center gap-2">
        <Loader2 className="animate-spin" size={16} /> در حال بارگذاری...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {quota && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <HardDrive size={14} /> فضای رسانه آژانس
            </span>
            <span>
              {formatMb(quota.usedBytes)} / {formatMb(quota.quotaBytes)} مگابایت
              {quota.driver ? ` · ${quota.driver}` : ''}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                quota.usedPercent > 90 ? 'bg-rose-500' : quota.usedPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, quota.usedPercent)}%` }}
            />
          </div>
        </div>
      )}

      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition text-sm font-medium">
        {uploading ? <Loader2 className="animate-spin" size={16} /> : <ImagePlus size={16} />}
        {uploading ? 'در حال آپلود...' : 'افزودن عکس / فیلم'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>
      <p className="text-xs text-slate-500">
        عکس تا ۸ مگابایت (فشرده‌سازی خودکار) · فیلم تا ۸۰ مگابایت · jpg, png, webp, gif, mp4, webm, mov
      </p>

      {items.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 text-sm">
          هنوز فایلی بارگذاری نشده است
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((m) => (
            <div
              key={m.id}
              className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video"
            >
              {m.type === 'video' ? (
                <video
                  src={m.url}
                  poster={m.thumbnailUrl || undefined}
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                />
              ) : (
                <img src={m.url} alt={m.originalName || ''} className="w-full h-full object-cover" />
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                {m.isPrimary && (
                  <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded">اصلی</span>
                )}
                {m.type === 'video' && (
                  <span className="bg-slate-800/80 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Video size={10} /> فیلم
                  </span>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-2 flex gap-1 opacity-0 group-hover:opacity-100 transition bg-gradient-to-t from-black/60 to-transparent">
                {m.type === 'image' && !m.isPrimary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(m.id!)}
                    className="flex-1 text-[11px] bg-white/90 rounded py-1 flex items-center justify-center gap-1"
                  >
                    <Star size={12} /> اصلی
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(m.id!)}
                  className="flex-1 text-[11px] bg-rose-500 text-white rounded py-1 flex items-center justify-center gap-1"
                >
                  <Trash2 size={12} /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
