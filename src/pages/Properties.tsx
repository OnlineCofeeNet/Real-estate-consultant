import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Building2, Plus, Search, Pencil, Trash2, X, MapPin, BedDouble, Car, Warehouse, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../db/db';
import type { Property, PropertyStatus, PropertyTransaction, PropertyType } from '../types';

const typeLabels: Record<PropertyType, string> = { apartment: 'آپارتمان', house: 'خانه', villa: 'ویلا', land: 'زمین', office: 'دفتر کار', shop: 'مغازه', warehouse: 'انبار', other: 'سایر' };
const transactionLabels: Record<PropertyTransaction, string> = { sale: 'فروش', rent: 'اجاره', mortgage: 'رهن', sale_rent: 'رهن و اجاره' };
const statusLabels: Record<PropertyStatus, string> = { available: 'موجود', reserved: 'رزرو شده', sold: 'فروخته شده', rented: 'اجاره داده شده', inactive: 'غیرفعال' };

const emptyForm: Omit<Property, 'id' | 'createdAt' | 'updatedAt'> = {
  code: '', title: '', type: 'apartment', transaction: 'sale', status: 'available', price: 0, deposit: 0, rent: 0,
  area: 0, bedrooms: 0, floor: 0, totalFloors: 0, parking: false, elevator: false, storage: false, yearBuilt: 0,
  address: '', areaName: '', latitude: undefined, longitude: undefined, description: '', ownerId: undefined, agentId: undefined,
};

const money = (value?: number) => value ? new Intl.NumberFormat('fa-IR').format(value) + ' تومان' : '—';

