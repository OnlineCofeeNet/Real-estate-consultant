import React, { useState, useEffect } from 'react';
import { X, User, Phone, Shield } from 'lucide-react';
import { db } from '../db/db';
import { getSession } from '../services/auth';
import toast from 'react-hot-toast';

export const UserProfileModal = ({ onClose }: { onClose: () => void }) => {
  const session = getSession();
  const [phone, setPhone] = useState('');
  const [q1, setQ1] = useState('');
  const [a1, setA1] = useState('');
  const [q2, setQ2] = useState('');
  const [a2, setA2] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    db.users.get(session.userId).then(u => {
      if (u) {
        setPhone(u.phone || '');
        setQ1(u.securityQuestion1 || '');
        setQ2(u.securityQuestion2 || '');
      }
      setLoading(false);
    });
  }, [session]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    try {
      const payload: any = { phone, securityQuestion1: q1, securityQuestion2: q2 };
      
      // Update answers if provided
      if (a1 || a2) {
        const { derivePasswordHash } = await import('../services/auth');
        const user = await db.users.get(session.userId);
        if (user && user.salt) {
          if (a1) payload.securityAnswer1Hash = await derivePasswordHash(a1.trim().toLowerCase(), user.salt);
          if (a2) payload.securityAnswer2Hash = await derivePasswordHash(a2.trim().toLowerCase(), user.salt);
        }
      }

      await db.users.update(session.userId, payload);
      toast.success('تنظیمات امنیتی با موفقیت بروز شد');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'خطا در بروزرسانی');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
            <User className="text-emerald-500" size={20} />
            پروفایل و تنظیمات امنیتی
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={save} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-xl leading-relaxed">
            از این شماره موبایل و سوالات امنیتی برای بازیابی رمز عبور استفاده می‌شود.
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><Phone size={14}/> شماره موبایل</label>
            <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors bg-slate-50" dir="ltr" />
          </div>
          
          <div className="border-t border-slate-100 pt-4 mt-4">
            <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><Shield size={14}/> سوال امنیتی اول</label>
            <input required value={q1} onChange={e => setQ1(e.target.value)} placeholder="مثال: نام شهر تولد شما؟" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors bg-slate-50 mb-3" />
            
            <label className="block text-sm font-bold text-slate-700 mb-1">پاسخ جدید (خالی بگذارید تا تغییر نکند)</label>
            <input value={a1} onChange={e => setA1(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors bg-slate-50" />
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4">
            <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><Shield size={14}/> سوال امنیتی دوم</label>
            <input required value={q2} onChange={e => setQ2(e.target.value)} placeholder="مثال: نام معلم کلاس اول؟" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors bg-slate-50 mb-3" />
            
            <label className="block text-sm font-bold text-slate-700 mb-1">پاسخ جدید (خالی بگذارید تا تغییر نکند)</label>
            <input value={a2} onChange={e => setA2(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors bg-slate-50" />
          </div>

          <button type="submit" disabled={saving} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-colors mt-6 disabled:opacity-50">
            {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
          </button>
        </form>
      </div>
    </div>
  );
};
