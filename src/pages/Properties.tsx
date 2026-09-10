import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Building2, Save, X, MapPin, Home, Banknote, Ruler,
  Layers, Calendar, Car, Hash, FileText, CheckSquare
} from 'lucide-react';
import { db } from '../db/db';
import type {
  Property, PropertyType, TransactionType, PropertyStatus, PropertyFeature, Customer
} from '../types';
import { useLiveQuery } from '../db/db';

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

export default function Properties() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const [form, setForm] = useState<Property>({ ...emptyForm, code: generatePropertyCode() });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  useEffect(() => {
    if (!editId) return;
    setLoading(true);
    db.properties.get(Number(editId))
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

    if (!form.code.trim()) {
      toast.error('کد ملک الزامی است');
      return;
    }
    if (!form.title.trim()) {
      toast.error('عنوان ملک الزامی است');
      return;
    }

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

      if (form.id) {
        await db.properties.put(payload);
        toast.success('ملک با موفقیت ویرایش شد');
      } else {
        const id = await db.properties.add(payload);
        toast.success('ملک با موفقیت ثبت شد');
        // بعد از ثبت، به حالت ویرایش همان ملک برو
        navigate(`/properties?id=${id}`, { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'خطا در ذخیره‌سازی ملک');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        در حال بارگذاری...
      </div>
    );
  }

  const isEdit = Boolean(form.id);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isEdit ? 'ویرایش ملک' : 'ثبت ملک جدید'}
            </h1>
            <p className="text-sm text-slate-500">
              {isEdit ? `کد: ${form.code}` : 'اطلاعات ملک را وارد کنید'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/properties')}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center gap-2"
          >
            <X size={16} />
            انصراف
          </button>
          <button
            type="submit"
            form="property-form"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'در حال ذخیره...' : isEdit ? 'ذخیره تغییرات' : 'ثبت ملک'}
          </button>
        </div>
      </div>

      <form id="property-form" onSubmit={handleSubmit} className="space-y-6">
        {/* اطلاعات اصلی */}
        <Section title="اطلاعات اصلی" icon={<Home size={18} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="کد ملک" required>
              <div className="relative">
                <Hash size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pr-9"
                  value={form.code}
                  onChange={(e) => update('code', e.target.value)}
                  placeholder="P-1403-1001"
                  required
                />
              </div>
            </Field>

            <Field label="عنوان ملک" required className="md:col-span-2">
              <input
                className="input"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="مثلاً: آپارتمان ۱۲۰ متری نیاوران"
                required
              />
            </Field>

            <Field label="نوع ملک">
              <select
                className="input"
                value={form.propertyType}
                onChange={(e) => update('propertyType', e.target.value as PropertyType)}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="نوع معامله">
              <select
                className="input"
                value={form.transactionType}
                onChange={(e) => update('transactionType', e.target.value as TransactionType)}
              >
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="وضعیت">
              <select
                className="input"
                value={form.status}
                onChange={(e) => update('status', e.target.value as PropertyStatus)}
              >
                {PROPERTY_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* قیمت‌ها */}
        <Section title="قیمت‌ها" icon={<Banknote size={18} />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="قیمت فروش (ریال)">
              <input
                type="number"
                className="input"
                value={form.price ?? ''}
                onChange={(e) => update('price', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="۰"
                min={0}
              />
            </Field>
            <Field label="ودیعه / رهن (ریال)">
              <input
                type="number"
                className="input"
                value={form.deposit ?? ''}
                onChange={(e) => update('deposit', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="۰"
                min={0}
              />
            </Field>
            <Field label="اجاره ماهانه (ریال)">
              <input
                type="number"
                className="input"
                value={form.rent ?? ''}
                onChange={(e) => update('rent', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="۰"
                min={0}
              />
            </Field>
          </div>
        </Section>

        {/* مشخصات فیزیکی */}
        <Section title="مشخصات فیزیکی" icon={<Ruler size={18} />}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Field label="متراژ (متر)">
              <input
                type="number"
                className="input"
                value={form.area ?? ''}
                onChange={(e) => update('area', e.target.value ? Number(e.target.value) : undefined)}
                min={0}
                step="0.1"
              />
            </Field>
            <Field label="تعداد اتاق">
              <input
                type="number"
                className="input"
                value={form.bedrooms ?? ''}
                onChange={(e) => update('bedrooms', e.target.value ? Number(e.target.value) : undefined)}
                min={0}
              />
            </Field>
            <Field label="تعداد سرویس">
              <input
                type="number"
                className="input"
                value={form.bathrooms ?? ''}
                onChange={(e) => update('bathrooms', e.target.value ? Number(e.target.value) : undefined)}
                min={0}
              />
            </Field>
            <Field label="طبقه">
              <input
                type="number"
                className="input"
                value={form.floor ?? ''}
                onChange={(e) => update('floor', e.target.value ? Number(e.target.value) : undefined)}
              />
            </Field>
            <Field label="کل طبقات">
              <input
                type="number"
                className="input"
                value={form.totalFloors ?? ''}
                onChange={(e) => update('totalFloors', e.target.value ? Number(e.target.value) : undefined)}
                min={0}
              />
            </Field>
            <Field label="سال ساخت">
              <input
                type="number"
                className="input"
                value={form.yearBuilt ?? ''}
                onChange={(e) => update('yearBuilt', e.target.value ? Number(e.target.value) : undefined)}
                min={1300}
                max={1500}
              />
            </Field>
            <Field label="تعداد پارکینگ">
              <div className="relative">
                <Car size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  className="input pr-9"
                  value={form.parkingSpaces ?? 0}
                  onChange={(e) => update('parkingSpaces', Number(e.target.value) || 0)}
                  min={0}
                />
              </div>
            </Field>
          </div>
        </Section>

        {/* موقعیت */}
        <Section title="موقعیت" icon={<MapPin size={18} />}>
          <div className="grid grid-cols-1 gap-4">
            <Field label="آدرس کامل">
              <textarea
                className="input min-h-[80px]"
                value={form.address || ''}
                onChange={(e) => update('address', e.target.value)}
                placeholder="خیابان، کوچه، پلاک، واحد..."
              />
            </Field>
          </div>
        </Section>

        {/* امکانات */}
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

        {/* مالک و توضیحات */}
        <Section title="مالک و توضیحات" icon={<FileText size={18} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="مالک (از لیست مشتریان)">
              <select
                className="input"
                value={form.ownerId ?? ''}
                onChange={(e) => update('ownerId', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">— انتخاب کنید —</option>
                {customers.map((c: Customer) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <div className="md:col-span-2">
              <Field label="توضیحات">
                <textarea
                  className="input min-h-[100px]"
                  value={form.description || ''}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="توضیحات عمومی ملک..."
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="یادداشت داخلی (فقط برای مشاور)">
                <textarea
                  className="input min-h-[80px]"
                  value={form.notes || ''}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="یادداشت خصوصی..."
                />
              </Field>
            </div>
          </div>
        </Section>
      </form>

      <style>{`
        .input {
          width: 100%;
          padding: 0.55rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          background: white;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
        }
      `}</style>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
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

function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}
        {required && <span className="text-rose-500 mr-1">*</span>}
      </label>
      {children}
    </div>
  );
}
