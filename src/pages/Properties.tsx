import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { PropertyMediaGallery } from '../components/PropertyMediaGallery';
import {
  Building2, Save, X, MapPin, Home, Banknote, Ruler,
  Car, Hash, FileText, CheckSquare, Plus, Search, Pencil, Trash2, Filter, ImagePlus
} from 'lucide-react';
import { db, useLiveQuery } from '../db/db';
import type {
  Property, PropertyType, TransactionType, PropertyStatus, PropertyFeature, Customer
} from '../types';

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'آپارتمان' },
  { value: 'villa', label: 'ویلا / خانه ویلایی' },
  { value: 'shop', label: 'مغازه / تجاری' },
  { value: 'land', label: 'زمین' },
  { value: 'office', label: 'دفتر کار / اداری' },
  { value: 'warehouse', label: 'انبار / سوله' },
  { value: 'other', label: 'سایر' },
];

const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'sale', label: 'فروش' },
  { value: 'rent', label: 'اجاره' },
  { value: 'mortgage', label: 'رهن کامل' },
  { value: 'rent_mortgage', label: 'رهن و اجاره' },
];

const PROPERTY_STATUSES: { value: PropertyStatus; label: string }[] = [
  { value: 'available', label: 'موجود' },
  { value: 'reserved', label: 'رزرو شده' },
  { value: 'sold', label: 'فروخته شده' },
  { value: 'rented', label: 'اجاره رفته' },
  { value: 'archived', label: 'بایگانی' },
];

const FEATURE_OPTIONS: { value: PropertyFeature; label: string }[] = [
  { value: 'elevator', label: 'آسانسور' },
  { value: 'parking', label: 'پارکینگ' },
  { value: 'storage', label: 'انباری' },
  { value: 'balcony', label: 'بالکن / تراس' },
  { value: 'garden', label: 'حیاط / باغ' },
  { value: 'pool', label: 'استخر' },
  { value: 'sauna', label: 'سونا' },
  { value: 'gym', label: 'باشگاه' },
  { value: 'security', label: 'نگهبانی' },
  { value: 'central_heating', label: 'گرمایش مرکزی' },
  { value: 'package', label: 'پکیج' },
  { value: 'cooler', label: 'کولر' },
  { value: 'furnished', label: 'مبله' },
  { value: 'renovated', label: 'بازسازی‌شده' },
  { value: 'corner', label: 'نبش' },
  { value: 'master_room', label: 'اتاق مستر' },
  { value: 'laundry', label: 'لاندری' },
];

const emptyForm: Property = {
  code: '',
  title: '',
  propertyType: 'apartment',
  transactionType: 'sale',
  status: 'available',
  price: undefined,
  deposit: undefined,
  rent: undefined,
  area: undefined,
  bedrooms: undefined,
  bathrooms: undefined,
  floor: undefined,
  totalFloors: undefined,
  yearBuilt: undefined,
  parkingSpaces: 0,
  address: '',
  features: [],
  description: '',
  notes: '',
  ownerId: undefined,
  createdAt: Date.now(),
};

function generatePropertyCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `P-${year}-${rand}`;
}

function labelOf<T extends string>(list: { value: T; label: string }[], value?: T) {
  return list.find((i) => i.value === value)?.label || value || '—';
}

function formatPrice(n?: number) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('fa-IR').format(n);
}

