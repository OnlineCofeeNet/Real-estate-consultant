import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  Search, Plus, X, ClipboardList, Trash2, Pencil, Filter, 
  Sparkles, RotateCcw, Building2, User, Phone, Calendar, 
  CheckCircle2, Bot, ArrowUpDown, ChevronDown, ChevronUp 
} from 'lucide-react';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import moment from 'moment-jalaali';
import { db, useLiveQuery } from '../db/db';
import type { 
  Customer, PropertyRequest, PropertyType, TransactionType, 
  RequestStatus, ListingSource, Property 
} from '../types';
import { toPersianDigits, toEnglishDigits, normalizeSearchQuery } from '../utils/format';
import { SendPropertyToCustomerModal } from '../components/SendPropertyToCustomerModal';

const TX: { value: TransactionType; label: string }[] = [
  { value: 'sale', label: 'خرید / فروش' },
  { value: 'rent', label: 'اجاره' },
  { value: 'mortgage', label: 'رهن کامل' },
  { value: 'rent_mortgage', label: 'رهن و اجاره' },
  { value: 'exchange', label: 'معاوضه' },
  { value: 'pre_sale', label: 'پیش‌فروش' },
  { value: 'partnership', label: 'مشارکت' },
];

const TYPES: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'آپارتمان' },
  { value: 'villa', label: 'ویلا / خانه ویلایی' },
  { value: 'shop', label: 'مغازه / تجاری' },
  { value: 'land', label: 'زمین / کلنگی' },
  { value: 'office', label: 'دفتر کار / اداری' },
  { value: 'warehouse', label: 'انبار / سوله' },
  { value: 'other', label: 'سایر' }
];

const STATUSES: { value: RequestStatus; label: string; color: string }[] = [
  { value: 'open', label: 'در جریان (باز)', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'matched', label: 'تطبیق یافته', color: 'bg-purple-100 text-purple-800' },
  { value: 'closed', label: 'مختومه / انجام شده', color: 'bg-blue-100 text-blue-800' },
  { value: 'archived', label: 'بایگانی‌شده', color: 'bg-slate-100 text-slate-700' }
];

const SOURCES: { value: ListingSource; label: string }[] = [
  { value: 'agency', label: 'مشاور املاک' },
  { value: 'website', label: 'سایت اینترنتی' },
  { value: 'bot', label: 'ربات پیام‌رسان' },
  { value: 'user', label: 'مشتری / کاربر' }
];

const empty = { 
  customerId: '', 
  title: '', 
  transactionType: 'sale' as TransactionType, 
  propertyType: '' as PropertyType | '', 
  status: 'open' as RequestStatus,
  minPrice: '', 
  maxPrice: '', 
  minDeposit: '', 
  maxDeposit: '', 
  minRent: '', 
  maxRent: '', 
  minArea: '', 
  maxArea: '', 
  minBedrooms: '', 
  maxBedrooms: '', 
  description: '', 
  notes: '', 
  source: 'agency' as ListingSource 
};

const money = (v: string) => { 
  const n = Number(v.replace(/[^0-9]/g, '')); 
  return Number.isFinite(n) && n > 0 ? n : undefined; 
};

