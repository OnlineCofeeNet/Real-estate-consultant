import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { GitCompare, Plus, Send, Loader2, X, User, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { db, useLiveQuery } from '../db/db';
import type { Customer, PropertyRequest, RequestStatus, TransactionType } from '../types';
import { createPropertyRequest, getMatchingRequests, getMatches, shareMatch, updateRequestStatus } from '../services/matchingService';
import type { MatchResult } from '../types/matching';

const TX: Array<{ value: TransactionType; label: string }> = [
  { value: 'sale', label: 'خرید / فروش' },
  { value: 'rent', label: 'اجاره' },
  { value: 'mortgage', label: 'رهن کامل' },
  { value: 'rent_mortgage', label: 'رهن و اجاره' },
];

const TYPES = [
  { value: '', label: 'همه انواع' },
  { value: 'apartment', label: 'آپارتمان' },
  { value: 'villa', label: 'ویلا' },
  { value: 'shop', label: 'مغازه' },
  { value: 'land', label: 'زمین' },
  { value: 'office', label: 'اداری' },
  { value: 'warehouse', label: 'انبار' },
];

const STATUS_LABEL: Record<RequestStatus, string> = { open: 'باز', matched: 'مچ‌شده', closed: 'بسته', archived: 'بایگانی' };
const TIER_META: Record<string, { label: string; cls: string }> = {
  excellent: { label: 'عالی', cls: 'bg-emerald-600 text-white' },
  good: { label: 'خوب', cls: 'bg-emerald-100 text-emerald-800' },
  fair: { label: 'متوسط', cls: 'bg-amber-100 text-amber-800' },
  weak: { label: 'ضعیف', cls: 'bg-slate-200 text-slate-700' },
  none: { label: 'نامرتبط', cls: 'bg-rose-100 text-rose-700' },
};

type FormState = {
  customerId: string;
  title: string;
  transactionType: TransactionType;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  minDeposit: string;
  maxDeposit: string;
  minRent: string;
  maxRent: string;
  minArea: string;
  maxArea: string;
  minBedrooms: string;
  description: string;
};

const initialForm: FormState = {
  customerId: '', title: '', transactionType: 'sale', propertyType: '', minPrice: '', maxPrice: '',
  minDeposit: '', maxDeposit: '', minRent: '', maxRent: '', minArea: '', maxArea: '', minBedrooms: '', description: '',
};

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default function Matching() {
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const [requests, setRequests] = useState<PropertyRequest[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sharingId, setSharingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

  const loadRequests = useCallback(async () => {
    try {
      setRequests(await getMatchingRequests());
    } catch {
      toast.error('خطا در بارگذاری درخواست‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const customerName = (id?: number) => customers.find((c: Customer) => c.id === id)?.fullName || `مشتری #${id ?? '-'}`;

  const runMatch = async (requestId: number) => {
    setSelectedId(requestId);
    setMatching(true);
    setExpandedId(null);
    try {
      const response = await getMatches(requestId, 35);
      setMatches(response.matches || []);
    } catch {
      setMatches([]);
      toast.error('خطا در مچ کردن');
    } finally {
      setMatching(false);
    }
  };

  const changeStatus = async (id: number, status: RequestStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateRequestStatus(id, status);
      toast.success(`وضعیت: ${STATUS_LABEL[status]}`);
      await loadRequests();
    } catch {
      toast.error('خطا در تغییر وضعیت');
    }
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const customerId = Number(form.customerId);
    if (!Number.isSafeInteger(customerId) || customerId <= 0) return toast.error('مشتری را انتخاب کنید');

    const payload: Omit<PropertyRequest, 'id' | 'createdAt' | 'updatedAt'> = {
      customerId,
      title: form.title.trim() || undefined,
      transactionType: form.transactionType,
      propertyType: form.propertyType ? form.propertyType as PropertyRequest['propertyType'] : undefined,
      status: 'open',
      minPrice: optionalNumber(form.minPrice), maxPrice: optionalNumber(form.maxPrice),
      minDeposit: optionalNumber(form.minDeposit), maxDeposit: optionalNumber(form.maxDeposit),
      minRent: optionalNumber(form.minRent), maxRent: optionalNumber(form.maxRent),
      minArea: optionalNumber(form.minArea), maxArea: optionalNumber(form.maxArea),
      minBedrooms: optionalNumber(form.minBedrooms),
      description: form.description.trim() || undefined,
    };

    if ([payload.minPrice, payload.maxPrice, payload.minDeposit, payload.maxDeposit, payload.minRent, payload.maxRent, payload.minArea, payload.maxArea]
      .some((value) => value !== undefined && value < 0)) return toast.error('مقادیر عددی نامعتبر است');

    try {
      await createPropertyRequest(payload);
      toast.success('درخواست ثبت شد');
      setForm(initialForm);
      setShowForm(false);
      await loadRequests();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? String((err as { response?: { data?: { error?: string } } }).response?.data?.error || '')
        : '';
      toast.error(message || 'خطا در ثبت درخواست');
    }
  };

  const shareToCustomer = async (propertyId: number | undefined, score: number) => {
    if (!selectedId || !propertyId) return;
    const request = requests.find((r) => r.id === selectedId);
    if (!request?.customerId || !request.id) return toast.error('درخواست مشتری یافت نشد');
    setSharingId(propertyId);
    try {
      const data = await shareMatch({ propertyId, customerId: request.customerId, requestId: request.id, matchScore: score });
      toast.success(`ارسال شد از طریق ${data.channel === 'sms' ? 'پیامک' : data.channel}`);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? String((err as { response?: { data?: { error?: string } } }).response?.data?.error || '')
        : '';
      toast.error(message || 'ارسال ناموفق');
    } finally {
      setSharingId(null);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><GitCompare size={22} /></div>
          <div><h1 className="text-xl font-bold text-slate-800">مچ فایل و درخواست</h1><p className="text-sm text-slate-500">تطبیق هوشمند · سطح کیفیت · جزئیات امتیاز</p></div>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"><Plus size={18} /> درخواست جدید</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-700 text-sm flex items-center gap-2"><User size={16} className="text-emerald-600" /> درخواست‌ها</div>
          <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
            {loading ? <div className="p-8 text-center text-slate-400 text-sm">در حال بارگذاری...</div> : requests.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">درخواستی ثبت نشده است</div> : requests.map((r) => (
              <div key={r.id} role="button" tabIndex={0} onClick={() => r.id && void runMatch(r.id)} onKeyDown={(e) => e.key === 'Enter' && r.id && void runMatch(r.id)} className={`w-full text-right px-4 py-3 hover:bg-slate-50 transition cursor-pointer ${selectedId === r.id ? 'bg-emerald-50' : ''}`}>
                <div className="flex items-start justify-between gap-2"><div className="font-medium text-slate-800">{r.title || customerName(r.customerId)}</div><span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{STATUS_LABEL[r.status]}</span></div>
                <div className="text-xs text-slate-500 mt-1">{customerName(r.customerId)} · {TX.find((t) => t.value === r.transactionType)?.label}{r.propertyType ? ` · ${TYPES.find((t) => t.value === r.propertyType)?.label || r.propertyType}` : ''}</div>
                <div className="flex flex-wrap gap-1 mt-2" onClick={(e) => e.stopPropagation()}>{(['open', 'matched', 'closed'] as RequestStatus[]).map((s) => <button key={s} type="button" onClick={(e) => r.id && void changeStatus(r.id, s, e)} className={`text-[10px] px-2 py-0.5 rounded border ${r.status === s ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>{STATUS_LABEL[s]}</button>)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-700 text-sm flex items-center gap-2"><Building2 size={16} className="text-emerald-600" /> فایل‌های پیشنهادی</div>
          <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
            {!selectedId && <p className="text-sm text-slate-400 text-center py-10">یک درخواست را انتخاب کنید</p>}
            {matching && <div className="flex items-center justify-center gap-2 text-slate-500 text-sm py-10"><Loader2 className="animate-spin" size={18} /> در حال مچ کردن...</div>}
            {!matching && selectedId && matches.length === 0 && <p className="text-sm text-slate-400 text-center py-10">فایل مشابهی یافت نشد</p>}
            {!matching && matches.map((m) => {
              const property = m.property;
              const tier = TIER_META[m.tier] || TIER_META.fair;
              const open = expandedId === property.id;
              return <div key={property.id} className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-2"><div><div className="text-xs text-slate-400 font-mono">{property.code}</div><div className="font-bold text-slate-800">{property.title}</div></div><div className="flex flex-col items-end gap-1"><span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">{m.score}%</span><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tier.cls}`}>{tier.label}</span></div></div>
                <div className="flex flex-wrap gap-1">{m.reasons.map((reason) => <span key={reason} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{reason}</span>)}</div>
                {m.breakdown && m.breakdown.length > 0 && <div><button type="button" onClick={() => setExpandedId(open ? null : property.id ?? null)} className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} جزئیات امتیاز</button>{open && <div className="mt-2 space-y-1.5 bg-slate-50 rounded-lg p-3">{m.breakdown.map((b) => { const pct = b.max > 0 ? Math.round((b.earned / b.max) * 100) : 0; return <div key={b.key}><div className="flex justify-between text-[11px] text-slate-600 mb-0.5"><span>{b.label}{b.note ? ` · ${b.note}` : ''}</span><span>{b.earned}/{b.max}</span></div><div className="h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 45 ? 'bg-amber-500' : 'bg-rose-400'}`} style={{ width: `${pct}%` }} /></div></div>; })}</div>}</div>}
                <button type="button" disabled={!property.id || sharingId === property.id} onClick={() => void shareToCustomer(property.id, m.score)} className="w-full mt-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60">{sharingId === property.id ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} ارسال به مشتری (بدون تلفن مالک)</button>
              </div>;
            })}
          </div>
        </section>
      </div>

      {showForm && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><form onSubmit={submitRequest} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4" dir="rtl">
        <div className="flex items-center justify-between"><h2 className="font-bold text-lg">ثبت درخواست مشتری</h2><button type="button" onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button></div>
        <label className="block text-sm"><span className="text-slate-600 text-xs">مشتری *</span><select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required><option value="">انتخاب کنید</option>{customers.map((c: Customer) => <option key={c.id} value={c.id}>{c.fullName} — {c.phone}</option>)}</select></label>
        <label className="block text-sm"><span className="text-slate-600 text-xs">عنوان</span><input className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً: آپارتمان ۲ خواب" /></label>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm"><span className="text-slate-600 text-xs">نوع معامله</span><select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value as TransactionType })}>{TX.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label><label className="block text-sm"><span className="text-slate-600 text-xs">نوع ملک</span><select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label></div>
        {form.transactionType === 'sale' ? <div className="grid grid-cols-2 gap-3"><NumberField label="حداقل قیمت" value={form.minPrice} onChange={(value) => setForm({ ...form, minPrice: value })} /><NumberField label="حداکثر قیمت" value={form.maxPrice} onChange={(value) => setForm({ ...form, maxPrice: value })} /></div> : <div className="grid grid-cols-2 gap-3"><NumberField label="حداقل ودیعه" value={form.minDeposit} onChange={(value) => setForm({ ...form, minDeposit: value })} /><NumberField label="حداکثر ودیعه" value={form.maxDeposit} onChange={(value) => setForm({ ...form, maxDeposit: value })} /><NumberField label="حداقل اجاره" value={form.minRent} onChange={(value) => setForm({ ...form, minRent: value })} /><NumberField label="حداکثر اجاره" value={form.maxRent} onChange={(value) => setForm({ ...form, maxRent: value })} /></div>}
        <div className="grid grid-cols-3 gap-3"><NumberField label="متراژ از" value={form.minArea} onChange={(value) => setForm({ ...form, minArea: value })} /><NumberField label="متراژ تا" value={form.maxArea} onChange={(value) => setForm({ ...form, maxArea: value })} /><NumberField label="حداقل اتاق" value={form.minBedrooms} onChange={(value) => setForm({ ...form, minBedrooms: value })} /></div>
        <label className="block text-sm"><span className="text-slate-600 text-xs">توضیحات</span><textarea className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button type="submit" className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700">ثبت درخواست</button>
      </form></div>}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm"><span className="text-slate-600 text-xs">{label}</span><input type="number" min="0" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}
