import React, { useEffect, useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import toast from 'react-hot-toast';
import axios from 'axios';
import { 
  Save, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  Palette, 
  CreditCard, 
  MessageSquare, 
  Send, 
  FileCheck, 
  Sparkles,
  Maximize2,
  Minimize2,
  RotateCcw,
  Bot,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Users,
  Smartphone
} from 'lucide-react';
import type { Settings as SettingsType } from '../types';
import { IRANIAN_BANKS, getAgencySignature, toPersianDigits, toEnglishDigits, formatTemplateMessage } from '../utils/format';

const defaultSettings: SettingsType = {
  agencyName: 'مشاورین املاک من',
  slogan: 'بهترین انتخاب برای شما',
  phone1: '',
  phone2: '',
  fax: '',
  email: '',
  address: '',
  currency: 'تومان',
  commissionRate: 1,
  taxRate: 9,
  posIp: '192.168.1.100',
  posPort: '8888',
  posTerminalId: '',
  psp: 'سامان کیش',
  bankDetails: '',
  accountHolderName: '',
  accountNumber: '',
  cardNumber: '',
  shebaNumber: '',
  theme: 'blue',
  themeEffect: 'none',
  font: 'vazirmatn',
  invoiceLayout: 'standard',
  paperSize: 'a4',
  darkMode: false,
  autoSendInvoices: false,
  autoSendChequeReminder: false,
  autoSendRentReminder: false,
  baleToken: '',
  rubikaToken: '',
  telegramToken: '',
  telegramAgencyId: '',
  instagramAgencyId: '',
  baleAgencyId: '',
  rubikaAgencyId: '',
  additionalPhones: [],
  socialLinks: [],
  invoiceMessageBuyer: '',
  invoiceMessageSeller: '',
  invoiceMessageTenant: '',
  invoiceMessageLandlord: '',
  defaultMessages: {
    welcome: 'سلام 🌹\nبه سامانه هوشمند اطلاع‌رسانی {نام_املاک} خوش آمدید.\n\nجهت استفاده از خدمات، دریافت صورتحساب‌ها، فاکتورها و دسترسی به اطلاعات قراردادها در خدمت شما هستیم.',
    birthday: 'زادروزتان خجسته باد! با بهترین آرزوها، مشاور املاک شما.',
    contractExpiry: 'مشتری گرامی، موعد قرارداد شما به زودی به پایان می‌رسد. جهت تمدید با ما در تماس باشید.',
    rentPayment: 'مستأجر گرامی، یادآوری موعد پرداخت اجاره‌بها سررسید شده است.',
    chequeDue: 'مشتری گرامی، یادآوری موعد وصول چک شما فردا می‌باشد.',
    businessCard: 'مشاور املاک تخصصی شما. جهت دریافت آخرین فایل‌ها با ما در ارتباط باشید.'
  }
};

const Settings = () => {
  const settingsData = useLiveQuery(() => db.settings.get(1));
  const [formData, setFormData] = useState<SettingsType>(defaultSettings);
  const [initialData, setInitialData] = useState<SettingsType | null>(null);
  
  // Accordion state for collapsible settings sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    agency: true,
    branding: false,
    pos: false,
    appearance: false,
    invoiceMessages: false,
    messengers: false,
    defaultTexts: false,
  });

  // وضعیت و کنترل اختصاصی ربات تلگرام
  const [isClearingWebhook, setIsClearingWebhook] = useState(false);
  const [testChatId, setTestChatId] = useState('');
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [botInfo, setBotInfo] = useState<{ configured: boolean; bot?: any; webhook?: any; pollingActive?: boolean } | null>(null);
  const [isCheckingBot, setIsCheckingBot] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);

  const loadConnectedUsers = async () => {
    try {
      const res = await axios.get('/api/bot/connected-users');
      if (res.data?.users) {
        setConnectedUsers(res.data.users);
      }
    } catch (e) {
      console.warn('Could not load connected users:', e);
    }
  };

  const checkBotStatus = async (token?: string) => {
    const t = token || formData?.telegramToken;
    if (!t || !t.trim()) {
      setBotInfo(null);
      return;
    }
    setIsCheckingBot(true);
    try {
      const res = await axios.get(`/api/bot/status?token=${encodeURIComponent(t)}`);
      setBotInfo(res.data);
      await loadConnectedUsers();
    } catch (e) {
      setBotInfo(null);
    } finally {
      setIsCheckingBot(false);
    }
  };

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    setOpenSections({
      agency: true,
      branding: true,
      pos: true,
      appearance: true,
      invoiceMessages: true,
      messengers: true,
      defaultTexts: true,
    });
  };

  const collapseAll = () => {
    setOpenSections({
      agency: false,
      branding: false,
      pos: false,
      appearance: false,
      invoiceMessages: false,
      messengers: false,
      defaultTexts: false,
    });
  };

  useEffect(() => {
    loadConnectedUsers();
  }, []);

  useEffect(() => {
    if (settingsData) {
      const merged: SettingsType = {
        ...defaultSettings,
        ...settingsData,
        additionalPhones: settingsData.additionalPhones || [],
        defaultMessages: {
          ...defaultSettings.defaultMessages,
          ...(settingsData.defaultMessages || {})
        }
      };
      setFormData(merged);
      setInitialData(JSON.parse(JSON.stringify(merged)));

      // Sync settings with server
      axios.post('/api/bot/sync-settings', { settings: merged }).catch(() => {});
      if (merged.telegramToken) {
        checkBotStatus(merged.telegramToken);
      }
    }
  }, [settingsData]);

  // بررسی دقیق اینکه آیا تغییری در فرم تنظیمات نسبت به دیتابیس رخ داده است یا خیر
  const hasChanges = useMemo(() => {
    if (!initialData || !formData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  const handleReset = () => {
    if (initialData) {
      setFormData(JSON.parse(JSON.stringify(initialData)));
      toast.success('تغییرات لغو شد و به مقادیر قبلی بازگشت');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoBase64' | 'stampBase64') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (formData) {
          setFormData({ ...formData, [field]: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // پاکسازی وبهوک قدیمی تلگرام و قطع پیام‌های ناخواسته مانند املاک فراز
  const handleClearWebhook = async () => {
    if (!formData.telegramToken || !formData.telegramToken.trim()) {
      toast.error('لطفاً ابتدا توکن ربات تلگرام را وارد کنید');
      return;
    }
    setIsClearingWebhook(true);
    const toastId = toast.loading('در حال پاکسازی وبهوک‌های قدیمی و اتصال مستقیم...');
    try {
      // ذخیره تنظیمات جاری
      const toSave = { ...formData };
      await db.settings.put(toSave, 1);
      setInitialData(JSON.parse(JSON.stringify(toSave)));

      const res = await axios.post('/api/bot/clear-webhook', {
        token: formData.telegramToken,
        platform: 'telegram'
      });

      await axios.post('/api/bot/sync-settings', { settings: toSave });
      toast.success(res.data?.message || 'وبهوک قدیمی پاک شد! پیام‌های ربات اکنون با متن اختصاصی شما ارسال می‌شوند.', { id: toastId, duration: 5000 });
      await checkBotStatus(formData.telegramToken);
    } catch (err: any) {
      toast.error(err?.response?.data?.details || 'خطا در ارتباط با سرور تلگرام برای پاکسازی وبهوک', { id: toastId });
    } finally {
      setIsClearingWebhook(false);
    }
  };

  // ارسال آزمایشی پیام خوش‌آمدگویی تنظیم‌شده به اکانت تلگرام
  const handleSendTestMessage = async () => {
    if (!formData.telegramToken || !formData.telegramToken.trim()) {
      toast.error('لطفاً توکن ربات تلگرام را وارد کنید');
      return;
    }
    const cleanChatId = toEnglishDigits(testChatId).trim();
    if (!cleanChatId) {
      toast.error('لطفاً شناسه چت عددی (Chat ID) یا نام کاربری تلگرام را وارد فرمایید');
      return;
    }

    setIsTestingBot(true);
    const toastId = toast.loading('در حال ارسال پیام آزمایشی به تلگرام...');
    try {
      await axios.post('/api/bot/sync-settings', { settings: formData });

      const welcomeTemplate = formData.defaultMessages?.welcome || defaultSettings.defaultMessages?.welcome || '';
      const formatted = welcomeTemplate
        .replace(/{نام_املاک}/g, formData.agencyName || 'مشاور املاک')
        .replace(/{نام_مشتری}/g, 'کاربر گرامی')
        .replace(/{تلفن_املاک}/g, formData.phone1 || '')
        .replace(/{آدرس_املاک}/g, formData.address || '');

      const sig = getAgencySignature(formData);
      const finalMsg = sig ? `${formatted.trim()}\n\n${sig}` : formatted;

      const res = await axios.post('/api/send-message', {
        platform: 'telegram',
        token: formData.telegramToken,
        chatId: cleanChatId,
        message: finalMsg
      });

      toast.success(res.data?.resolvedChatId ? `پیام به شناسه ${res.data.resolvedChatId} با موفقیت ارسال شد!` : 'پیام با موفقیت به تلگرام ارسال گردید!', { id: toastId });
      loadConnectedUsers();
    } catch (err: any) {
      const details = err?.response?.data?.details || err?.response?.data?.error;
      toast.error(details || 'خطا در ارسال پیام. لطفاً دقت فرمایید کاربر باید ابتدا در ربات دکمه /start را زده باشد و شناسه عددی چت وارد شود.', { id: toastId, duration: 7000 });
    } finally {
      setIsTestingBot(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      try {
        const cleanedPhones = (formData.additionalPhones || []).filter(p => Boolean(p && p.trim()));
        const toSave: SettingsType = {
          ...formData,
          additionalPhones: cleanedPhones
        };
        await db.settings.put(toSave, 1);
        setInitialData(JSON.parse(JSON.stringify(toSave)));

        // همگام‌سازی تنظیمات با سرور و متصل نگه‌داشتن ربات
        try {
          await axios.post('/api/bot/sync-settings', { settings: toSave });
        } catch (syncErr) {
          console.warn('Backend sync warning:', syncErr);
        }

        toast.success('تنظیمات با موفقیت ذخیره شد');
        if (toSave.telegramToken) {
          checkBotStatus(toSave.telegramToken);
        }
      } catch (err) {
        toast.error('خطا در ذخیره تنظیمات');
      }
    }
  };

  if (!formData) return <div>در حال بارگذاری...</div>;

  return (
    <div className="space-y-6 animate-in fade-in pb-28">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">تنظیمات سامانه</h2>
          <p className="text-xs text-slate-500 mt-1">مدیریت اطلاعات املاک، کارتخوان، پیام‌رسان‌ها و قالب‌های چاپی</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasChanges && (
            <button
              type="button"
              onClick={handleSave}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 font-bold shadow-sm shadow-emerald-600/30 transition-all animate-pulse"
            >
              <Save size={15} />
              <span>ذخیره تغییرات</span>
            </button>
          )}
          <button
            type="button"
            onClick={expandAll}
            className="text-xs border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors font-medium shadow-sm"
          >
            <Maximize2 size={14} /> باز کردن همه
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors font-medium shadow-sm"
          >
            <Minimize2 size={14} /> بستن همه
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSave} className="space-y-4">
        
        {/* ۱. اطلاعات مشاور املاک و حساب بانکی (کشویی) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('agency')}
            className="w-full p-5 flex items-center justify-between text-right bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Building2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">اطلاعات مشاور املاک و حساب بانکی</h3>
                <p className="text-xs text-slate-500 mt-0.5">نام املاک، شماره‌های تماس، آدرس و مشخصات کارت و شبا</p>
              </div>
            </div>
            <div className="text-slate-400 p-1">
              {openSections.agency ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>

          {openSections.agency && (
            <div className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">نام مشاور املاک</label>
                  <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" value={formData.agencyName || ""} onChange={e => setFormData({...formData, agencyName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">شعار / زیرعنوان تبلیغاتی</label>
                  <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" value={formData.slogan || ""} onChange={e => setFormData({...formData, slogan: e.target.value})} />
                </div>

                {/* تلفن املاک همراه با دکمه مثبت افزودن تلفن */}
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">تلفن اصلی املاک</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="tel" 
                        dir="ltr"
                        placeholder="۰۲۱..."
                        className="flex-1 border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-right font-mono" 
                        value={formData.phone1 || ""} 
                        onChange={e => setFormData({...formData, phone1: e.target.value})} 
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = formData.additionalPhones || [];
                          setFormData({ ...formData, additionalPhones: [...current, ''] });
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-sm shadow-sm transition-all active:scale-95 px-4 whitespace-nowrap"
                        title="افزودن شماره تلفن جدید"
                      >
                        <Plus size={18} />
                        <span>افزودن تلفن</span>
                      </button>
                    </div>
                  </div>

                  {/* تلفن‌های فرعی داینامیک */}
                  {(formData.additionalPhones && formData.additionalPhones.length > 0) && (
                    <div className="space-y-2.5 pt-3 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">تلفن‌های اضافی املاک</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {formData.additionalPhones.map((phone, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                            <input
                              type="tel"
                              dir="ltr"
                              placeholder={`تلفن اضافی ${toPersianDigits(idx + 1)}`}
                              className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-right font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              value={phone}
                              onChange={(e) => {
                                const next = [...(formData.additionalPhones || [])];
                                next[idx] = e.target.value;
                                setFormData({ ...formData, additionalPhones: next });
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = (formData.additionalPhones || []).filter((_, i) => i !== idx);
                                setFormData({ ...formData, additionalPhones: next });
                              }}
                              className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="حذف این شماره"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">آدرس دفتر املاک</label>
                  <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" value={formData.address || ""} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>

                {/* بخش حساب بانکی با انتخاب لیست و امکان تایپ نوشتاری آزاد */}
                <div className="md:col-span-2 mt-3 pt-5 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-emerald-800 mb-4 flex items-center gap-2">
                    <CreditCard size={18} />
                    اطلاعات حساب بانکی (جهت درج خودکار در فاکتورها)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* فیلد نام بانک: انتخاب از لیست و نوشتاری */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>نام بانک</span>
                        <span className="text-[11px] font-normal text-emerald-700">امکان انتخاب از لیست یا تایپ دستی نام/شعبه</span>
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <input 
                            type="text" 
                            list="iranian-banks-list"
                            placeholder="نام بانک را انتخاب کرده یا تایپ کنید (مثلاً بانک ملت یا سپه شعبه مرکزی)..."
                            className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            value={formData.bankDetails || ''} 
                            onChange={e => setFormData({...formData, bankDetails: e.target.value})} 
                          />
                          <datalist id="iranian-banks-list">
                            {IRANIAN_BANKS.map(bank => (
                              <option key={bank} value={bank} />
                            ))}
                          </datalist>
                        </div>
                        <select 
                          className="border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none max-w-full sm:max-w-[180px]"
                          value={IRANIAN_BANKS.includes(formData.bankDetails || '') ? formData.bankDetails : ''}
                          onChange={e => {
                            if (e.target.value) {
                              setFormData({ ...formData, bankDetails: e.target.value });
                            }
                          }}
                        >
                          <option value="">انتخاب سریع از لیست...</option>
                          {IRANIAN_BANKS.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">نام صاحب حساب</label>
                      <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm" value={formData.accountHolderName || ''} onChange={e => setFormData({...formData, accountHolderName: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">شماره حساب</label>
                      <input type="text" dir="ltr" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-right font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm" value={formData.accountNumber || ''} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">شماره کارت (۱۶ رقمی)</label>
                      <input type="text" dir="ltr" maxLength={19} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-right font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm" value={formData.cardNumber || ''} onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        const formatted = val.replace(/(\d{4})(?=\d)/g, '$1-');
                        setFormData({...formData, cardNumber: formatted});
                      }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">شماره شبا (IR)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">IR</span>
                        <input type="text" dir="ltr" maxLength={29} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 pl-10 text-right font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm" value={formData.shebaNumber || ''} onChange={e => {
                          let val = e.target.value.replace(/[^0-9]/g, '');
                          let formatted = '';
                          for(let i=0; i<val.length; i++) {
                            if(i > 0 && i % 4 === 0) formatted += '-';
                            formatted += val[i];
                          }
                          setFormData({...formData, shebaNumber: formatted});
                        }} />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* ۲. برندینگ، لوگو، مهر و شبکه‌های اجتماعی (کشویی) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('branding')}
            className="w-full p-5 flex items-center justify-between text-right bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">برندینگ، آیدی‌ها و شبکه‌های اجتماعی</h3>
                <p className="text-xs text-slate-500 mt-0.5">لوگو، مهر املاک، آیدی‌های تلگرام، روبیکا، بله، اینستاگرام و امضای پیام‌ها</p>
              </div>
            </div>
            <div className="text-slate-400 p-1">
              {openSections.branding ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>

          {openSections.branding && (
            <div className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">لوگوی املاک</label>
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logoBase64')} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2 text-sm" />
                  {formData.logoBase64 && <img src={formData.logoBase64} alt="Logo" className="mt-2 h-16 object-contain rounded border border-slate-200 p-1 bg-white" />}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">مهر و امضای مشاور املاک (PNG شفاف)</label>
                  <input type="file" accept="image/png" onChange={e => handleImageUpload(e, 'stampBase64')} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2 text-sm" />
                  {formData.stampBase64 && <img src={formData.stampBase64} alt="Stamp" className="mt-2 h-16 object-contain rounded border border-slate-200 p-1 bg-white" />}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ایمیل دفتر املاک</label>
                  <input type="email" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left font-mono text-sm" dir="ltr" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">آیدی تلگرام املاک (جهت امضا و ارتباط)</label>
                  <input type="text" placeholder="@Amlak_Official" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left font-mono text-sm" dir="ltr" value={formData.telegramAgencyId || ''} onChange={e => setFormData({...formData, telegramAgencyId: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">آیدی اینستاگرام املاک</label>
                  <input type="text" placeholder="@Amlak_Instagram" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left font-mono text-sm" dir="ltr" value={formData.instagramAgencyId || ''} onChange={e => setFormData({...formData, instagramAgencyId: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">آیدی بله املاک</label>
                  <input type="text" placeholder="@Amlak_Bale" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left font-mono text-sm" dir="ltr" value={formData.baleAgencyId || ''} onChange={e => setFormData({...formData, baleAgencyId: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">آیدی روبیکا املاک</label>
                  <input type="text" placeholder="@Amlak_Rubika" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left font-mono text-sm" dir="ltr" value={formData.rubikaAgencyId || ''} onChange={e => setFormData({...formData, rubikaAgencyId: e.target.value})} />
                </div>
              </div>

              {/* پیش‌نمایش زنده امضای انتهای پیام‌های ارسالی */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck size={18} className="text-emerald-600" />
                  <h5 className="text-xs font-bold text-slate-700">پیش‌نمایش امضای خودکار در انتهای تمامی پیام‌های ارسالی:</h5>
                </div>
                <pre className="text-xs text-slate-600 font-sans whitespace-pre-wrap bg-white p-3.5 rounded-lg border border-slate-200 leading-relaxed shadow-inner" dir="rtl">
                  {getAgencySignature(formData) || 'اطلاعات املاک جهت درج امضا وارد نشده است.'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* ۳. تنظیمات مالی، نرخ‌ها و دستگاه POS (کشویی) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('pos')}
            className="w-full p-5 flex items-center justify-between text-right bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <CreditCard size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">تنظیمات مالی و دستگاه کارتخوان (POS)</h3>
                <p className="text-xs text-slate-500 mt-0.5">واحد پول، مالیات ارزش افزوده، اتصال شبکه کارتخوان و PSP</p>
              </div>
            </div>
            <div className="text-slate-400 p-1">
              {openSections.pos ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>

          {openSections.pos && (
            <div className="p-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">واحد پول سامانه</label>
                  <select className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm" value={formData.currency || 'تومان'} onChange={e => setFormData({...formData, currency: e.target.value as any})}>
                    <option value="تومان">تومان</option>
                    <option value="ریال">ریال</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">درصد کمیسیون پیش‌فرض (%)</label>
                  <input type="number" step="0.1" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono text-sm" value={formData.commissionRate || 1} onChange={e => setFormData({...formData, commissionRate: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">درصد مالیات ارزش افزوده (%)</label>
                  <input type="number" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono text-sm" value={formData.taxRate || 0} onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">آی‌پی کارتخوان (POS IP)</label>
                  <input type="text" dir="ltr" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-right focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono text-sm" value={formData.posIp || ""} onChange={e => setFormData({...formData, posIp: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">پورت کارتخوان (POS Port)</label>
                  <input type="text" dir="ltr" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-right focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono text-sm" value={formData.posPort || ""} onChange={e => setFormData({...formData, posPort: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">شرکت ارائه‌دهنده پرداخت (PSP)</label>
                  <select className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm" value={formData.psp || 'سامان کیش'} onChange={e => setFormData({...formData, psp: e.target.value})}>
                    <option value="سامان کیش">سامان کیش (SEP)</option>
                    <option value="به‌پرداخت ملت">به‌پرداخت ملت</option>
                    <option value="پاسارگاد">پرداخت الکترونیک پاسارگاد</option>
                    <option value="آپ">آسان پرداخت (آپ)</option>
                    <option value="ایران کیش">ایران کیش</option>
                    <option value="سداد">پرداخت الکترونیک سداد</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ۴. ظاهر، تم و قالب فاکتور (کشویی) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('appearance')}
            className="w-full p-5 flex items-center justify-between text-right bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Palette size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">تنظیمات ظاهر، تم و قالب فاکتور</h3>
                <p className="text-xs text-slate-500 mt-0.5">رنگ‌بندی، حالت شب، فونت، ساختار چیدمان و قطع چاپ فاکتور</p>
              </div>
            </div>
            <div className="text-slate-400 p-1">
              {openSections.appearance ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>

          {openSections.appearance && (
            <div className="p-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">تم رنگی نرم‌افزار</label>
                  <select className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm" value={formData.theme || 'blue'} onChange={e => setFormData({...formData, theme: e.target.value})}>
                    <option value="blue">آبی کلاسیک</option>
                    <option value="emerald">سبز زمردی</option>
                    <option value="purple">بنفش رویایی</option>
                    <option value="amber">کهربایی</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">افکت تم</label>
                  <select className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm" value={formData.themeEffect || 'none'} onChange={e => setFormData({...formData, themeEffect: e.target.value})}>
                    <option value="none">بدون افکت</option>
                    <option value="glass">شیشه‌ای (Glassmorphism)</option>
                    <option value="gradient">گرادیانت</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">فونت نرم‌افزار</label>
                  <select className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm" value={formData.font || 'vazirmatn'} onChange={e => setFormData({...formData, font: e.target.value})}>
                    <option value="vazirmatn">وزیرمتن (استاندارد)</option>
                    <option value="iransans">ایران سنس</option>
                    <option value="yekanbakh">یکان بخ</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={Boolean(formData.darkMode)} onChange={e => setFormData({...formData, darkMode: e.target.checked})} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    <span className="mr-3 text-sm font-bold text-slate-600">حالت تاریک (Dark)</span>
                  </label>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ساختار فاکتور (چیدمان)</label>
                  <select className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm" value={formData.invoiceLayout || 'standard'} onChange={e => setFormData({...formData, invoiceLayout: e.target.value as any})}>
                    <option value="standard">استاندارد (لوگو بالا سمت راست، اطلاعات وسط)</option>
                    <option value="modern">مدرن (سربرگ رنگی، مهر پایین وسط)</option>
                    <option value="compact">فشرده (صرفه‌جویی در کاغذ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">سایز چاپ (ابعاد کاغذ)</label>
                  <select className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm" value={formData.paperSize || 'a4'} onChange={e => setFormData({...formData, paperSize: e.target.value as any})}>
                    <option value="a4">A4 (استاندارد)</option>
                    <option value="a5">A5 (کوچک)</option>
                    <option value="80mm">رسید ۸۰ میلیمتری (چاپگر حرارتی)</option>
                    <option value="57mm">رسید ۵۷ میلیمتری (کارتخوان)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ۵. پیام‌های اختصاصی فاکتور (کشویی) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('invoiceMessages')}
            className="w-full p-5 flex items-center justify-between text-right bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                <FileCheck size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">پیام‌های اختصاصی فاکتور</h3>
                <p className="text-xs text-slate-500 mt-0.5">توضیحات و پیام‌های درج شونده در فاکتور برای خریدار، فروشنده، موجر و مستأجر</p>
              </div>
            </div>
            <div className="text-slate-400 p-1">
              {openSections.invoiceMessages ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>

          {openSections.invoiceMessages && (
            <div className="p-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">پیام اختصاصی برای خریدار</label>
                  <textarea className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500 outline-none" rows={2} value={formData.invoiceMessageBuyer || ''} onChange={e => setFormData({...formData, invoiceMessageBuyer: e.target.value})} placeholder="تبریک بابت خرید ملک و آرزوی برکت..."></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">پیام اختصاصی برای فروشنده</label>
                  <textarea className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500 outline-none" rows={2} value={formData.invoiceMessageSeller || ''} onChange={e => setFormData({...formData, invoiceMessageSeller: e.target.value})} placeholder="با سپاس از حسن اعتماد شما در واگذاری ملک..."></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">پیام اختصاصی برای مستأجر</label>
                  <textarea className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500 outline-none" rows={2} value={formData.invoiceMessageTenant || ''} onChange={e => setFormData({...formData, invoiceMessageTenant: e.target.value})} placeholder="آرزوی روزهای خوش و پربرکت در اقامتگاه جدید..."></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">پیام اختصاصی برای موجر</label>
                  <textarea className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500 outline-none" rows={2} value={formData.invoiceMessageLandlord || ''} onChange={e => setFormData({...formData, invoiceMessageLandlord: e.target.value})} placeholder="با تشکر از همکاری شایسته در تنظیم قرارداد اجاره..."></textarea>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ۶. پیام‌رسان‌ها و ارسال خودکار (کشویی) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('messengers')}
            className="w-full p-5 flex items-center justify-between text-right bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <Send size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">پیام‌رسان‌ها و اتوماسیون هوشمند</h3>
                <p className="text-xs text-slate-500 mt-0.5">توکن ربات‌های تلگرام، بله، روبیکا و ارسال خودکار فاکتور و یادآوری چک</p>
              </div>
            </div>
            <div className="text-slate-400 p-1">
              {openSections.messengers ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>

          {openSections.messengers && (
            <div className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">توکن ربات تلگرام (Telegram Bot API)</label>
                  <input type="password" placeholder="123456:ABC-DEF1234ghIkl" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500 outline-none transition-all text-left font-mono text-xs" dir="ltr" value={formData.telegramToken || ''} onChange={e => setFormData({...formData, telegramToken: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">توکن ربات بله (Bale Bot API)</label>
                  <input type="password" placeholder="123456:ABC-DEF1234ghIkl" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500 outline-none transition-all text-left font-mono text-xs" dir="ltr" value={formData.baleToken || ''} onChange={e => setFormData({...formData, baleToken: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">توکن ربات روبیکا (Rubika Bot API)</label>
                  <input type="password" placeholder="Rubika Token" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500 outline-none transition-all text-left font-mono text-xs" dir="ltr" value={formData.rubikaToken || ''} onChange={e => setFormData({...formData, rubikaToken: e.target.value})} />
                </div>
              </div>

              {/* جعبه اختصاصی مدیریت و رفع مشکل پیام‌های ناخواسته ربات تلگرام (نظیر پیام املاک فراز) */}
              <div className="bg-gradient-to-br from-teal-50/70 to-slate-50 border border-teal-200/80 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-teal-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
                      <Bot size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span>مدیریت اتصال و پاکسازی وبهوک ربات تلگرام</span>
                        <span className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded-full">
                          رفع پیام‌های متفرقه (املاک فراز)
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        جلوگیری از ارسال پیام‌های متفرقه قدیمی و تضمین ارسال دقیق متون تنظیم‌شده توسط شما
                      </p>
                    </div>
                  </div>

                  {formData.telegramToken && (
                    <button
                      type="button"
                      onClick={() => checkBotStatus(formData.telegramToken)}
                      disabled={isCheckingBot}
                      className="text-xs text-teal-700 hover:text-teal-900 bg-teal-100/70 hover:bg-teal-200/80 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <RefreshCw size={14} className={isCheckingBot ? 'animate-spin' : ''} />
                      <span>بررسی وضعیت ربات</span>
                    </button>
                  )}
                </div>

                {botInfo?.configured && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/80 border border-teal-100 rounded-xl p-3 flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-slate-500 block">نام ربات متصل:</span>
                        <span className="font-bold text-slate-800">{botInfo.bot?.first_name} (@{botInfo.bot?.username})</span>
                      </div>
                    </div>
                    <div className="bg-white/80 border border-teal-100 rounded-xl p-3 flex items-center gap-2.5">
                      {botInfo.webhook?.url ? (
                        <>
                          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                          <div>
                            <span className="text-slate-500 block">وبهوک متصل خارجی:</span>
                            <span className="font-mono text-amber-700 break-all">{botInfo.webhook.url}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-slate-500 block">وضعیت وبهوک:</span>
                            <span className="font-bold text-emerald-700">مستقیم و پاکسازی شده (بدون ارسال پیام متفرقه)</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pt-1">
                  <div className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                    <strong className="text-slate-800 block mb-1">چرا پیام «املاک فراز» ارسال می‌شد؟</strong>
                    اگر توکن ربات تلگرام قبلاً روی سرور یا سورس دیگری تعریف شده باشد، تلگرام پیام‌ها را به آدرس وبهوک قبلی می‌فرستد. با کلیک بر روی دکمه زیر، آدرس وبهوک قبلی فوراً پاک شده و ربات مستقیماً با متن‌های اختصاصی همین پنل پاسخ می‌دهد.
                  </div>

                  <button
                    type="button"
                    onClick={handleClearWebhook}
                    disabled={isClearingWebhook || !formData.telegramToken}
                    className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={15} className={isClearingWebhook ? 'animate-spin' : ''} />
                    <span>{isClearingWebhook ? 'در حال پاکسازی...' : 'پاکسازی وبهوک قبلی و فعال‌سازی مستقیم'}</span>
                  </button>
                </div>

                {/* بخش ارسال پیام آزمایشی به چت یا کاربر تلگرام */}
                <div className="pt-3 border-t border-teal-100/80 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">ارسال تست پیام به اکانت یا گروه تلگرام:</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="شناسه چت عددی (مانند: 123456789) یا آیدی تلگرام"
                        value={testChatId}
                        onChange={e => setTestChatId(e.target.value)}
                        className="flex-1 border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-mono text-left outline-none focus:ring-2 focus:ring-teal-500"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={handleSendTestMessage}
                        disabled={isTestingBot || !formData.telegramToken || !testChatId}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Send size={14} className={isTestingBot ? 'animate-spin' : ''} />
                        <span>{isTestingBot ? 'در حال ارسال تست...' : 'ارسال آزمایشی پیام خوش‌آمدگویی'}</span>
                      </button>
                    </div>
                  </div>

                  {/* لیست کاربران اخیراً متصل‌شده به ربات */}
                  {connectedUsers.length > 0 && (
                    <div className="bg-white/90 border border-teal-200/70 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5 text-teal-800">
                          <Users size={14} />
                          کاربران فعال متصل به ربات ({toPersianDigits(connectedUsers.length)} نفر):
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal">جهت انتخاب شناسه، روی کاربر کلیک کنید</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {connectedUsers.map((u, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setTestChatId(u.chatId)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                              testChatId === u.chatId
                                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50'
                            }`}
                          >
                            <span className="font-semibold">{u.fullName || u.firstName || 'کاربر'}</span>
                            <span className="text-[10px] opacity-75 font-mono">
                              {u.platform === 'telegram' ? 'تلگرام' : 'بله'}
                            </span>
                            {u.username && <span className="text-[10px] opacity-75 font-mono">(@{u.username})</span>}
                            {u.phone && <span className="text-[10px] opacity-75 font-mono">({u.phone})</span>}
                            <span className="font-mono text-[10px] bg-black/10 px-1.5 py-0.5 rounded">ID: {u.chatId}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-600 bg-teal-50/60 p-3 rounded-xl border border-teal-100 space-y-1">
                    <p className="leading-relaxed">
                      💡 <strong className="text-teal-950">نکته بسیار مهم جهت رفع خطای 400 (Bad Request):</strong> ربات‌های تلگرام به دلیل قوانین امنیتی تنها به <strong>شناسه عددی (Chat ID)</strong> امکان ارسال دارند و شماره تلفن را نمی‌پذیرند. برای اتصال، کاربر کافیست وارد ربات <span className="font-mono font-bold text-teal-800" dir="ltr">@{botInfo?.bot?.username || 'Amlake_Faraz_bot'}</span> شده و دکمه <span className="font-mono bg-white border border-teal-200 px-1.5 py-0.5 rounded text-teal-900">/start</span> را بزند. شناسه عددی او بلافاصله در پیام خوش‌آمدگویی و در لیست کاربران متصل بالا اضافه می‌شود.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row flex-wrap gap-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={Boolean(formData.autoSendInvoices)} onChange={e => setFormData({...formData, autoSendInvoices: e.target.checked})} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  <span className="mr-3 text-sm font-bold text-slate-700">ارسال خودکار فاکتور پس از ثبت قرارداد</span>
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={Boolean(formData.autoSendChequeReminder)} onChange={e => setFormData({...formData, autoSendChequeReminder: e.target.checked})} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  <span className="mr-3 text-sm font-bold text-slate-700">ارسال خودکار یادآوری موعد چک (۱ روز قبل)</span>
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={Boolean(formData.autoSendRentReminder)} onChange={e => setFormData({...formData, autoSendRentReminder: e.target.checked})} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  <span className="mr-3 text-sm font-bold text-slate-700">ارسال خودکار یادآوری موعد پرداخت اجاره‌بها</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ۷. متون پیام‌های پیش‌فرض (کشویی) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('defaultTexts')}
            className="w-full p-5 flex items-center justify-between text-right bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <MessageSquare size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">متون پیش‌فرض پیام‌ها و یادآوری‌ها</h3>
                <p className="text-xs text-slate-500 mt-0.5">قالب پیام خوش‌آمدگویی ربات، تبریک تولد، سررسید چک، موعد اجاره و کارت ویزیت</p>
              </div>
            </div>
            <div className="text-slate-400 p-1">
              {openSections.defaultTexts ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>

          {openSections.defaultTexts && (
            <div className="p-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
              {/* پیام خوش‌آمدگویی و استارت ربات تلگرام */}
              <div className="bg-indigo-50/60 border-2 border-indigo-200/80 rounded-2xl p-4.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-extrabold text-indigo-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                    <span>پیام خوش‌آمدگویی و استارت ربات تلگرام و پیام‌رسان‌ها (پاسخ به /start یا اولین ارتباط)</span>
                  </label>
                  <span className="text-[11px] bg-indigo-200/70 text-indigo-900 font-bold px-2.5 py-0.5 rounded-full self-start">
                    جایگزین قطعی پیام‌های املاک فراز
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  این پیام دقیقا همان متنی است که کاربر با استارت ربات یا ارسال اولین پیام دریافت می‌نماید. می‌توانید از کدهای جانشین <span className="font-mono bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded text-[11px]">{'{نام_املاک}'}</span> و <span className="font-mono bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded text-[11px]">{'{نام_مشتری}'}</span> استفاده کنید.
                </p>
                <textarea
                  className="w-full border border-indigo-200 rounded-xl p-3 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  rows={3}
                  value={formData.defaultMessages?.welcome || ''}
                  onChange={e => setFormData({
                    ...formData,
                    defaultMessages: {
                      ...formData.defaultMessages!,
                      welcome: e.target.value
                    }
                  })}
                  placeholder="سلام 🌹 به سامانه هوشمند اطلاع‌رسانی {نام_املاک} خوش آمدید..."
                />

                {/* پیش‌نمایش زنده پیام */}
                <div className="bg-white/90 border border-indigo-100 rounded-xl p-3.5 text-xs space-y-1.5">
                  <div className="font-bold text-slate-500 text-[11px] flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-600" />
                    <span>پیش‌نمایش پیام ارسال شونده با مشخصات و امضای املاک شما:</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-3 font-sans text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {(() => {
                      const template = formData.defaultMessages?.welcome || defaultSettings.defaultMessages?.welcome || '';
                      const formatted = template
                        .replace(/{نام_املاک}/g, formData.agencyName || 'مشاور املاک شما')
                        .replace(/{نام_مشتری}/g, 'علی رضایی')
                        .replace(/{تلفن_املاک}/g, formData.phone1 || '۰۲۱-۱۲۳۴۵۶۷۸')
                        .replace(/{آدرس_املاک}/g, formData.address || 'تهران');
                      const sig = getAgencySignature(formData);
                      return sig ? `${formatted.trim()}\n\n${sig}` : formatted;
                    })()}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">پیام تبریک تولد مشتری</label>
                  <textarea className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500" rows={2} value={formData.defaultMessages?.birthday || ''} onChange={e => setFormData({...formData, defaultMessages: {...formData.defaultMessages!, birthday: e.target.value}})}></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">پیام موعد وصول / سررسید چک</label>
                  <textarea className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500" rows={2} value={formData.defaultMessages?.chequeDue || ''} onChange={e => setFormData({...formData, defaultMessages: {...formData.defaultMessages!, chequeDue: e.target.value}})}></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">پیام موعد پرداخت اجاره‌بها</label>
                  <textarea className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500" rows={2} value={formData.defaultMessages?.rentPayment || ''} onChange={e => setFormData({...formData, defaultMessages: {...formData.defaultMessages!, rentPayment: e.target.value}})}></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">اتمام قرارداد و یادآوری تمدید</label>
                  <textarea className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500" rows={2} value={formData.defaultMessages?.contractExpiry || ''} onChange={e => setFormData({...formData, defaultMessages: {...formData.defaultMessages!, contractExpiry: e.target.value}})}></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">کارت ویزیت دیجیتال مشاور املاک</label>
                  <textarea className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500" rows={2} value={formData.defaultMessages?.businessCard || ''} onChange={e => setFormData({...formData, defaultMessages: {...formData.defaultMessages!, businessCard: e.target.value}})}></textarea>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* دکمه شناور ذخیره تنظیمات - تنها در صورت ایجاد تغییرات نمایش داده می‌شود */}
        {hasChanges && (
          <div className="fixed bottom-20 md:bottom-8 left-4 md:left-8 z-30 animate-in slide-in-from-bottom-5 duration-200">
            <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 md:px-5 md:py-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span>تغییراتی در تنظیمات ایجاد شده است</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">جهت اعمال نهایی، روی ذخیره تنظیمات کلیک کنید</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-300 hover:text-white px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={14} />
                  <span>انصراف</span>
                </button>
                <button 
                  type="submit" 
                  className="px-5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 flex justify-center items-center gap-2 transition-all active:scale-95 text-sm cursor-pointer"
                >
                  <Save size={18} />
                  <span>ذخیره تنظیمات</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default Settings;