export default function PropertyRequests() {
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const requests = useLiveQuery(() => db.propertyRequests.toArray()) || [];
  const properties = useLiveQuery(() => db.properties.toArray()) || [];

  // Basic & Advanced Search Filters
  const [q, setQ] = useState('');
  const [filterTx, setFilterTx] = useState<TransactionType | ''>('');
  const [filterType, setFilterType] = useState<PropertyType | ''>('');
  const [filterStatus, setFilterStatus] = useState<RequestStatus | ''>('');
  const [filterSource, setFilterSource] = useState<ListingSource | ''>('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Advanced numeric and date filters
  const [filterMinArea, setFilterMinArea] = useState('');
  const [filterMaxArea, setFilterMaxArea] = useState('');
  const [filterMinBudget, setFilterMinBudget] = useState('');
  const [filterMaxBudget, setFilterMaxBudget] = useState('');
  const [filterMaxDeposit, setFilterMaxDeposit] = useState('');
  const [filterMaxRent, setFilterMaxRent] = useState('');
  const [filterMinRooms, setFilterMinRooms] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Form State & Modals
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);

  // Modal to send matched property to customer via Bot
  const [matchedModalData, setMatchedModalData] = useState<{
    isOpen: boolean;
    request: PropertyRequest | null;
    customer: Customer | null;
  }>({
    isOpen: false,
    request: null,
    customer: null
  });

  const [selectedPropertyToSend, setSelectedPropertyToSend] = useState<Property | null>(null);

  // Filtered requests list
  const filtered = useMemo(() => {
    return requests.filter(r => {
      // 1. Transaction Type
      if (filterTx && r.transactionType !== filterTx && (r as any).dealType !== filterTx) return false;

      // 2. Property Type
      if (filterType && r.propertyType !== filterType) return false;

      // 3. Status
      if (filterStatus && (r.status || 'open') !== filterStatus) return false;

      // 4. Source
      if (filterSource && (r.source || 'agency') !== filterSource) return false;

      // 5. Area Range
      if (filterMinArea) {
        const rMax = r.maxArea || (r as any).area;
        if (rMax && rMax < Number(filterMinArea)) return false;
      }
      if (filterMaxArea) {
        const rMin = r.minArea || (r as any).area;
        if (rMin && rMin > Number(filterMaxArea)) return false;
      }

      // 6. Budget / Price Range
      if (filterMinBudget) {
        const rMax = r.maxPrice || (r as any).price;
        if (rMax && rMax < Number(filterMinBudget)) return false;
      }
      if (filterMaxBudget) {
        const rMin = r.minPrice || (r as any).price;
        if (rMin && rMin > Number(filterMaxBudget)) return false;
      }

      // 7. Deposit & Rent
      if (filterMaxDeposit && r.maxDeposit && r.maxDeposit > Number(filterMaxDeposit)) return false;
      if (filterMaxRent && r.maxRent && r.maxRent > Number(filterMaxRent)) return false;

      // 8. Rooms
      if (filterMinRooms && (r.minBedrooms || (r as any).minRooms || 0) < Number(filterMinRooms)) return false;

      // 9. Date Range
      if (filterDateFrom || filterDateTo) {
        let reqDate = '';
        if (r.createdAt) {
          try {
            reqDate = moment(r.createdAt).format('jYYYY/jMM/jDD');
          } catch (e) {}
        }
        if (filterDateFrom) {
          const fClean = toEnglishDigits(filterDateFrom).replace(/[^0-9]/g, '');
          const rClean = toEnglishDigits(reqDate).replace(/[^0-9]/g, '');
          if (rClean && rClean < fClean) return false;
        }
        if (filterDateTo) {
          const tClean = toEnglishDigits(filterDateTo).replace(/[^0-9]/g, '');
          const rClean = toEnglishDigits(reqDate).replace(/[^0-9]/g, '');
          if (rClean && rClean > tClean) return false;
        }
      }

      // 10. Text query (searches customer name, phone, title, description, notes, preferred neighborhoods)
      if (q.trim()) {
        const query = normalizeSearchQuery(q);
        const customer = customers.find(c => c.id === r.customerId || c.phone === (r as any).customerPhone);
        const custName = normalizeSearchQuery(customer?.fullName || (r as any).customerName);
        const custPhone = normalizeSearchQuery(customer?.phone || (r as any).customerPhone);
        const title = normalizeSearchQuery(r.title);
        const desc = normalizeSearchQuery(r.description);
        const notes = normalizeSearchQuery(r.notes);
        const neighborhoods = normalizeSearchQuery(Array.isArray((r as any).preferredNeighborhoods) ? (r as any).preferredNeighborhoods.join(' ') : '');

        const matches = (
          custName.includes(query) ||
          custPhone.includes(query) ||
          title.includes(query) ||
          desc.includes(query) ||
          notes.includes(query) ||
          neighborhoods.includes(query)
        );
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [
    requests, customers, q, filterTx, filterType, filterStatus, filterSource,
    filterMinArea, filterMaxArea, filterMinBudget, filterMaxBudget, filterMaxDeposit,
    filterMaxRent, filterMinRooms, filterDateFrom, filterDateTo
  ]);

  const setFormField = (key: keyof typeof empty, value: string) => setForm(f => ({ ...f, [key]: value }));

  const openNew = () => { 
    setEditing(null); 
    setForm(empty); 
    setShowForm(true); 
  };

  const edit = (r: PropertyRequest) => { 
    setEditing(r.id!); 
    setForm({ 
      ...empty, 
      customerId: String(r.customerId || ''), 
      title: r.title || '', 
      transactionType: r.transactionType || (r as any).dealType || 'sale', 
      propertyType: r.propertyType || '', 
      status: r.status || 'open',
      minPrice: r.minPrice ? String(r.minPrice) : '', 
      maxPrice: r.maxPrice ? String(r.maxPrice) : '', 
      minDeposit: r.minDeposit ? String(r.minDeposit) : '', 
      maxDeposit: r.maxDeposit ? String(r.maxDeposit) : '', 
      minRent: r.minRent ? String(r.minRent) : '', 
      maxRent: r.maxRent ? String(r.maxRent) : '', 
      minArea: r.minArea ? String(r.minArea) : '', 
      maxArea: r.maxArea ? String(r.maxArea) : '', 
      minBedrooms: r.minBedrooms ? String(r.minBedrooms) : '', 
      maxBedrooms: r.maxBedrooms ? String(r.maxBedrooms) : '', 
      description: r.description || '', 
      notes: r.notes || '', 
      source: r.source || 'agency' 
    }); 
    setShowForm(true); 
  };

  const save = async () => { 
    if (!form.customerId) {
      toast.error('متقاضی را انتخاب کنید');
      return;
    }
    const customer = customers.find(c => c.id === Number(form.customerId));
    const now = Date.now(); 
    const payload: PropertyRequest = { 
      customerId: Number(form.customerId), 
      customerName: customer?.fullName,
      customerPhone: customer?.phone,
      title: form.title || undefined, 
      transactionType: form.transactionType, 
      dealType: (form.transactionType === 'rent' || form.transactionType === 'rent_mortgage' || form.transactionType === 'mortgage') ? 'rent' : 'sale',
      propertyType: form.propertyType || undefined, 
      status: form.status, 
      minPrice: money(form.minPrice), 
      maxPrice: money(form.maxPrice), 
      minDeposit: money(form.minDeposit), 
      maxDeposit: money(form.maxDeposit), 
      minRent: money(form.minRent), 
      maxRent: money(form.maxRent), 
      minArea: Number(form.minArea) || undefined, 
      maxArea: Number(form.maxArea) || undefined, 
      minBedrooms: Number(form.minBedrooms) || undefined, 
      maxBedrooms: Number(form.maxBedrooms) || undefined, 
      description: form.description || undefined, 
      notes: form.notes || undefined, 
      source: form.source, 
      createdAt: editing ? (requests.find(r => r.id === editing)?.createdAt || now) : now, 
      updatedAt: now 
    }; 

    try { 
      if (editing) {
        await db.propertyRequests.update(editing, payload as any); 
        toast.success('تقاضای ملک با موفقیت ویرایش شد');
      } else {
        await db.propertyRequests.add(payload); 
        toast.success('تقاضای جدید با موفقیت ثبت شد');
      }
      setEditing(null); 
      setForm(empty); 
      setShowForm(false); 
    } catch (e: any) { 
      toast.error(e?.response?.data?.error || 'ثبت تقاضا ناموفق بود'); 
    } 
  };

  const remove = async (r: PropertyRequest) => { 
    if (!r.id || !confirm(`آیا از حذف تقاضای «${r.title || 'انتخاب‌شده'}» اطمینان دارید؟`)) return; 
    try { 
      await db.propertyRequests.delete(r.id); 
      toast.success('تقاضا حذف شد'); 
    } catch { 
      toast.error('حذف تقاضا ناموفق بود'); 
    } 
  };

  const getCustomer = (r: PropertyRequest) => {
    return customers.find(c => c.id === r.customerId || c.phone === (r as any).customerPhone);
  };

  // Find candidate properties that match this request
  const getMatchesForRequest = (r: PropertyRequest) => {
    const isRent = r.transactionType === 'rent' || r.transactionType === 'rent_mortgage' || r.transactionType === 'mortgage' || (r as any).dealType === 'rent';
    return properties.filter(p => {
      const pRent = p.transactionType === 'rent' || p.transactionType === 'rent_mortgage' || p.transactionType === 'mortgage' || (p as any).dealType === 'rent';
      if (isRent !== pRent) return false;
      if (r.propertyType && p.propertyType && r.propertyType !== p.propertyType) return false;
      if (r.minArea && p.area && p.area < r.minArea) return false;
      if (r.maxArea && p.area && p.area > r.maxArea) return false;
      return true;
    }).slice(0, 5);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">تقاضای ملک و متقاضیان</h1>
            <p className="text-sm text-slate-500">
              {toPersianDigits(requests.length)} تقاضای ثبت‌شده برای خرید، اجاره و سرمایه‌گذاری
            </p>
          </div>
        </div>

        <button 
          onClick={openNew} 
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm inline-flex items-center gap-2 shadow-xs transition"
        >
          <Plus size={18} />
          <span>ثبت تقاضای جدید</span>
        </button>
      </div>

      {/* Advanced Search Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700 text-sm font-bold">
            <Filter size={17} className="text-blue-600" />
            <span>جستجوی پیشرفته متقاضیان ملک</span>
          </div>

          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
              isAdvancedOpen || filterMinArea || filterMaxArea || filterMinBudget || filterMaxBudget || filterMaxDeposit || filterMaxRent || filterMinRooms || filterDateFrom || filterDateTo || filterSource
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sparkles size={14} className="text-purple-500" />
            <span>{isAdvancedOpen ? 'بستن فیلترهای پیشرفته' : 'فیلترهای پیشرفته (بودجه، متراژ، تاریخ)'}</span>
            {(filterMinArea || filterMaxArea || filterMinBudget || filterMaxBudget || filterMaxDeposit || filterMaxRent || filterMinRooms || filterDateFrom || filterDateTo || filterSource) && (
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            )}
          </button>
        </div>

        {/* Primary Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="جستجوی نام مشتری، تلفن، محله، عنوان..." 
              value={q} 
              onChange={e => setQ(e.target.value)}
            />
          </div>

          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            value={filterTx} 
            onChange={e => setFilterTx(e.target.value as any)}
          >
            <option value="">همه انواع معامله درخواستی</option>
            {TX.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            value={filterType} 
            onChange={e => setFilterType(e.target.value as any)}
          >
            <option value="">همه انواع ملک درخواستی</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value as any)}
          >
            <option value="">همه وضعیت‌های تقاضا</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {isAdvancedOpen && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">حداقل متراژ (متر):</label>
                <input
                  type="number"
                  placeholder="مثال: 70"
                  value={filterMinArea}
                  onChange={e => setFilterMinArea(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">حداکثر متراژ (متر):</label>
                <input
                  type="number"
                  placeholder="مثال: 140"
                  value={filterMaxArea}
                  onChange={e => setFilterMaxArea(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">حداقل بودجه خرید:</label>
                <input
                  type="number"
                  placeholder="حداقل قیمت خرید"
                  value={filterMinBudget}
                  onChange={e => setFilterMinBudget(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">حداکثر بودجه خرید:</label>
                <input
                  type="number"
                  placeholder="حداکثر قیمت خرید"
                  value={filterMaxBudget}
                  onChange={e => setFilterMaxBudget(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">سقف ودیعه / رهن:</label>
                <input
                  type="number"
                  placeholder="سقف ودیعه"
                  value={filterMaxDeposit}
                  onChange={e => setFilterMaxDeposit(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">سقف اجاره ماهانه:</label>
                <input
                  type="number"
                  placeholder="سقف اجاره ماهانه"
                  value={filterMaxRent}
                  onChange={e => setFilterMaxRent(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">حداقل خواب:</label>
                <input
                  type="number"
                  placeholder="مثال: 2"
                  value={filterMinRooms}
                  onChange={e => setFilterMinRooms(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">منبع ثبت تقاضا:</label>
                <select
                  value={filterSource}
                  onChange={e => setFilterSource(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none"
                >
                  <option value="">همه منابع</option>
                  {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ثبت از تاریخ (شمسی):</label>
                <DatePicker
                  calendar={persian}
                  locale={persian_fa}
                  format="YYYY/MM/DD"
                  value={filterDateFrom}
                  onChange={(d) => setFilterDateFrom(d ? d.format() : '')}
                  inputClass="w-full bg-white border border-slate-200 rounded-lg p-2 text-center font-mono text-xs outline-none"
                  placeholder="1404/01/01"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ثبت تا تاریخ (شمسی):</label>
                <DatePicker
                  calendar={persian}
                  locale={persian_fa}
                  format="YYYY/MM/DD"
                  value={filterDateTo}
                  onChange={(d) => setFilterDateTo(d ? d.format() : '')}
                  inputClass="w-full bg-white border border-slate-200 rounded-lg p-2 text-center font-mono text-xs outline-none"
                  placeholder="1404/12/29"
                />
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  setFilterTx('');
                  setFilterType('');
                  setFilterStatus('');
                  setFilterSource('');
                  setFilterMinArea('');
                  setFilterMaxArea('');
                  setFilterMinBudget('');
                  setFilterMaxBudget('');
                  setFilterMaxDeposit('');
                  setFilterMaxRent('');
                  setFilterMinRooms('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                className="py-1.5 px-3 rounded-lg text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 transition flex items-center gap-1"
              >
                <RotateCcw size={13} />
                <span>پاکسازی فیلترها</span>
              </button>
            </div>
          </div>
        )}

        {/* Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            نمایش <strong className="text-blue-700 font-bold">{toPersianDigits(filtered.length)}</strong> تقاضا از مجموع{' '}
            <span className="font-bold text-slate-700">{toPersianDigits(requests.length)}</span> تقاضای ثبت‌شده
          </span>
          {(q || filterTx || filterType || filterStatus || filterSource || filterMinArea || filterMaxArea || filterMinBudget || filterMaxBudget || filterDateFrom || filterDateTo) && (
            <span className="text-xs text-blue-600 font-medium">فیلترهای جستجو فعال است</span>
          )}
        </div>
      </div>

      {/* New / Edit Form */}
      {showForm && (
        <Form 
          form={form} 
          customers={customers} 
          set={setFormField} 
          save={save} 
          cancel={() => {
            setEditing(null);
            setForm(empty);
            setShowForm(false);
          }}
        />
      )}

      {/* Requests Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          <ClipboardList className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="font-medium">تقاضایی با فیلترهای مشخص‌شده یافت نشد</p>
          <p className="text-sm mt-1">می‌توانید فیلترها را تغییر داده یا با دکمه «ثبت تقاضای جدید» تقاضای جدیدی ثبت کنید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(r => {
            const customer = getCustomer(r);
            const matches = getMatchesForRequest(r);
            const statusObj = STATUSES.find(s => s.value === (r.status || 'open'));
            const txObj = TX.find(x => x.value === r.transactionType || x.value === (r as any).dealType);

            return (
              <article key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-base">{r.title || 'تقاضای بدون عنوان'}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusObj?.color || 'bg-slate-100 text-slate-700'}`}>
                          {statusObj?.label || 'در جریان'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                        <User size={13} className="text-slate-400" />
                        <span className="font-bold text-slate-800">{customer?.fullName || (r as any).customerName || 'متقاضی نامشخص'}</span>
                        <Phone size={13} className="text-slate-400 mr-2" />
                        <span className="font-mono text-slate-600" dir="ltr">{customer?.phone || (r as any).customerPhone || 'بدون شماره'}</span>
                      </div>
                    </div>

                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold whitespace-nowrap">
                      {txObj?.label || 'خرید و فروش'}
                    </span>
                  </div>

                  {/* Criteria Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">نوع ملک:</span>
                      <span className="font-bold">{TYPES.find(x => x.value === r.propertyType)?.label || 'همه انواع'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">محدوده متراژ:</span>
                      <span className="font-bold">{r.minArea || '—'} تا {r.maxArea || '—'} متر</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">سقف بودجه:</span>
                      <span className="font-bold text-emerald-600">
                        {r.maxPrice ? `${Number(r.maxPrice).toLocaleString('fa-IR')} تومان` : (r.maxDeposit ? `${Number(r.maxDeposit).toLocaleString('fa-IR')} ودیعه` : 'توافقی')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">تعداد اتاق:</span>
                      <span className="font-bold">{r.minBedrooms ? `${r.minBedrooms} خواب به بالا` : 'مهم نیست'}</span>
                    </div>
                  </div>

                  {r.description && (
                    <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed bg-white p-2 rounded-lg border border-slate-100">
                      {r.description}
                    </p>
                  )}

                  {/* Candidate matching properties preview */}
                  {matches.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-purple-900">
                        <Sparkles size={14} className="text-purple-600" />
                        <span><strong>{matches.length}</strong> ملک ثبت‌شده منطبق در فایلینگ شما موجود است!</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPropertyToSend(matches[0]);
                          setMatchedModalData({
                            isOpen: true,
                            request: r,
                            customer: customer || null
                          });
                        }}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition"
                      >
                        <Bot size={13} />
                        <span>ارسال ملک به متقاضی</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div className="text-[11px] text-slate-400">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString('fa-IR') : ''}
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => edit(r)} 
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold inline-flex items-center gap-1 transition"
                    >
                      <Pencil size={13} />
                      <span>ویرایش</span>
                    </button>
                    <button 
                      onClick={() => remove(r)} 
                      className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-bold inline-flex items-center gap-1 transition"
                    >
                      <Trash2 size={13} />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal for sending property to customer via Bot */}
      {selectedPropertyToSend && (
        <SendPropertyToCustomerModal
          isOpen={matchedModalData.isOpen}
          onClose={() => {
            setMatchedModalData({ isOpen: false, request: null, customer: null });
            setSelectedPropertyToSend(null);
          }}
          property={selectedPropertyToSend}
          defaultCustomer={matchedModalData.customer}
          defaultRequest={matchedModalData.request}
        />
      )}
    </div>
  );
}