export default function Properties() {
  const properties = useLiveQuery(() => db.properties.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | PropertyType>('all');
  const [transaction, setTransaction] = useState<'all' | PropertyTransaction>('all');
  const [status, setStatus] = useState<'all' | PropertyStatus>('all');
  const [editing, setEditing] = useState<Property | null>(null);
  const [form, setForm] = useState(emptyForm);
  const formOpen = editing !== null || form.code !== '';

  const filtered = useMemo(() => properties.filter(p => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || [p.code, p.title, p.address, p.areaName].some(v => String(v ?? '').toLowerCase().includes(q));
    return matchesQuery && (type === 'all' || p.type === type) && (transaction === 'all' || p.transaction === transaction) && (status === 'all' || p.status === status);
  }), [properties, query, type, transaction, status]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setForm(prev => ({ ...prev, code: '__new__' })); };
  const openEdit = (p: Property) => { setEditing(p); setForm({ ...p }); };
  const closeForm = () => { setEditing(null); setForm(emptyForm); };
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(prev => ({ ...prev, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || form.code === '__new__' || !form.title.trim()) return toast.error('کد و عنوان ملک الزامی است.');
    if (!form.area || form.area <= 0) return toast.error('متراژ ملک را وارد کنید.');
    const now = new Date().toISOString();
    try {
      if (editing?.id) await db.properties.update(editing.id, { ...form, code: form.code.trim(), title: form.title.trim(), updatedAt: now });
      else await db.properties.add({ ...form, code: form.code.trim(), title: form.title.trim(), createdAt: now, updatedAt: now });
      toast.success(editing ? 'ملک ویرایش شد.' : 'ملک جدید ثبت شد.'); closeForm();
    } catch (error) { console.error(error); toast.error('ذخیره ملک انجام نشد؛ احتمالاً کد ملک تکراری است.'); }
  };

  const remove = async (p: Property) => {
    if (!window.confirm(`ملک «${p.title}» حذف شود؟`)) return;
    try { await db.transaction('rw', db.properties, db.propertyImages, async () => { await db.propertyImages.where('propertyId').equals(p.id!).delete(); await db.properties.delete(p.id!); }); toast.success('ملک حذف شد.'); }
    catch (error) { console.error(error); toast.error('حذف ملک انجام نشد.'); }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
  const toggle = (key: 'parking' | 'elevator' | 'storage') => <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={Boolean(form[key])} onChange={e => set(key, e.target.checked)} className="accent-emerald-600" />{key === 'parking' ? 'پارکینگ' : key === 'elevator' ? 'آسانسور' : 'انباری'}</label>;

  return <div className="space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Building2 className="text-emerald-600" /> مدیریت املاک</h2><p className="text-sm text-slate-500 mt-1">ثبت، جست‌وجو و مدیریت فایل‌های ملکی</p></div>
      <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-white font-medium hover:bg-emerald-700"><Plus size={18} /> ثبت ملک جدید</button>
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="relative"><Search className="absolute right-3 top-3 text-slate-400" size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="جست‌وجو بر اساس کد، عنوان، محله یا آدرس..." className={`${inputClass} pr-10`} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select value={type} onChange={e => setType(e.target.value as typeof type)} className={inputClass}><option value="all">همه نوع ملک</option>{Object.entries(typeLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={transaction} onChange={e => setTransaction(e.target.value as typeof transaction)} className={inputClass}><option value="all">همه معاملات</option>{Object.entries(transactionLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className={inputClass}><option value="all">همه وضعیت‌ها</option>{Object.entries(statusLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
    </div>
    {filtered.length === 0 ? <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500"><Building2 className="mx-auto mb-3 text-slate-300" size={42} /><p>ملکی با این مشخصات پیدا نشد.</p></div> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map(p => <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3"><div><div className="text-xs text-emerald-600 font-bold">کد {p.code}</div><h3 className="font-bold text-lg text-slate-800 mt-1">{p.title}</h3></div><span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-medium">{statusLabels[p.status]}</span></div>
      <div className="flex flex-wrap gap-3 text-sm text-slate-600 mt-4"><span>{typeLabels[p.type]}</span><span>•</span><span>{transactionLabels[p.transaction]}</span><span>•</span><span>{p.area.toLocaleString('fa-IR')} متر</span>{p.bedrooms ? <><span>•</span><span className="inline-flex items-center gap-1"><BedDouble size={15}/>{p.bedrooms} خواب</span></> : null}</div>
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">{p.parking && <span className="inline-flex gap-1 items-center"><Car size={14}/> پارکینگ</span>}{p.storage && <span className="inline-flex gap-1 items-center"><Warehouse size={14}/> انباری</span>}{p.areaName && <span className="inline-flex gap-1 items-center"><MapPin size={14}/> {p.areaName}</span>}</div>
      <div className="grid grid-cols-2 gap-2 mt-4 text-sm"><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500 block">قیمت فروش</span><strong>{money(p.price)}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500 block">رهن / اجاره</span><strong>{p.deposit || p.rent ? `${money(p.deposit)} / ${money(p.rent)}` : '—'}</strong></div></div>
      <div className="flex justify-end gap-2 mt-4 border-t border-slate-100 pt-3"><button onClick={() => openEdit(p)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"><Pencil size={15}/> ویرایش</button><button onClick={() => remove(p)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={15}/> حذف</button></div>
    </div>)}</div>}
    <div className="text-xs text-slate-500">تعداد فایل‌های نمایش‌داده‌شده: {filtered.length.toLocaleString('fa-IR')} از {properties.length.toLocaleString('fa-IR')}</div>
    {formOpen && <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center" onMouseDown={e => { if (e.target === e.currentTarget) closeForm(); }}><form onSubmit={save} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" dir="rtl"><div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between"><div><h3 className="font-bold text-lg">{editing ? 'ویرایش ملک' : 'ثبت ملک جدید'}</h3><p className="text-xs text-slate-500 mt-1">اطلاعات اصلی فایل ملک را تکمیل کنید.</p></div><button type="button" onClick={closeForm} className="p-2 rounded-lg hover:bg-slate-100"><X size={20}/></button></div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <label className="text-sm">کد ملک *<input value={form.code === '__new__' ? '' : form.code} onChange={e => set('code', e.target.value)} className={inputClass} /></label>
        <label className="text-sm">عنوان ملک *<input value={form.title} onChange={e => set('title', e.target.value)} className={inputClass} /></label>
        <label className="text-sm">نوع ملک<select value={form.type} onChange={e => set('type', e.target.value as PropertyType)} className={inputClass}>{Object.entries(typeLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="text-sm">نوع معامله<select value={form.transaction} onChange={e => set('transaction', e.target.value as PropertyTransaction)} className={inputClass}>{Object.entries(transactionLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="text-sm">وضعیت<select value={form.status} onChange={e => set('status', e.target.value as PropertyStatus)} className={inputClass}>{Object.entries(statusLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="text-sm">متراژ *<input type="number" min="1" value={form.area || ''} onChange={e => set('area', Number(e.target.value))} className={inputClass} /></label>
        <label className="text-sm">تعداد خواب<input type="number" min="0" value={form.bedrooms || ''} onChange={e => set('bedrooms', Number(e.target.value))} className={inputClass} /></label>
        <label className="text-sm">طبقه<input type="number" min="0" value={form.floor || ''} onChange={e => set('floor', Number(e.target.value))} className={inputClass} /></label>
        <label className="text-sm">تعداد طبقات<input type="number" min="0" value={form.totalFloors || ''} onChange={e => set('totalFloors', Number(e.target.value))} className={inputClass} /></label>
        <label className="text-sm">سال ساخت<input type="number" min="0" value={form.yearBuilt || ''} onChange={e => set('yearBuilt', Number(e.target.value))} className={inputClass} /></label>
        <label className="text-sm">قیمت فروش<input type="number" min="0" value={form.price || ''} onChange={e => set('price', Number(e.target.value))} className={inputClass} /></label>
        <label className="text-sm">مبلغ رهن<input type="number" min="0" value={form.deposit || ''} onChange={e => set('deposit', Number(e.target.value))} className={inputClass} /></label>
        <label className="text-sm">اجاره ماهانه<input type="number" min="0" value={form.rent || ''} onChange={e => set('rent', Number(e.target.value))} className={inputClass} /></label>
        <label className="text-sm">محله<input value={form.areaName || ''} onChange={e => set('areaName', e.target.value)} className={inputClass} /></label>
        <label className="text-sm">آدرس<input value={form.address || ''} onChange={e => set('address', e.target.value)} className={inputClass} /></label>
        <div className="flex items-center gap-5 md:col-span-2 lg:col-span-1 pt-6">{toggle('parking')}{toggle('elevator')}{toggle('storage')}</div>
        <label className="text-sm md:col-span-2 lg:col-span-3">توضیحات<textarea rows={4} value={form.description || ''} onChange={e => set('description', e.target.value)} className={inputClass} /></label>
      </div><div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-2"><button type="button" onClick={closeForm} className="rounded-xl border px-4 py-2.5">انصراف</button><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-2.5"><Save size={17}/> ذخیره ملک</button></div></form></div>}
  </div>;
}