export default function Properties() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const mode = searchParams.get('mode');

  const showForm = mode === 'new' || Boolean(editId);

  const properties = useLiveQuery(() => db.properties.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  const [q, setQ] = useState('');
  const [filterType, setFilterType] = useState<PropertyType | ''>('');
  const [filterTx, setFilterTx] = useState<TransactionType | ''>('');
  const [filterStatus, setFilterStatus] = useState<PropertyStatus | ''>('');
  const [primaryThumbs, setPrimaryThumbs] = useState<Record<number, string>>({});

  useEffect(() => {
    axios.get('/api/propertyMedia')
      .then(({ data }) => {
        const map: Record<number, string> = {};
        const list = Array.isArray(data) ? data : [];
        const byProp: Record<number, any[]> = {};
        for (const m of list) {
          if (m.type && m.type !== 'image') continue;
          if (!m.propertyId || !m.url) continue;
          (byProp[m.propertyId] ||= []).push(m);
        }
        for (const [pid, arr] of Object.entries(byProp)) {
          const sorted = arr.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) || (a.sortOrder || 0) - (b.sortOrder || 0));
          if (sorted[0]) map[Number(pid)] = sorted[0].url;
        }
        setPrimaryThumbs(map);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return properties
      .filter((p) => {
        if (filterType && p.propertyType !== filterType) return false;
        if (filterTx && p.transactionType !== filterTx) return false;
        if (filterStatus && p.status !== filterStatus) return false;
        if (!query) return true;
        const hay = [p.code, p.title, p.address, p.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [properties, q, filterType, filterTx, filterStatus]);

  const openNew = () => setSearchParams({ mode: 'new' });
  const openEdit = (id: number) => setSearchParams({ id: String(id) });
  const closeForm = () => setSearchParams({});

  const handleDelete = async (p: Property) => {
    if (!p.id) return;
    if (!confirm(`آیا از حذف ملک «${p.title}» مطمئن هستید؟`)) return;
    try {
      await db.properties.delete(p.id);
      toast.success('ملک حذف شد');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'خطا در حذف ملک');
    }
  };

  if (showForm) {
    return (
      <PropertyForm
        editId={editId ? Number(editId) : undefined}
        customers={customers}
        onClose={closeForm}
        onSaved={(id) => setSearchParams({ id: String(id) })}
      />
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">املاک</h1>
            <p className="text-sm text-slate-500">{filtered.length} ملک</p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition font-medium"
        >
          <Plus size={18} />
          ثبت ملک جدید
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-slate-600 text-sm font-medium">
          <Filter size={16} />
          فیلتر و جستجو
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pr-9"
              placeholder="جستجو در کد، عنوان، آدرس..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="input" value={filterType} onChange={(e) => setFilterType(e.target.value as PropertyType | '')}>
            <option value="">همه انواع ملک</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select className="input" value={filterTx} onChange={(e) => setFilterTx(e.target.value as TransactionType | '')}>
            <option value="">همه انواع معامله</option>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as PropertyStatus | '')}>
            <option value="">همه وضعیت‌ها</option>
            {PROPERTY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          <Building2 className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="font-medium">ملکی یافت نشد</p>
          <p className="text-sm mt-1">با دکمه «ثبت ملک جدید» اولین ملک را اضافه کنید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
                {primaryThumbs[p.id!] ? (
                  <img src={primaryThumbs[p.id!]} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Building2 size={40} />
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-400 font-mono">{p.code}</div>
                    <h3 className="font-bold text-slate-800 leading-snug mt-0.5">{p.title}</h3>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{labelOf(PROPERTY_TYPES, p.propertyType)}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{labelOf(TRANSACTION_TYPES, p.transactionType)}</span>
                  {p.area != null && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{p.area} متر</span>}
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  {p.transactionType === 'sale' && p.price != null && (
                    <div>قیمت: <strong className="text-slate-800">{formatPrice(p.price)}</strong> ریال</div>
                  )}
                  {(p.transactionType === 'rent' || p.transactionType === 'rent_mortgage' || p.transactionType === 'mortgage') && (
                    <>
                      {p.deposit != null && <div>ودیعه: <strong className="text-slate-800">{formatPrice(p.deposit)}</strong></div>}
                      {p.rent != null && <div>اجاره: <strong className="text-slate-800">{formatPrice(p.rent)}</strong></div>}
                    </>
                  )}
                  {p.address && (
                    <div className="flex items-start gap-1 text-slate-500 text-xs mt-1">
                      <MapPin size={12} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{p.address}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex gap-2 bg-slate-50/50">
                <button onClick={() => openEdit(p.id!)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition">
                  <Pencil size={14} /> ویرایش
                </button>
                <button onClick={() => handleDelete(p)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 transition" title="حذف">
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <style>{`
        .input { width: 100%; padding: 0.55rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: white; font-size: 0.9rem; outline: none; }
        .input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12); }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }: { status?: PropertyStatus }) {
  const map: Record<PropertyStatus, string> = {
    available: 'bg-emerald-100 text-emerald-700',
    reserved: 'bg-amber-100 text-amber-700',
    sold: 'bg-slate-200 text-slate-700',
    rented: 'bg-blue-100 text-blue-700',
    archived: 'bg-slate-100 text-slate-500',
  };
  const cls = status ? map[status] : 'bg-slate-100 text-slate-500';
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {labelOf(PROPERTY_STATUSES, status)}
    </span>
  );
}

function PropertyForm({
  editId,
  customers,
  onClose,
  onSaved,
}: {
  editId?: number;
  customers: Customer[];
  onClose: () => void;
  onSaved: (id: number) => void;
}) {
  const [form, setForm] = useState<Property>({ ...emptyForm, code: generatePropertyCode() });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  useEffect(() => {
    if (!editId) return;
    setLoading(true);
    db.properties.get(editId)
      .then((p) => {
        if (p) setForm(p);
        else toast.error('ملک یافت نشد');
      })
      .catch(() => toast.error('خطا در بارگذاری ملک'))
      .finally(() => setLoading(false));
  }, [editId]);

  const update = <K extends keyof Property>(key: K, value: Property[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFeature = (feature: PropertyFeature) => {
    const current = (form.features || []) as PropertyFeature[];
    const next = current.includes(feature)
      ? current.filter((f) => f !== feature)
      : [...current, feature];
    update('features', next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return toast.error('کد ملک الزامی است');
    if (!form.title.trim()) return toast.error('عنوان ملک الزامی است');

    setSaving(true);
    try {
      const payload: Property = {
        ...form,
        code: form.code.trim(),
        title: form.title.trim(),
        updatedAt: Date.now(),
        createdAt: form.createdAt || Date.now(),
        listedAt: form.listedAt || Date.now(),
      };

      let savedId: number;
      if (form.id) {
        await db.properties.put(payload);
        savedId = form.id;
        toast.success('ملک با موفقیت ویرایش شد');
      } else {
        savedId = await db.properties.add(payload);
        toast.success('ملک با موفقیت ثبت شد');
      }

      try {
        const { data } = await axios.post(`/api/matching/auto-match/${savedId}`, {
          minScore: 50,
          markMatchedScore: 70,
        });
        if (data?.count > 0) {
          toast.success(
            `${data.count} درخواست مشابه پیدا شد${data.markedMatched ? ` · ${data.markedMatched} مورد مچ‌شده` : ''}`,
            { duration: 5000 },
          );
        }
      } catch {
        /* مچ اختیاری */
      }

      onSaved(savedId);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'خطا در ذخیره‌سازی ملک');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">در حال بارگذاری...</div>;
  }

  const isEdit = Boolean(form.id);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{isEdit ? 'ویرایش ملک' : 'ثبت ملک جدید'}</h1>
            <p className="text-sm text-slate-500">{isEdit ? `کد: ${form.code}` : 'اطلاعات ملک را وارد کنید'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center gap-2">
            <X size={16} /> بازگشت به لیست
          </button>
          <button type="submit" form="property-form" disabled={saving} className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-60">
            <Save size={16} />
            {saving ? 'در حال ذخیره...' : isEdit ? 'ذخیره تغییرات' : 'ثبت ملک'}
          </button>
        </div>
      </div>

      <form id="property-form" onSubmit={handleSubmit} className="space-y-6">
        <Section title="اطلاعات اصلی" icon={<Home size={18} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="کد ملک" required>
              <div className="relative">
                <Hash size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pr-9" value={form.code} onChange={(e) => update('code', e.target.value)} required />
              </div>
            </Field>
            <Field label="عنوان ملک" required className="md:col-span-2">
              <input className="input" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="مثلاً: آپارتمان ۱۲۰ متری نیاوران" required />
            </Field>
            <Field label="نوع ملک">
              <select className="input" value={form.propertyType} onChange={(e) => update('propertyType', e.target.value as PropertyType)}>
                {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="نوع معامله">
              <select className="input" value={form.transactionType} onChange={(e) => update('transactionType', e.target.value as TransactionType)}>
                {TRANSACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="وضعیت">
              <select className="input" value={form.status} onChange={(e) => update('status', e.target.value as PropertyStatus)}>
                {PROPERTY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="قیمت‌ها" icon={<Banknote size={18} />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="قیمت فروش (ریال)">
              <input type="number" className="input" value={form.price ?? ''} onChange={(e) => update('price', e.target.value ? Number(e.target.value) : undefined)} min={0} />
            </Field>
            <Field label="ودیعه / رهن (ریال)">
              <input type="number" className="input" value={form.deposit ?? ''} onChange={(e) => update('deposit', e.target.value ? Number(e.target.value) : undefined)} min={0} />
            </Field>
            <Field label="اجاره ماهانه (ریال)">
              <input type="number" className="input" value={form.rent ?? ''} onChange={(e) => update('rent', e.target.value ? Number(e.target.value) : undefined)} min={0} />
            </Field>
          </div>
        </Section>

        <Section title="مشخصات فیزیکی" icon={<Ruler size={18} />}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Field label="متراژ (متر)">
              <input type="number" className="input" value={form.area ?? ''} onChange={(e) => update('area', e.target.value ? Number(e.target.value) : undefined)} min={0} step="0.1" />
            </Field>
            <Field label="تعداد اتاق">
              <input type="number" className="input" value={form.bedrooms ?? ''} onChange={(e) => update('bedrooms', e.target.value ? Number(e.target.value) : undefined)} min={0} />
            </Field>
            <Field label="تعداد سرویس">
              <input type="number" className="input" value={form.bathrooms ?? ''} onChange={(e) => update('bathrooms', e.target.value ? Number(e.target.value) : undefined)} min={0} />
            </Field>
            <Field label="طبقه">
              <input type="number" className="input" value={form.floor ?? ''} onChange={(e) => update('floor', e.target.value ? Number(e.target.value) : undefined)} />
            </Field>
            <Field label="کل طبقات">
              <input type="number" className="input" value={form.totalFloors ?? ''} onChange={(e) => update('totalFloors', e.target.value ? Number(e.target.value) : undefined)} min={0} />
            </Field>
            <Field label="سال ساخت">
              <input type="number" className="input" value={form.yearBuilt ?? ''} onChange={(e) => update('yearBuilt', e.target.value ? Number(e.target.value) : undefined)} min={1300} max={1500} />
            </Field>
            <Field label="تعداد پارکینگ">
              <div className="relative">
                <Car size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" className="input pr-9" value={form.parkingSpaces ?? 0} onChange={(e) => update('parkingSpaces', Number(e.target.value) || 0)} min={0} />
              </div>
            </Field>
          </div>
        </Section>

        <Section title="موقعیت" icon={<MapPin size={18} />}>
          <Field label="آدرس کامل">
            <textarea className="input min-h-[80px]" value={form.address || ''} onChange={(e) => update('address', e.target.value)} placeholder="خیابان، کوچه، پلاک، واحد..." />
          </Field>
        </Section>

        <Section title="امکانات" icon={<CheckSquare size={18} />}>
          <div className="flex flex-wrap gap-2">
            {FEATURE_OPTIONS.map((f) => {
              const active = ((form.features || []) as string[]).includes(f.value);
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => toggleFeature(f.value)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    active
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </Section>

        {form.id ? (
          <Section title="عکس و فیلم واحد" icon={<ImagePlus size={18} />}>
            <PropertyMediaGallery propertyId={form.id} />
          </Section>
        ) : (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
            پس از ثبت اولیه ملک، می‌توانید عکس و فیلم واحد را بارگذاری کنید.
          </div>
        )}

        <Section title="مالک و توضیحات" icon={<FileText size={18} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="مالک (از لیست مشتریان)">
              <select className="input" value={form.ownerId ?? ''} onChange={(e) => update('ownerId', e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">— انتخاب کنید —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName}{c.phone ? ` (${c.phone})` : ''}</option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="توضیحات">
                <textarea className="input min-h-[100px]" value={form.description || ''} onChange={(e) => update('description', e.target.value)} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="یادداشت داخلی (فقط برای مشاور)">
                <textarea className="input min-h-[80px]" value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} />
              </Field>
            </div>
          </div>
        </Section>
      </form>

      <style>{`
        .input { width: 100%; padding: 0.55rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: white; font-size: 0.9rem; outline: none; }
        .input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12); }
      `}</style>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/80">
        <span className="text-emerald-600">{icon}</span>
        <h2 className="font-bold text-slate-700 text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, required, children, className = '' }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}{required && <span className="text-rose-500 mr-1">*</span>}
      </label>
      {children}
    </div>
  );
}