function Form({ 
  form, 
  customers, 
  set, 
  save, 
  cancel 
}: { 
  form: typeof empty; 
  customers: Customer[]; 
  set: (k: keyof typeof empty, v: string) => void; 
  save: () => void; 
  cancel: () => void; 
}) { 
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
        <h2 className="font-bold text-base text-slate-800">فرم ثبت و ویرایش تقاضای ملک</h2>
        <button onClick={cancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <label>
          <span className="block font-bold text-slate-700 mb-1">متقاضی (مشتری):</span>
          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" 
            value={form.customerId} 
            onChange={e => set('customerId', e.target.value)}
          >
            <option value="">انتخاب مشتری از لیست</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.fullName} - {c.phone}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="block font-bold text-slate-700 mb-1">نوع معامله درخواستی:</span>
          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" 
            value={form.transactionType} 
            onChange={e => set('transactionType', e.target.value)}
          >
            {TX.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </label>

        <label>
          <span className="block font-bold text-slate-700 mb-1">نوع ملک مورد نظر:</span>
          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" 
            value={form.propertyType} 
            onChange={e => set('propertyType', e.target.value)}
          >
            <option value="">همه انواع ملک</option>
            {TYPES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </label>

        <label>
          <span className="block font-bold text-slate-700 mb-1">عنوان تقاضا:</span>
          <input 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" 
            placeholder="مثال: آپارتمان ۱۰۰ متری در ولنجک"
            value={form.title} 
            onChange={e => set('title', e.target.value)}
          />
        </label>

        <label>
          <span className="block font-bold text-slate-700 mb-1">وضعیت تقاضا:</span>
          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" 
            value={form.status} 
            onChange={e => set('status', e.target.value)}
          >
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>

        <label>
          <span className="block font-bold text-slate-700 mb-1">منبع ثبت تقاضا:</span>
          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" 
            value={form.source} 
            onChange={e => set('source', e.target.value)}
          >
            {SOURCES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </label>

        <label>
          <span className="block font-bold text-slate-700 mb-1">حداقل متراژ (متر):</span>
          <input 
            type="number"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" 
            value={form.minArea} 
            onChange={e => set('minArea', e.target.value)}
          />
        </label>

        <label>
          <span className="block font-bold text-slate-700 mb-1">حداکثر متراژ (متر):</span>
          <input 
            type="number"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" 
            value={form.maxArea} 
            onChange={e => set('maxArea', e.target.value)}
          />
        </label>

        <label>
          <span className="block font-bold text-slate-700 mb-1">حداقل تعداد خواب:</span>
          <input 
            type="number"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" 
            value={form.minBedrooms} 
            onChange={e => set('minBedrooms', e.target.value)}
          />
        </label>

        <label>
          <span className="block font-bold text-slate-700 mb-1">حداکثر بودجه خرید (تومان):</span>
          <input 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" 
            value={form.maxPrice} 
            onChange={e => set('maxPrice', e.target.value)}
          />
        </label>

        <label>
          <span className="block font-bold text-slate-700 mb-1">حداکثر ودیعه (تومان):</span>
          <input 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" 
            value={form.maxDeposit} 
            onChange={e => set('maxDeposit', e.target.value)}
          />
        </label>

        <label>
          <span className="block font-bold text-slate-700 mb-1">حداکثر اجاره ماهانه (تومان):</span>
          <input 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" 
            value={form.maxRent} 
            onChange={e => set('maxRent', e.target.value)}
          />
        </label>

        <label className="sm:col-span-2 lg:col-span-3">
          <span className="block font-bold text-slate-700 mb-1">توضیحات و نیازمندی‌های مشتری:</span>
          <textarea 
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500" 
            value={form.description} 
            onChange={e => set('description', e.target.value)}
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button 
          type="button"
          onClick={cancel} 
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
        >
          انصراف
        </button>
        <button 
          type="button"
          onClick={save} 
          className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition"
        >
          ذخیره تقاضا
        </button>
      </div>
    </section>
  ); 
}
