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
  Smartphone,
  ExternalLink,
  Printer
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

  // وضعیت و کنترل اختصاصی ربات تلگرام، بله و روبیکا
  const [isClearingWebhook, setIsClearingWebhook] = useState(false);
  const [testPlatform, setTestPlatform] = useState<'telegram' | 'bale' | 'rubika'>('bale');
  const [testChatId, setTestChatId] = useState('');
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [botInfo, setBotInfo] = useState<{ configured: boolean; bot?: any; webhook?: any; pollingActive?: boolean } | null>(null);
  const [baleBotInfo, setBaleBotInfo] = useState<{ configured: boolean; bot?: any; pollingActive?: boolean } | null>(null);
  const [rubikaBotInfo, setRubikaBotInfo] = useState<{ configured: boolean; bot?: any; pollingActive?: boolean } | null>(null);
  const [isCheckingBot, setIsCheckingBot] = useState(false);
  const [isCheckingBaleBot, setIsCheckingBaleBot] = useState(false);
  const [isCheckingRubikaBot, setIsCheckingRubikaBot] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);

  const loadConnectedUsers = async () => {
    try {
      const res = await axios.get('/api/bot/connected-users');
      if (res.data?.users && res.data.users.length > 0) {
        setConnectedUsers(res.data.users);
        setTestChatId(prev => prev || res.data.users[0].chatId);
        setTestPlatform(prev => (prev === 'bale' || prev === 'rubika' || prev === 'telegram') ? prev : (res.data.users[0].platform || 'bale'));
      }
    } catch (e) {
      console.log('Notice: could not load connected users');
    }
  };

  const checkTelegramBotStatus = async (token?: string) => {
    const t = token || formData?.telegramToken;
    if (!t || !t.trim()) {
      setBotInfo(null);
      return;
    }
    setIsCheckingBot(true);
    try {
      const res = await axios.get(`/api/bot/status?platform=telegram&token=${encodeURIComponent(t)}`);
      setBotInfo(res.data);
      await loadConnectedUsers();
    } catch (e) {
      setBotInfo(null);
    } finally {
      setIsCheckingBot(false);
    }
  };

  const checkBaleBotStatus = async (token?: string) => {
    const t = token || formData?.baleToken;
    if (!t || !t.trim()) {
      setBaleBotInfo(null);
      return;
    }
    setIsCheckingBaleBot(true);
    try {
      const res = await axios.get(`/api/bot/status?platform=bale&token=${encodeURIComponent(t)}`);
      setBaleBotInfo(res.data);
      await loadConnectedUsers();
    } catch (e) {
      setBaleBotInfo(null);
    } finally {
      setIsCheckingBaleBot(false);
    }
  };

  const checkRubikaBotStatus = async (token?: string) => {
    const t = token || formData?.rubikaToken;
    if (!t || !t.trim()) {
      setRubikaBotInfo(null);
      return;
    }
    setIsCheckingRubikaBot(true);
    try {
      const res = await axios.get(`/api/bot/status?platform=rubika&token=${encodeURIComponent(t)}`);
      setRubikaBotInfo(res.data);
      await loadConnectedUsers();
    } catch (e) {
      setRubikaBotInfo(null);
    } finally {
      setIsCheckingRubikaBot(false);
    }
  };

  const checkBotStatus = async () => {
    await Promise.all([
      checkTelegramBotStatus(),
      checkBaleBotStatus(),
      checkRubikaBotStatus()
    ]);
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
        checkTelegramBotStatus(merged.telegramToken);
      }
      if (merged.baleToken) {
        checkBaleBotStatus(merged.baleToken);
      }
      if (merged.rubikaToken) {
        checkRubikaBotStatus(merged.rubikaToken);
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

      if (res.data?.success === false) {
        toast.error(res.data?.details || res.data?.error || 'خطا در پاکسازی وبهوک تلگرام', { id: toastId });
        return;
      }

      await axios.post('/api/bot/sync-settings', { settings: toSave });
      toast.success(res.data?.message || 'وبهوک قدیمی پاک شد! پیام‌های ربات اکنون با متن اختصاصی شما ارسال می‌شوند.', { id: toastId, duration: 5000 });
      await checkTelegramBotStatus(formData.telegramToken);
    } catch (err: any) {
      toast.error(err?.response?.data?.details || err?.response?.data?.error || 'خطا در ارتباط با سرور تلگرام برای پاکسازی وبهوک', { id: toastId });
    } finally {
      setIsClearingWebhook(false);
    }
  };

  // ارسال آزمایشی پیام خوش‌آمدگویی تنظیم‌شده به اکانت تلگرام، بله یا روبیکا
  const handleSendTestMessage = async () => {
    const currentToken = testPlatform === 'telegram' ? formData.telegramToken : testPlatform === 'rubika' ? formData.rubikaToken : formData.baleToken;
    const platformLabel = testPlatform === 'telegram' ? 'تلگرام' : testPlatform === 'rubika' ? 'روبیکا' : 'بله';
    if (!currentToken || !currentToken.trim()) {
      toast.error(`لطفاً ابتدا توکن ربات ${platformLabel} را در کادر بالا وارد فرمایید.`);
      return;
    }
    const cleanChatId = toEnglishDigits(testChatId).trim();
    if (!cleanChatId) {
      toast.error(`لطفاً شناسه چت یا نام کاربری ${platformLabel} را وارد فرمایید.`);
      return;
    }

    setIsTestingBot(true);
    const toastId = toast.loading(`در حال ارسال پیام آزمایشی به ${platformLabel}...`);
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
        platform: testPlatform,
        token: currentToken,
        chatId: cleanChatId,
        message: finalMsg
      });

      if (res.data?.success) {
        const destPlatform = res.data?.actualPlatform === 'bale' ? 'بله' : res.data?.actualPlatform === 'rubika' ? 'روبیکا' : 'تلگرام';
        toast.success(`پیام با موفقیت به ${destPlatform} (شناسه: ${res.data?.resolvedChatId || cleanChatId}) ارسال گردید!`, { id: toastId });
        await loadConnectedUsers();
      } else {
        toast.error(res.data?.details || res.data?.error || 'خطا در ارسال پیام. مخاطب باید ابتدا در ربات استارت زده باشد.', { id: toastId, duration: 7000 });
      }
    } catch (err: any) {
      const details = err?.response?.data?.details || err?.response?.data?.error || err.message;
      toast.error(details || 'خطا در برقراری ارتباط با سرور', { id: toastId, duration: 7000 });
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
        } catch (syncErr: any) {
          console.log('Notice: backend sync completed');
        }

        toast.success('تنظیمات با موفقیت ذخیره شد');
        if (toSave.telegramToken) {
          checkTelegramBotStatus(toSave.telegramToken);
        }
        if (toSave.baleToken) {
          checkBaleBotStatus(toSave.baleToken);
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
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">کد اقتصادی</label>
                  <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono text-right" placeholder="مثال: ۴۱۱۱۱۱۱۱۱۱۱۱" value={formData.economicCode || ""} onChange={e => setFormData({...formData, economicCode: toEnglishDigits(e.target.value).replace(/\D/g, '')})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">شناسه ملی / کد ملی</label>
                  <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono text-right" placeholder="مثال: ۰۱۲۳۴۵۶۷۸۹" value={formData.nationalId || ""} onChange={e => setFormData({...formData, nationalId: toEnglishDigits(e.target.value).replace(/\D/g, '')})} />
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
                      <input type="text" dir="ltr" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-right font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm" value={formData.accountNumber || ''} onChange={e => setFormData({...formData, accountNumber: toEnglishDigits(e.target.value).replace(/\D/g, '')})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">شماره کارت (۱۶ رقمی)</label>
                      <input type="text" dir="ltr" maxLength={19} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-right font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm" value={formData.cardNumber || ''} onChange={e => {
                        const val = toEnglishDigits(e.target.value).replace(/\D/g, '');
                        const formatted = val.replace(/(\d{4})(?=\d)/g, '$1-');
                        setFormData({...formData, cardNumber: formatted});
                      }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">شماره شبا (IR)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">IR</span>
                        <input type="text" dir="ltr" maxLength={29} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 pl-10 text-right font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm" value={formData.shebaNumber || ''} onChange={e => {
                          let val = toEnglishDigits(e.target.value).replace(/[^0-9]/g, '');
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

        {/* تنظیمات چاپ فاکتور */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('printOptions')}
            className="w-full p-5 flex items-center justify-between text-right bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer border-b border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Printer size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">تنظیمات اطلاعات روی فاکتور</h3>
                <p className="text-xs text-slate-500 mt-0.5">انتخاب مواردی که تمایل دارید هنگام چاپ فاکتور نمایش داده شوند</p>
              </div>
            </div>
            <div className="text-slate-400 p-1">
              {openSections.printOptions ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>
          
          {openSections.printOptions && (
            <div className="p-6 animate-in fade-in slide-in-from-top-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'showLogo', label: 'نمایش لوگو / مهر' },
                  { id: 'showAddress', label: 'نمایش آدرس املاک' },
                  { id: 'showPhones', label: 'نمایش شماره‌های تماس املاک' },
                  { id: 'showBank', label: 'نمایش اطلاعات حساب بانکی' },
                  { id: 'showNationalId', label: 'نمایش شناسه ملی / کد ملی' },
                  { id: 'showEconomicCode', label: 'نمایش کد اقتصادی' }
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-3 p-4 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={formData.printOptions?.[item.id as keyof typeof formData.printOptions] !== false}
                        onChange={(e) => {
                          setFormData({
                            ...formData, 
                            printOptions: {
                              ...formData.printOptions,
                              [item.id]: e.target.checked
                            }
                          });
                        }}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 select-none">{item.label}</span>
                  </label>
                ))}
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

              {/* کارت‌های وضعیت ربات‌های بله، تلگرام و روبیکا */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* کارت ربات بله */}
                <div className="bg-gradient-to-br from-emerald-50/70 to-slate-50 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-emerald-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        بله
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm">ربات پیام‌رسان بله</h4>
                        <span className="text-[11px] text-slate-500 font-mono">@amlake_faraz_bot</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => checkBaleBotStatus(formData.baleToken)}
                        disabled={isCheckingBaleBot || !formData.baleToken}
                        className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                        title="بررسی اتصال بله"
                      >
                        <RefreshCw size={14} className={isCheckingBaleBot ? 'animate-spin' : ''} />
                      </button>
                      <a
                        href="https://ble.ir/amlake_faraz_bot"
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm shadow-emerald-600/20"
                      >
                        <span>ورود به ربات</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5">
                      <span className="text-slate-500 block text-[10px]">وضعیت توکن و اتصال:</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        {formData.baleToken ? 'فعال و ثبت شده' : 'ثبت نشده'}
                      </span>
                    </div>
                    <div className="bg-white/80 border border-emerald-100 rounded-xl p-2.5">
                      <span className="text-slate-500 block text-[10px]">کاربران متصل بله:</span>
                      <span className="font-bold text-slate-800 mt-0.5 block font-mono">
                        {toPersianDigits(connectedUsers.filter(u => u.platform === 'bale').length)} کاربر
                      </span>
                    </div>
                  </div>
                </div>

                {/* کارت ربات تلگرام */}
                <div className="bg-gradient-to-br from-sky-50/70 to-slate-50 border border-sky-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-sky-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        <Bot size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm">ربات پیام‌رسان تلگرام</h4>
                        <span className="text-[11px] text-slate-500 font-mono">@{botInfo?.bot?.username || 'Amlake_Faraz_bot'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => checkTelegramBotStatus(formData.telegramToken)}
                        disabled={isCheckingBot || !formData.telegramToken}
                        className="p-1.5 text-sky-700 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                        title="بررسی اتصال تلگرام"
                      >
                        <RefreshCw size={14} className={isCheckingBot ? 'animate-spin' : ''} />
                      </button>
                      <button
                        type="button"
                        onClick={handleClearWebhook}
                        disabled={isClearingWebhook || !formData.telegramToken}
                        className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-800 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                        title="پاکسازی وبهوک قبلی"
                      >
                        <span>{isClearingWebhook ? '...' : 'پاکسازی وبهوک'}</span>
                      </button>
                      <a
                        href={`https://t.me/${botInfo?.bot?.username || 'Amlake_Faraz_bot'}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm shadow-sky-600/20"
                      >
                        <span>ورود به ربات</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 border border-sky-100 rounded-xl p-2.5">
                      <span className="text-slate-500 block text-[10px]">وضعیت وبهوک تلگرام:</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                        <ShieldCheck size={13} className="text-emerald-600" />
                        مستقیم و اختصاصی
                      </span>
                    </div>
                    <div className="bg-white/80 border border-sky-100 rounded-xl p-2.5">
                      <span className="text-slate-500 block text-[10px]">کاربران متصل تلگرام:</span>
                      <span className="font-bold text-slate-800 mt-0.5 block font-mono">
                        {toPersianDigits(connectedUsers.filter(u => u.platform === 'telegram').length)} کاربر
                      </span>
                    </div>
                  </div>
                </div>

                {/* کارت ربات روبیکا */}
                <div className="bg-gradient-to-br from-purple-50/70 to-slate-50 border border-purple-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-purple-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        روبیکا
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm">ربات پیام‌رسان روبیکا</h4>
                        <span className="text-[11px] text-slate-500 font-mono">@{rubikaBotInfo?.bot?.username || 'Amlake_Faraz_bot'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => checkRubikaBotStatus(formData.rubikaToken)}
                        disabled={isCheckingRubikaBot || !formData.rubikaToken}
                        className="p-1.5 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                        title="بررسی اتصال روبیکا"
                      >
                        <RefreshCw size={14} className={isCheckingRubikaBot ? 'animate-spin' : ''} />
                      </button>
                      <a
                        href={`https://rubika.ir/${rubikaBotInfo?.bot?.username || 'Amlake_Faraz_bot'}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm shadow-purple-600/20"
                      >
                        <span>ورود به ربات</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 border border-purple-100 rounded-xl p-2.5">
                      <span className="text-slate-500 block text-[10px]">وضعیت توکن و اتصال:</span>
                      <span className="font-bold text-purple-700 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={13} className="text-purple-600" />
                        {formData.rubikaToken ? 'فعال و ثبت شده' : 'ثبت نشده'}
                      </span>
                    </div>
                    <div className="bg-white/80 border border-purple-100 rounded-xl p-2.5">
                      <span className="text-slate-500 block text-[10px]">کاربران متصل روبیکا:</span>
                      <span className="font-bold text-slate-800 mt-0.5 block font-mono">
                        {toPersianDigits(connectedUsers.filter(u => u.platform === 'rubika').length)} کاربر
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* بخش ارسال پیام آزمایشی با انتخاب پلتفرم */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">ارسال تست پیام و بررسی مخاطب</h4>
                    <p className="text-xs text-slate-500 mt-0.5">ارسال آنی پیام خوش‌آمدگویی یا تست فاکتور به مخاطب با شناسه چت یا شماره همراه</p>
                  </div>

                  {/* تب انتخاب پلتفرم تست */}
                  <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setTestPlatform('bale')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        testPlatform === 'bale'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                      <span>پیام‌رسان بله</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestPlatform('telegram')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        testPlatform === 'telegram'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-300"></span>
                      <span>پیام‌رسان تلگرام</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestPlatform('rubika')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        testPlatform === 'rubika'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-300"></span>
                      <span>پیام‌رسان روبیکا</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder={
                        testPlatform === 'bale'
                          ? 'شناسه چت بله (مانند 1207786693) یا شماره همراه کاربر متصل'
                          : testPlatform === 'rubika'
                            ? 'شناسه چت روبیکا (مانند b0DHuP... یا u0...) یا شماره همراه متصل'
                            : 'شناسه چت تلگرام (مانند 123456789) یا @username متصل'
                      }
                      value={testChatId}
                      onChange={e => setTestChatId(e.target.value)}
                      className="flex-1 border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-xs font-mono text-left outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestMessage}
                      disabled={isTestingBot || !testChatId || !(testPlatform === 'telegram' ? formData.telegramToken : testPlatform === 'rubika' ? formData.rubikaToken : formData.baleToken)}
                      className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                        testPlatform === 'bale'
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                          : testPlatform === 'rubika'
                            ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                            : 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'
                      }`}
                    >
                      <Send size={15} className={isTestingBot ? 'animate-spin' : ''} />
                      <span>{isTestingBot ? 'در حال ارسال تست...' : `ارسال تست به ${testPlatform === 'bale' ? 'بله' : testPlatform === 'rubika' ? 'روبیکا' : 'تلگرام'}`}</span>
                    </button>
                  </div>

                  {/* لیست کاربران اخیراً متصل‌شده به ربات */}
                  {connectedUsers.length > 0 && (
                    <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5 text-teal-800">
                          <Users size={15} />
                          کاربران فعال متصل به ربات ({toPersianDigits(connectedUsers.length)} نفر):
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal">جهت انتخاب، روی کاربر کلیک کنید</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {connectedUsers.map((u, i) => {
                          const isSelected = testChatId === u.chatId && testPlatform === u.platform;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setTestChatId(u.chatId);
                                if (u.platform === 'telegram' || u.platform === 'bale' || u.platform === 'rubika') {
                                  setTestPlatform(u.platform);
                                }
                              }}
                              className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
                                isSelected
                                  ? u.platform === 'bale'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : u.platform === 'rubika'
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                      : 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${u.platform === 'bale' ? 'bg-emerald-400' : u.platform === 'rubika' ? 'bg-purple-400' : 'bg-sky-400'}`}></span>
                              <span className="font-semibold">{u.fullName || u.firstName || 'کاربر'}</span>
                              <span className="text-[10px] opacity-80">({u.platform === 'bale' ? 'بله' : u.platform === 'rubika' ? 'روبیکا' : 'تلگرام'})</span>
                              {u.phone && <span className="text-[10px] opacity-80 font-mono">({u.phone})</span>}
                              <span className="font-mono text-[10px] bg-black/10 px-1.5 py-0.5 rounded">ID: {u.chatId}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-600 bg-teal-50/70 p-3.5 rounded-xl border border-teal-200/60 space-y-1.5">
                    <p className="leading-relaxed font-medium text-teal-950">
                      💡 <strong>نحوه اتصال مخاطب و جلوگیری از خطای ۴۰۰ (مخاطب در ربات استارت نزده):</strong>
                    </p>
                    <p className="leading-relaxed">
                      طبق پروتکل‌های امنیتی پیام‌رسان‌های بله، روبیکا و تلگرام، ربات‌ها اجازه آغاز پیام به اشخاص ناشناس را ندارند. مخاطب کافیست فقط <strong>یک‌بار</strong> وارد ربات شده و دکمه <span className="font-mono font-bold bg-white border border-teal-200 px-1.5 py-0.5 rounded text-teal-900">/start</span> را بزند. شناسه او فوراً ثبت شده و از آن پس تمام فاکتورها، یادآوری چک‌ها و پیام‌های سیستم به صورت آنی و بدون خطا به او تحویل داده می‌شوند.
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

