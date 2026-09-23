import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Bot, Send, X, Users, Sparkles, Phone, MessageSquare, 
  CheckCircle2, Image as ImageIcon, Search, ShieldCheck, Check, AlertCircle 
} from 'lucide-react';
import { db, useLiveQuery } from '../db/db';
import type { Customer, Property, PropertyListing, PropertyRequest } from '../types';
import { appendAgencySignature, toEnglishDigits } from '../utils/format';

interface SendPropertyToCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property | PropertyListing | null;
  defaultCustomer?: Customer | null;
  defaultRequest?: PropertyRequest | null;
}

export const SendPropertyToCustomerModal: React.FC<SendPropertyToCustomerModalProps> = ({
  isOpen,
  onClose,
  property,
  defaultCustomer,
  defaultRequest
}) => {
  const settings = useLiveQuery(() => db.settings.get(1));
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const propertyRequests = useLiveQuery(() => db.propertyRequests.toArray()) || [];

  const [mode, setMode] = useState<'matched' | 'customers' | 'manual'>('matched');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');

  const [platform, setPlatform] = useState<'all' | 'bale' | 'telegram' | 'rubika' | 'sms'>('all');
  const [customMessage, setCustomMessage] = useState('');
  const [includeImage, setIncludeImage] = useState(true);
  const [propertyImageUrl, setPropertyImageUrl] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  // Fetch primary thumbnail for the property if exists
  useEffect(() => {
    if (!property?.id) {
      setPropertyImageUrl('');
      return;
    }
    axios.get('/api/propertyMedia')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        const media = list.filter((m: any) => m.propertyId === property.id && (!m.type || m.type === 'image'));
        if (media.length > 0) {
          const sorted = media.sort((a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
          setPropertyImageUrl(sorted[0].url);
        } else {
          setPropertyImageUrl('');
        }
      })
      .catch(() => setPropertyImageUrl(''));
  }, [property?.id]);

  // Generate public marketing text for customers (CONFIDENTIAL OWNER/RESIDENT INFO IS STRIPPED)
  const defaultText = useMemo(() => {
    if (!property) return '';

    const p = property as any;
    const isRent = p.dealType === 'rent' || p.transactionType === 'rent' || p.transactionType === 'rent_mortgage' || p.transactionType === 'mortgage';
    const txLabel = isRent ? 'رهن و اجاره' : 'فروش';
    
    let priceText = '';
    if (isRent) {
      const dep = p.deposit ? Number(p.deposit).toLocaleString('fa-IR') + ' تومان ودیعه' : '';
      const rnt = p.monthlyRent || p.rent ? Number(p.monthlyRent || p.rent).toLocaleString('fa-IR') + ' تومان اجاره' : '';
      priceText = [dep, rnt].filter(Boolean).join(' | ');
    } else {
      const prc = p.price ? Number(p.price).toLocaleString('fa-IR') + ' تومان' : 'تماس بگیرید';
      priceText = `قیمت کل: ${prc}`;
    }

    const area = p.area ? `${p.area} متر مربع` : '';
    const rooms = p.rooms || p.bedrooms ? `${p.rooms || p.bedrooms} خوابه` : '';
    const location = p.neighborhood || p.address || '';
    const featuresList = Array.isArray(p.features) ? p.features.join('، ') : '';

    return `🏢 فایل ملکی پیشنهادی (${txLabel})
📌 عنوان: ${p.title || 'ملک بدون عنوان'}
${p.code ? `🔖 کد فایل: ${p.code}\n` : ''}📍 محدوده / محله: ${location || 'محدوده آژانس'}
📐 مشخصات: ${[area, rooms, p.floor ? `طبقه ${p.floor}` : ''].filter(Boolean).join(' - ')}
💰 شرایط مالی: ${priceText}
${featuresList ? `✨ امکانات: ${featuresList}\n` : ''}${p.description ? `📝 توضیحات: ${p.description}\n` : ''}
جهت بازدید حضوری و اطلاعات بیشتر با ما تماس بگیرید.`;
  }, [property]);

  // Set default message when property opens
  useEffect(() => {
    if (defaultText) {
      setCustomMessage(defaultText);
    }
  }, [defaultText]);

  // Preselect default customer if provided
  useEffect(() => {
    if (defaultCustomer?.id) {
      setSelectedCustomerIds([defaultCustomer.id]);
      setMode('customers');
    } else if (defaultRequest?.customerId) {
      setSelectedCustomerIds([defaultRequest.customerId]);
      setMode('matched');
    }
  }, [defaultCustomer, defaultRequest]);

  // Find smart matching requests for this property
  const matchedRequests = useMemo(() => {
    if (!property) return [];
    const p = property as any;
    const pDeal = p.dealType || p.transactionType || 'sale';
    const pArea = Number(p.area) || 0;
    const pPrice = Number(p.price) || 0;
    const pDeposit = Number(p.deposit) || 0;
    const pRent = Number(p.monthlyRent || p.rent) || 0;

    return propertyRequests.map(r => {
      let score = 50; // base score
      const rDeal = r.dealType || r.transactionType;

      // Deal type match
      if (rDeal && pDeal) {
        const isRentP = ['rent', 'rent_mortgage', 'mortgage'].includes(pDeal);
        const isRentR = ['rent', 'rent_mortgage', 'mortgage'].includes(rDeal);
        if (isRentP === isRentR) score += 25;
        else return null; // strictly exclude mismatching deal type
      }

      // Area match
      if (pArea > 0) {
        if (r.minArea && pArea >= r.minArea) score += 10;
        if (r.maxArea && pArea <= r.maxArea) score += 10;
      }

      // Budget match
      if (pPrice > 0 && r.maxPrice && pPrice <= r.maxPrice) score += 15;
      if (pDeposit > 0 && r.maxDeposit && pDeposit <= r.maxDeposit) score += 10;
      if (pRent > 0 && r.maxRent && pRent <= r.maxRent) score += 10;

      const customer = customers.find(c => c.id === r.customerId || c.phone === r.customerPhone);
      const name = r.customerName || customer?.fullName || 'متقاضی ناشناس';
      const phone = r.customerPhone || customer?.phone || '';

      return {
        request: r,
        customer,
        name,
        phone,
        score: Math.min(score, 100)
      };
    }).filter(Boolean).sort((a: any, b: any) => b.score - a.score);
  }, [property, propertyRequests, customers]);

  // Filtered customer list for manual search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 30);
    const q = customerSearch.trim().toLowerCase();
    return customers.filter(c => 
      (c.fullName && c.fullName.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.nationalId && c.nationalId.includes(q))
    ).slice(0, 50);
  }, [customers, customerSearch]);

  const toggleSelectCustomer = (id: number) => {
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!property) return;
    if (!customMessage.trim()) {
      toast.error('لطفاً متن پیام را وارد کنید');
      return;
    }

    // Determine target recipients
    type Recipient = { name: string; phone: string };
    const recipients: Recipient[] = [];

    if (mode === 'matched') {
      if (selectedCustomerIds.length === 0) {
        toast.error('حداقل یک متقاضی را از لیست انتخاب کنید');
        return;
      }
      for (const id of selectedCustomerIds) {
        const item = (matchedRequests as any[]).find(m => m?.request?.id === id || m?.customer?.id === id);
        if (item?.phone) {
          recipients.push({ name: item.name, phone: item.phone });
        }
      }
    } else if (mode === 'customers') {
      if (selectedCustomerIds.length === 0) {
        toast.error('حداقل یک مشتری را انتخاب کنید');
        return;
      }
      for (const id of selectedCustomerIds) {
        const c = customers.find(x => x.id === id);
        if (c?.phone) {
          recipients.push({ name: c.fullName, phone: c.phone });
        }
      }
    } else {
      if (!manualPhone.trim()) {
        toast.error('شماره موبایل یا شناسه دریافت‌کننده را وارد کنید');
        return;
      }
      recipients.push({ name: manualName.trim() || 'مشتری گرامی', phone: manualPhone.trim() });
    }

    if (recipients.length === 0) {
      toast.error('هیچ مخاطبی با شماره تلفن معتبر انتخاب نشده است');
      return;
    }

    setIsSending(true);
    const toastId = toast.loading(`در حال ارسال فایل ملکی به ${recipients.length} مخاطب...`);

    const finalMessageText = appendAgencySignature(customMessage, settings);
    let totalSuccess = 0;
    let totalFail = 0;

    for (const recipient of recipients) {
      const cleanPhone = toEnglishDigits(recipient.phone).trim();
      let sentForRecipient = false;

      // 1. Send via Messaging Bots (Telegram, Bale, Rubika)
      const botPlatforms: Array<{ name: 'telegram' | 'bale' | 'rubika'; token: string }> = [];

      if ((platform === 'all' || platform === 'bale') && settings?.baleToken) {
        botPlatforms.push({ name: 'bale', token: settings.baleToken });
      }
      if ((platform === 'all' || platform === 'telegram') && settings?.telegramToken) {
        botPlatforms.push({ name: 'telegram', token: settings.telegramToken });
      }
      if ((platform === 'all' || platform === 'rubika') && settings?.rubikaToken) {
        botPlatforms.push({ name: 'rubika', token: settings.rubikaToken });
      }

      for (const bot of botPlatforms) {
        try {
          const payload: any = {
            platform: bot.name,
            token: bot.token,
            chatId: cleanPhone,
            message: finalMessageText
          };
          if (includeImage && propertyImageUrl) {
            payload.imageUrl = propertyImageUrl;
          }
          const res = await axios.post('/api/send-message', payload);
          if (res.data?.success || res.data?.ok) {
            sentForRecipient = true;
            // Log to messageLogs
            await db.messageLogs.add({
              date: new Date().toLocaleDateString('fa-IR'),
              customerName: recipient.name,
              phone: cleanPhone,
              message: `[ارسال ملک: ${(property as any).title}] ${finalMessageText}`,
              status: 'sent',
              platform: bot.name,
              createdAt: Date.now()
            });
          }
        } catch (e) {
          console.warn(`Error sending via ${bot.name}:`, e);
        }
      }

      // 2. Send via SMS if requested or as fallback
      if (platform === 'all' || platform === 'sms') {
        try {
          const smsRes = await axios.post('/api/bot/send-sms', {
            phone: cleanPhone,
            message: finalMessageText,
            agencyId: settings?.agencyId || 'default'
          });
          if (smsRes.data?.success) {
            sentForRecipient = true;
            await db.messageLogs.add({
              date: new Date().toLocaleDateString('fa-IR'),
              customerName: recipient.name,
              phone: cleanPhone,
              message: `[SMS ارسال ملک] ${finalMessageText}`,
              status: 'sent',
              platform: 'sms',
              createdAt: Date.now()
            });
          }
        } catch (smsErr) {
          console.warn('SMS send error:', smsErr);
        }
      }

      if (sentForRecipient) {
        totalSuccess++;
      } else {
        totalFail++;
        await db.messageLogs.add({
          date: new Date().toLocaleDateString('fa-IR'),
          customerName: recipient.name,
          phone: cleanPhone,
          message: `[خطا در ارسال ملک] ${finalMessageText}`,
          status: 'failed',
          platform,
          createdAt: Date.now()
        });
      }
    }

    setIsSending(false);
    if (totalSuccess > 0) {
      toast.success(`فایل ملک با موفقیت برای ${totalSuccess} مخاطب ارسال گردید.`, { id: toastId, duration: 5000 });
      onClose();
    } else {
      toast.error('ارسال به پیام‌رسان‌ها با خطا مواجه شد. لطفاً اتصال ربات‌ها در تنظیمات و شماره‌های مشتریان را بررسی نمایید.', { id: toastId, duration: 6000 });
    }
  };

  if (!isOpen || !property) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto" dir="rtl">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Bot size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                ارسال مشخصات ملک به مشتریان با بات
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {(property as any).title} (کد: {(property as any).code || 'ثبت شده'})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Recipient Mode Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">انتخاب مخاطبان دریافت‌کننده:</label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('matched')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'matched' 
                    ? 'bg-white text-emerald-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles size={14} className="text-purple-500" />
                <span>متقاضیان منطبق ({matchedRequests.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('customers')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'customers' 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users size={14} className="text-blue-500" />
                <span>لیست کل مشتریان</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'manual' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone size={14} className="text-slate-500" />
                <span>شماره / شناسه دستی</span>
              </button>
            </div>
          </div>

          {/* Mode 1: Matched Requests */}
          {mode === 'matched' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>متقاضیانی که بودجه و متراژ درخواستی آن‌ها با این ملک همخوانی دارد:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCustomerIds.length === matchedRequests.length) setSelectedCustomerIds([]);
                    else setSelectedCustomerIds((matchedRequests as any[]).map(m => m.request.id));
                  }}
                  className="text-emerald-600 font-bold hover:underline"
                >
                  {selectedCustomerIds.length === matchedRequests.length ? 'لغو انتخاب همه' : 'انتخاب همه متقاضیان'}
                </button>
              </div>

              {matchedRequests.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  متقاضی ثبت‌شده‌ای منطبق با مشخصات این ملک یافت نشد. می‌توانید از تب «لیست کل مشتریان» مخاطب دلخواه را انتخاب کنید.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {(matchedRequests as any[]).map((item) => {
                    const isSelected = selectedCustomerIds.includes(item.request.id);
                    return (
                      <div
                        key={item.request.id}
                        onClick={() => toggleSelectCustomer(item.request.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                            isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check size={14} />}
                          </div>
                          <div>
                            <span className="font-bold text-xs">{item.name}</span>
                            <span className="text-[11px] text-slate-500 mr-2 font-mono" dir="ltr">{item.phone}</span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              تقاضا: {item.request.title || `${item.request.minArea || ''} تا ${item.request.maxArea || ''} متر`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700">
                            {item.score}٪ انطباق
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Mode 2: All Customers */}
          {mode === 'customers' && (
            <div className="space-y-2">
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجوی نام مشتری یا شماره تماس..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {filteredCustomers.map(c => {
                  const isSelected = selectedCustomerIds.includes(c.id!);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleSelectCustomer(c.id!)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-300 text-blue-950' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check size={14} />}
                        </div>
                        <div>
                          <span className="font-bold text-xs">{c.fullName}</span>
                          <span className="text-[11px] text-slate-500 mr-2 font-mono" dir="ltr">{c.phone}</span>
                        </div>
                      </div>
                      {c.roles && c.roles.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {c.roles[0]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode 3: Manual Phone */}
          {mode === 'manual' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">نام مخاطب:</label>
                <input
                  type="text"
                  placeholder="مثال: آقای حسینی"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">شماره موبایل یا شناسه چت:</label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="09123456789"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Platform Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">انتخاب کانال / پیام‌رسان بات جهت ارسال:</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setPlatform('all')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  platform === 'all'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>همه پلتفرم‌ها</span>
                <span className="text-[10px] text-slate-400 font-normal">ارسال همزمان</span>
              </button>

              <button
                type="button"
                onClick={() => setPlatform('bale')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  platform === 'bale'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>پیام‌رسان بله</span>
                <span className="text-[10px] text-emerald-600 font-normal">Bale Bot</span>
              </button>

              <button
                type="button"
                onClick={() => setPlatform('telegram')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  platform === 'telegram'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>تلگرام</span>
                <span className="text-[10px] text-blue-600 font-normal">Telegram</span>
              </button>

              <button
                type="button"
                onClick={() => setPlatform('rubika')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  platform === 'rubika'
                    ? 'border-purple-600 bg-purple-50 text-purple-800 ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>روبیکا</span>
                <span className="text-[10px] text-purple-600 font-normal">Rubika</span>
              </button>

              <button
                type="button"
                onClick={() => setPlatform('sms')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  platform === 'sms'
                    ? 'border-amber-600 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>پیامک صوتی/متنی</span>
                <span className="text-[10px] text-amber-600 font-normal">SMS</span>
              </button>
            </div>
          </div>

          {/* Privacy & Anti-Leak Shield Note */}
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
            <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
            <span>حفظ محرمانگی: شماره تماس مالک و مستأجر در این پیام فیلتر شده و فقط نام و شماره تماس بنگاه شما درج می‌شود.</span>
          </div>

          {/* Image preview & toggle if available */}
          {propertyImageUrl && (
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="flex items-center gap-3">
                <img src={propertyImageUrl} alt="thumb" className="w-12 h-10 object-cover rounded-md border border-slate-300" />
                <div>
                  <span className="font-bold text-slate-800 block">تصویر شاخص ملک</span>
                  <span className="text-[10px] text-slate-500">پیوست تصویر به پیام ربات</span>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={includeImage}
                  onChange={(e) => setIncludeImage(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>ارسال همراه با تصویر</span>
              </label>
            </div>
          )}

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-600">متن پیام ارسالی به مشتری:</label>
              <button
                type="button"
                onClick={() => setCustomMessage(defaultText)}
                className="text-[11px] text-emerald-600 hover:underline"
              >
                بازنشانی به متن پیش‌فرض
              </button>
            </div>
            <textarea
              rows={6}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            گیرندگان انتخاب‌شده:{' '}
            <strong className="text-slate-800">
              {mode === 'manual' ? (manualPhone ? 1 : 0) : selectedCustomerIds.length} مخاطب
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <Send size={15} />
              <span>{isSending ? 'در حال ارسال...' : 'ارسال به بات‌ها'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
