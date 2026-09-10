import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ImagePlus, Star, Video, Loader2, Trash2 } from 'lucide-react';
import type { PropertyMedia } from '../types';

export function PropertyMediaGallery({ propertyId }: { propertyId: number }) {
  const [items, setItems] = useState<PropertyMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await axios.get(`/api/media/property/${propertyId}`);
      setItems(Array.isArray(data) ? data : []);
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
      await axios.post('/api/media/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('فایل‌ها با موفقیت بارگذاری شدند');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'خطا در آپلود');
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
        عکس تا ۸ مگابایت · فیلم تا ۸۰ مگابایت · فرمت‌های jpg, png, webp, gif, mp4, webm, mov
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
                <video src={m.url} className="w-full h-full object-cover" controls preload="metadata" />
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
