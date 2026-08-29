import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  Send, 
  MessageCircle, 
  Phone, 
  CreditCard, 
  Calendar, 
  CheckCircle2,
  AlertCircle,
  Building2,
  UserCheck,
  Filter
} from 'lucide-react';
import type { Customer, Settings, Contract } from '../types';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import moment from 'moment-jalaali';
import axios from 'axios';
import { normalizeSearchQuery, toPersianDigits, toEnglishDigits, appendAgencySignature, getAgencySignature, formatTemplateMessage } from '../utils/format';

const initialCustomerForm: Partial<Customer> = {
  fullName: '',
  nationalId: '',
  phone: '',
  phone2: '',
  birthDate: '',
  contractStartDate: '',
  contractEndDate: '',
  rentDueDay: undefined,
  rentPaymentDate: '',
  autoSendMessages: false,
  roles: [],
  customerType: 'other',
  hasUncollectedCheque: false,
  hasDebt: false,
  debtAmount: 0,
  telegramId: '',
  rubikaId: '',
  baleId: '',
};

const Customers = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'uncollected_cheque' | 'debt' | 'landlord' | 'buyer_landlord'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [messageText, setMessageText] = useState('');
  
  const settings = useLiveQuery(() => db.settings.get(1));
  const contracts = useLiveQuery(() => db.contracts.toArray());
  const allCustomers = useLiveQuery(() => db.customers.toArray());

  // محاسبه هوشمند وضعیت چک، بدهی، موجر و خریدار برای هر مشتری
  const getCustomerStatus = (customer: Customer) => {
    const customerContracts = (contracts || []).filter(c => 
      (c.party1?.nationalId && c.party1.nationalId === customer.nationalId) ||
      (c.party1?.phone && c.party1.phone === customer.phone) ||
      (c.party2?.nationalId && c.party2.nationalId === customer.nationalId) ||
      (c.party2?.phone && c.party2.phone === customer.phone)
    );

    // ۱. چک وصول نشده (قرمز)
    const hasUncollectedCheque = Boolean(
      customer.hasUncollectedCheque ||
      customerContracts.some(c => 
        ((c.party1?.phone === customer.phone || c.party1?.nationalId === customer.nationalId) && c.party1PaymentMethod === 'cheque' && c.status !== 'completed') ||
        ((c.party2?.phone === customer.phone || c.party2?.nationalId === customer.nationalId) && c.party2PaymentMethod === 'cheque' && c.status !== 'completed')
      )
    );

    // ۲. بدهی دارند (نارنجی)
    const hasDebt = Boolean(
      customer.hasDebt ||
      (customer.debtAmount && customer.debtAmount > 0) ||
      customerContracts.some(c => 
        ((c.party1?.phone === customer.phone || c.party1?.nationalId === customer.nationalId) && c.party1PaymentMethod === 'credit') ||
        ((c.party2?.phone === customer.phone || c.party2?.nationalId === customer.nationalId) && c.party2PaymentMethod === 'credit')
      )
    );

    // ۳. اشخاصی که موجر هستند (هایلایت توسی)
    const isLandlord = Boolean(
      customer.roles?.includes('موجر') ||
      customer.customerType === 'landlord' ||
      customerContracts.some(c => 
        ((c.party1?.phone === customer.phone || c.party1?.nationalId === customer.nationalId) && c.party1Role === 'موجر') ||
        ((c.party2?.phone === customer.phone || c.party2?.nationalId === customer.nationalId) && c.party2Role === 'موجر')
      )
    );

    // ۴. خریداران (هایلایت سبز کمرنگ)
    const isBuyer = Boolean(
      customer.roles?.includes('خریدار') ||
      customer.customerType === 'buyer' ||
      customerContracts.some(c => 
        ((c.party1?.phone === customer.phone || c.party1?.nationalId === customer.nationalId) && c.party1Role === 'خریدار') ||
        ((c.party2?.phone === customer.phone || c.party2?.nationalId === customer.nationalId) && c.party2Role === 'خریدار')
      )
    );

    return {
      hasUncollectedCheque,
      hasDebt,
      debtAmount: customer.debtAmount,
      isLandlord,
      isBuyer
    };
  };

  const filteredCustomers = useMemo(() => {
    if (!allCustomers) return [];
    let list = allCustomers;

    if (search.trim()) {
      const q = normalizeSearchQuery(search);
      list = list.filter(c => {
        const nameMatch = normalizeSearchQuery(c.fullName).includes(q);
        const nationalIdMatch = normalizeSearchQuery(c.nationalId).includes(q);
        const phoneMatch = normalizeSearchQuery(c.phone).includes(q);
        const phone2Match = normalizeSearchQuery(c.phone2).includes(q);
        return nameMatch || nationalIdMatch || phoneMatch || phone2Match;
      });
    }

    if (statusFilter === 'uncollected_cheque') {
      list = list.filter(c => getCustomerStatus(c).hasUncollectedCheque);
    } else if (statusFilter === 'debt') {
      list = list.filter(c => getCustomerStatus(c).hasDebt);
    } else if (statusFilter === 'landlord') {
      list = list.filter(c => getCustomerStatus(c).isLandlord);
    } else if (statusFilter === 'buyer_landlord') {
      list = list.filter(c => {
        const st = getCustomerStatus(c);
        return st.isBuyer || st.isLandlord;
      });
    }

    return list;
  }, [allCustomers, search, statusFilter, contracts]);

  const counts = useMemo(() => {
    if (!allCustomers) return { all: 0, uncollected_cheque: 0, debt: 0, landlord: 0, buyer_landlord: 0 };
    let uncollected_cheque = 0;
    let debt = 0;
    let landlord = 0;
    let buyer_landlord = 0;

    allCustomers.forEach(c => {
      const st = getCustomerStatus(c);
      if (st.hasUncollectedCheque) uncollected_cheque++;
      if (st.hasDebt) debt++;
      if (st.isLandlord) landlord++;
      if (st.isBuyer || st.isLandlord) buyer_landlord++;
    });

    return {
      all: allCustomers.length,
      uncollected_cheque,
      debt,
      landlord,
      buyer_landlord
    };
  }, [allCustomers, contracts]);

  const customers = filteredCustomers;

  const [formData, setFormData] = useState<Partial<Customer>>(initialCustomerForm);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPhone = toEnglishDigits(formData.phone || '').trim();
    const cleanedNationalId = toEnglishDigits(formData.nationalId || '').trim();

    if (!formData.fullName || !cleanedPhone) {
      toast.error('لطفا نام و شماره موبایل را وارد کنید (فیلدهای اجباری)');
      return;
    }
    
    if (!/^09\d{9}$/.test(cleanedPhone)) {
      toast.error('شماره موبایل باید ۱۱ رقمی باشد و با 09 شروع شود');
      return;
    }

    if (cleanedNationalId.length > 0 && !/^\d{10}$/.test(cleanedNationalId)) {
      toast.error('کد ملی باید دقیقا ۱۰ رقم باشد');
      return;
    }

    // Check for duplicates
    const allCustomers = await db.customers.toArray();
    const isDuplicate = allCustomers.some(c => 
      c.id !== formData.id && (
        c.phone === cleanedPhone || 
        (c.nationalId && cleanedNationalId && c.nationalId === cleanedNationalId)
      )
    );

    if (isDuplicate) {
      toast.error('مشتری با این شماره موبایل یا کد ملی قبلا ثبت شده است!');
      return;
    }
    
    try {
      if (formData.id) {
        await db.customers.update(formData.id, {
          ...formData,
          phone: cleanedPhone,
          nationalId: cleanedNationalId,
          phone2: toEnglishDigits(formData.phone2 || '').trim()
        });
        toast.success('اطلاعات مشتری بروزرسانی شد');
      } else {
        await db.customers.add({
          ...formData,
          phone: cleanedPhone,
          nationalId: cleanedNationalId,
          phone2: toEnglishDigits(formData.phone2 || '').trim(),
          roles: [],
          createdAt: Date.now()
        } as Customer);
        toast.success('مشتری با موفقیت ذخیره شد');
      }
      setIsModalOpen(false);
      setFormData(initialCustomerForm);
    } catch (err) {
      toast.error('خطا در ذخیره مشتری');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('آیا از حذف این مشتری مطمئن هستید؟')) {
      await db.customers.delete(id);
      toast.success('مشتری حذف شد');
    }
  };

  const exportToExcel = () => {
    if (!customers || customers.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(customers.map(c => ({
      'نام و نام خانوادگی': c.fullName,
      'کد ملی': c.nationalId,
      'موبایل': c.phone,
      'موبایل ۲': c.phone2 || '',
      'تاریخ تولد': c.birthDate || '',
      'تاریخ ثبت': new Date(c.createdAt).toLocaleDateString('fa-IR')
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "مشتریان");
    XLSX.writeFile(workbook, "customers.xlsx");
  };

  const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let imported = 0;
        for (const row of data as any[]) {
          const fullName = row['نام و نام خانوادگی'] || row['نام'] || row['fullName'] || '';
          const phone = toEnglishDigits(row['موبایل'] || row['تلفن'] || row['phone'] || '');
          const nationalId = toEnglishDigits(row['کد ملی'] || row['کدملی'] || row['nationalId'] || '');
          
          if (fullName && phone) {
            await db.customers.put({
              fullName,
              phone: phone.toString(),
              nationalId: nationalId.toString(),
              createdAt: Date.now(),
              roles: []
            });
            imported++;
          }
        }
        toast.success(`${toPersianDigits(imported)} مشتری با موفقیت وارد شد`);
      } catch (err) {
        toast.error('خطا در خواندن فایل اکسل');
      }
    };
    reader.readAsBinaryString(file);
  };

  
  const handleSendSms = async () => {
    if (!messageText) {
      toast.error('متن پیام را وارد کنید');
      return;
    }
    if (selectedCustomers.length === 0) {
      toast.error('هیچ مشتری انتخاب نشده است');
      return;
    }
    toast.loading('در حال ارسال پیامک...', { id: 'sendSms' });
    let successCount = 0;
    
    for (const cid of selectedCustomers) {
      const customer = customers?.find(c => c.id === cid);
      if (!customer || !customer.phone) continue;
      
      try {
        const res = await axios.post('/api/bot/send-sms', {
          phone: customer.phone,
          message: `سلام ${customer.fullName}\n${messageText}`
        });
        if (res.data.success) {
          successCount++;
        }
      } catch (err) {
        console.error('SMS error:', err);
      }
    }
    
    toast.dismiss('sendSms');
    if (successCount > 0) {
      toast.success(`ارسال پیامک پایان یافت. موفق: ${toPersianDigits(successCount)} شماره`);
    } else {
      toast.error('هیچ پیامکی ارسال نشد. تنظیمات پیامک را بررسی کنید.');
    }
    setIsMessageModalOpen(false);
    setMessageText('');
  };

  const handleSendMessage = async () => {
    if (!messageText) {
      toast.error('متن پیام را وارد کنید');
      return;
    }
    if (selectedCustomers.length === 0) {
      toast.error('هیچ مشتری انتخاب نشده است');
      return;
    }

    toast.loading('در حال ارسال پیام...', { id: 'sendMessage' });
    let successCount = 0;
    
    // Determine if it is a business card message to send the logo
    const isBusinessCard = messageText === settings?.defaultMessages?.businessCard;
    const imageBase64 = isBusinessCard && settings?.logoBase64 ? settings.logoBase64 : undefined;
    
    for (const cid of selectedCustomers) {
      const customer = customers?.find(c => c.id === cid);
      if (!customer) continue;
      
      const formattedText = messageText
        .replace(/{نام_مشتری}/g, customer.fullName)
        .replace(/{نام_املاک}/g, settings?.agencyName || 'مشاور املاک')
        .replace(/{تلفن_املاک}/g, settings?.phone1 || '')
        .replace(/{آدرس_املاک}/g, settings?.address || '');

      const rawText = formattedText.includes(customer.fullName)
        ? formattedText
        : `جناب/سرکار ${customer.fullName}،\n\n${formattedText}`;
      // Append agency IDs and information as a signature at the end of every message
      const finalMessageText = appendAgencySignature(rawText, settings);

      const activePlatforms = [];
      if (settings?.telegramToken && (customer.telegramId || customer.phone)) {
        activePlatforms.push({ name: 'telegram', token: settings.telegramToken, id: customer.telegramId || customer.phone });
      }
      if (settings?.baleToken && (customer.baleId || customer.phone)) {
        activePlatforms.push({ name: 'bale', token: settings.baleToken, id: customer.baleId || customer.phone });
      }
      if (settings?.rubikaToken && (customer.rubikaId || customer.phone)) {
        activePlatforms.push({ name: 'rubika', token: settings.rubikaToken, id: customer.rubikaId || customer.phone });
      }

      if (activePlatforms.length === 0) {
        await db.messageLogs.add({
          date: Date.now(),
          customerName: customer.fullName,
          phone: customer.phone,
          messenger: 'هیچ‌کدام',
          message: finalMessageText,
          status: 'failed'
        });
        continue;
      }

      for (const p of activePlatforms) {
        const cleanChatId = toEnglishDigits(p.id).trim();
        try {
          const res = await axios.post('/api/send-message', {
            platform: p.name,
            token: p.token,
            chatId: cleanChatId,
            message: finalMessageText,
            imageBase64
          });

          if (res.data?.success) {
            successCount++;
            
            const resolvedId = res.data?.resolvedChatId || cleanChatId;
            let needsUpdate = false;
            const updatedCustomer = { ...customer };
            
            if (p.name === 'telegram' && updatedCustomer.telegramId !== resolvedId) {
              updatedCustomer.telegramId = resolvedId;
              needsUpdate = true;
            } else if (p.name === 'bale' && updatedCustomer.baleId !== resolvedId) {
              updatedCustomer.baleId = resolvedId;
              needsUpdate = true;
            } else if (p.name === 'rubika' && updatedCustomer.rubikaId !== resolvedId) {
              updatedCustomer.rubikaId = resolvedId;
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              await db.customers.put(updatedCustomer);
            }

            await db.messageLogs.add({
              date: Date.now(),
              customerName: customer.fullName,
              phone: customer.phone,
              messenger: p.name,
              message: finalMessageText,
              status: 'sent',
              chatId: cleanChatId
            } as any);
          } else {
            await db.messageLogs.add({
              date: Date.now(),
              customerName: customer.fullName,
              phone: customer.phone,
              messenger: p.name,
              message: finalMessageText,
              status: 'failed',
              chatId: cleanChatId
            } as any);
          }
        } catch (err: any) {
          console.log('Customer message send notice:', err?.response?.data?.details || err?.response?.data?.error || err.message);
          await db.messageLogs.add({
            date: Date.now(),
            customerName: customer.fullName,
            phone: customer.phone,
            messenger: p.name,
            message: finalMessageText,
            status: 'failed',
            chatId: cleanChatId
          } as any);
        }
      }
    }

    toast.dismiss('sendMessage');
    if (successCount > 0) {
      toast.success(`ارسال پیام پایان یافت. موفق: ${toPersianDigits(successCount)} پلتفرم`);
    } else {
      toast.error('هیچ پیامی ارسال نشد. مخاطبان باید ابتدا در ربات استارت (/start) زده باشند یا شناسه عددی چت آن‌ها ثبت شده باشد.');
    }
    setIsMessageModalOpen(false);
    setMessageText('');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">مدیریت مشتریان</h2>
          <p className="text-xs text-slate-500 mt-1">امکان جستجوی هوشمند بر اساس نام، کد ملی یا شماره همراه</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedCustomers.length > 0 && (
            <button 
              onClick={() => setIsMessageModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm font-bold animate-in fade-in zoom-in text-sm"
            >
              <Send size={18} /> ارسال پیام ({toPersianDigits(selectedCustomers.length)})
            </button>
          )}
          <div className="flex gap-2">
          <button onClick={exportToExcel} className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm text-sm">
            <Download size={18} /> خروجی اکسل
          </button>
          
          <div className="relative group">
            <label className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer text-sm">
              <Upload size={18} /> وارد کردن اکسل
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importFromExcel} />
            </label>
            <div className="absolute top-full mt-2 w-64 bg-slate-800 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 right-0">
              <p className="font-bold mb-2 text-emerald-400">راهنمای آپلود فایل اکسل:</p>
              <ul className="space-y-1 text-slate-200 list-disc list-inside">
                <li>سطر اول فایل باید شامل عناوین زیر باشد:</li>
                <li className="text-emerald-300 font-mono">نام و نام خانوادگی</li>
                <li className="text-emerald-300 font-mono">موبایل</li>
                <li className="text-emerald-300 font-mono">کد ملی</li>
                <li>فایل پشتیبانی شده: xlsx, csv</li>
              </ul>
            </div>
          </div>
          <button 
            onClick={() => {
              setFormData(initialCustomerForm);
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors font-bold shadow-sm shadow-emerald-600/20 text-sm"
          >
            <Plus size={20} />
            افزودن مشتری
          </button>
        </div>
      </div>

      {/* نوار جستجوی پیشرفته با امکان جستجوی کد ملی، موبایل و نام */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center gap-3 focus-within:ring-2 focus-within:ring-emerald-500 rounded-xl px-2 py-1 transition-all">
          <Search size={22} className="text-slate-400 shrink-0" />
          <input 
            type="text" 
            placeholder="جستجوی هوشمند بر اساس نام، شماره موبایل یا کد ملی..." 
            className="flex-1 bg-transparent border-none focus:outline-none text-slate-700 placeholder:text-slate-400 text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md"
            >
              پاک کردن
            </button>
          )}
        </div>

        {search.trim() && (
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
            <span>
              نتایج مشابه یافت شده برای «<strong className="text-emerald-700">{search}</strong>»:
            </span>
            <span className="font-bold text-emerald-800">
              {toPersianDigits(customers?.length || 0)} مشتری
            </span>
          </div>
        )}

        {/* فیلترهای سریع رنگی وضعیت مشتریان بر اساس درخواست کاربر */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Filter size={14} /> فیلتر وضعیت:
          </span>
          
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه مشتریان ({toPersianDigits(counts.all)})
          </button>

          <button
            onClick={() => setStatusFilter('uncollected_cheque')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'uncollected_cheque'
                ? 'bg-red-600 text-white ring-2 ring-red-300 shadow-xs'
                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            }`}
            title="اشخاص دارای چک وصول نشده (رنگ قرمز)"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            چک وصول‌نشده ({toPersianDigits(counts.uncollected_cheque)})
          </button>

          <button
            onClick={() => setStatusFilter('debt')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'debt'
                ? 'bg-amber-600 text-white ring-2 ring-amber-300 shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
            title="افرادی که بدهی دارند (رنگ نارنجی)"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            دارای بدهی ({toPersianDigits(counts.debt)})
          </button>

          <button
            onClick={() => setStatusFilter('landlord')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'landlord'
                ? 'bg-slate-700 text-white ring-2 ring-slate-300 shadow-xs'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
            }`}
            title="اشخاصی که موجر هستند (هایلایت توسی)"
          >
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            موجران ({toPersianDigits(counts.landlord)})
          </button>

          <button
            onClick={() => setStatusFilter('buyer_landlord')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'buyer_landlord'
                ? 'bg-emerald-700 text-white ring-2 ring-emerald-300 shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
            title="خریداران و موجران (هایلایت سبز کمرنگ)"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            خریداران و موجران ({toPersianDigits(counts.buyer_landlord)})
          </button>
        </div>
      </div>

      {/* جدول مشتریان با ارقام فارسی و تفکیک رنگی وضعیت */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={Boolean(customers && customers.length > 0 && selectedCustomers.length === customers.length)}
                    onChange={(e) => {
                      if (e.target.checked && customers) {
                        setSelectedCustomers(customers.map(c => c.id as number));
                      } else {
                        setSelectedCustomers([]);
                      }
                    }}
                  />
                </th>
                <th className="p-4 font-bold text-sm">نام و نام خانوادگی</th>
                <th className="p-4 font-bold text-sm">نقش و وضعیت مالی</th>
                <th className="p-4 font-bold text-sm">کد ملی</th>
                <th className="p-4 font-bold text-sm">موبایل اصلی</th>
                <th className="p-4 font-bold text-sm">تاریخ تولد</th>
                <th className="p-4 font-bold text-sm text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    {search || statusFilter !== 'all' ? 'هیچ مشتری با این مشخصات یافت نشد' : 'هنوز مشتری ثبت نشده است'}
                  </td>
                </tr>
              ) : (
                customers?.map(customer => {
                  const st = getCustomerStatus(customer);
                  
                  // تعیین رنگ سطر طبق درخواست کاربر:
                  // چک وصول نشده: قرمز
                  // بدهی: نارنجی
                  // خریدار: سبز کمرنگ
                  // موجر: هایلایت توسی
                  let rowColorClass = 'hover:bg-slate-50/80 transition-colors';
                  if (st.hasUncollectedCheque) {
                    rowColorClass = 'bg-red-50/40 hover:bg-red-50/70 border-r-4 border-r-red-500 transition-colors';
                  } else if (st.hasDebt) {
                    rowColorClass = 'bg-amber-50/40 hover:bg-amber-50/70 border-r-4 border-r-amber-500 transition-colors';
                  } else if (st.isBuyer) {
                    rowColorClass = 'bg-emerald-50/30 hover:bg-emerald-50/60 border-r-4 border-r-emerald-400 transition-colors';
                  } else if (st.isLandlord) {
                    rowColorClass = 'bg-slate-100/60 hover:bg-slate-200/50 border-r-4 border-r-slate-400 transition-colors';
                  }

                  return (
                    <tr key={customer.id} className={rowColorClass}>
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          checked={selectedCustomers.includes(customer.id as number)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomers([...selectedCustomers, customer.id as number]);
                            } else {
                              setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                            }
                          }}
                        />
                      </td>
                      <td className="p-4 text-slate-800 font-bold text-sm">
                        <div className="flex items-center gap-1.5">
                          {customer.fullName}
                          {st.hasUncollectedCheque && (
                            <span className="w-2 h-2 rounded-full bg-red-500" title="دارای چک وصول‌نشده"></span>
                          )}
                          {st.hasDebt && !st.hasUncollectedCheque && (
                            <span className="w-2 h-2 rounded-full bg-amber-500" title="دارای بدهی مالی"></span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* چک وصول نشده با رنگ قرمز */}
                          {st.hasUncollectedCheque && (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 border border-red-300 font-bold px-2 py-0.5 rounded-md text-xs shadow-2xs animate-pulse" title="چک وصول نشده">
                              <AlertCircle size={13} className="text-red-600" />
                              چک وصول‌نشده
                            </span>
                          )}
                          
                          {/* افراد دارای بدهی با رنگ نارنجی */}
                          {st.hasDebt && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-md text-xs shadow-2xs" title="دارای بدهی مالی">
                              <CreditCard size={13} className="text-amber-700" />
                              بدهکار{st.debtAmount ? `: ${toPersianDigits(st.debtAmount.toLocaleString())} تومان` : ''}
                            </span>
                          )}

                          {/* اشخاصی که موجر هستند با هایلایت توسی */}
                          {st.isLandlord && (
                            <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-800 border border-slate-300 font-bold px-2 py-0.5 rounded-md text-xs shadow-2xs" title="موجر (هایلایت توسی)">
                              <Building2 size={13} className="text-slate-600" />
                              موجر
                            </span>
                          )}

                          {/* خریداران با رنگ هایلایت سبز کمرنگ */}
                          {st.isBuyer && (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-md text-xs shadow-2xs" title="خریدار (هایلایت سبز کمرنگ)">
                              <UserCheck size={13} className="text-emerald-700" />
                              خریدار
                            </span>
                          )}

                          {!st.hasUncollectedCheque && !st.hasDebt && !st.isLandlord && !st.isBuyer && (
                            <span className="text-xs text-slate-400">عادی</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 font-mono text-sm">{toPersianDigits(customer.nationalId) || '-'}</td>
                      <td className="p-4 text-slate-600 font-mono text-sm" dir="ltr">{toPersianDigits(customer.phone)}</td>
                      <td className="p-4 text-slate-600 text-sm font-mono">{toPersianDigits(customer.birthDate) || '-'}</td>
                      <td className="p-4 flex justify-center gap-1.5">
                        <button 
                          onClick={() => {
                            setSelectedCustomers([customer.id as number]);
                            setIsMessageModalOpen(true);
                          }} 
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                          title="ارسال پیام"
                        >
                          <Send size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setFormData(customer);
                            setIsModalOpen(true);
                          }} 
                          className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-colors"
                          title="ویرایش مشتری"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(customer.id as number)} 
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="حذف مشتری"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* مدال ایجاد / ویرایش مشتری */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
              {formData.id ? 'ویرایش اطلاعات مشتری' : 'افزودن مشتری جدید'}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">نام و نام خانوادگی *</label>
                  <input type="text" required className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm" value={formData.fullName || ''} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">کد ملی (۱۰ رقم)</label>
                  <input type="text" maxLength={10} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono text-sm" value={formData.nationalId || ''} onChange={e => setFormData({...formData, nationalId: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">موبایل اصلی (۱۱ رقم) *</label>
                  <input type="tel" dir="ltr" required className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono text-right text-sm" placeholder="0912..." value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">موبایل دوم / تلفن ثابت</label>
                  <input type="tel" dir="ltr" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono text-right text-sm" value={formData.phone2 || ''} onChange={e => setFormData({...formData, phone2: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">تاریخ تولد</label>
                  <div className="w-full">
                    <DatePicker
                      calendar={persian}
                      locale={persian_fa}
                      value={formData.birthDate || ''}
                      onChange={(date: any) => setFormData({...formData, birthDate: date ? date.format('YYYY/MM/DD') : ''})}
                      inputClass="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      placeholder="انتخاب تاریخ تولد"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">تاریخ انعقاد قرارداد</label>
                  <div className="w-full">
                    <DatePicker
                      calendar={persian}
                      locale={persian_fa}
                      value={formData.contractStartDate || ''}
                      onChange={(date: any) => {
                        const sDate = date ? date.format('YYYY/MM/DD') : '';
                        let eDate = '';
                        if (sDate) {
                          try {
                            eDate = moment(sDate, 'jYYYY/jMM/jDD').add(1, 'jYear').format('jYYYY/jMM/jDD');
                          } catch (err) {
                            eDate = '';
                          }
                        }
                        setFormData({
                          ...formData, 
                          contractStartDate: sDate,
                          contractEndDate: eDate
                        });
                      }}
                      inputClass="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      placeholder="انتخاب تاریخ انعقاد"
                    />
                  </div>
                  {formData.contractEndDate && (
                    <p className="text-[11px] text-emerald-700 font-bold mt-1 font-mono">
                      اتمام ۱ ساله: {toPersianDigits(formData.contractEndDate)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">روز موعد اجاره در هر ماه</label>
                  <select
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                    value={formData.rentDueDay || ''}
                    onChange={e => setFormData({...formData, rentDueDay: e.target.value ? Number(e.target.value) : undefined})}
                  >
                    <option value="">انتخاب روز ماه (۱ الی ۳۱)</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        روز {toPersianDigits(day)} هر ماه (ارسال ۱ روز قبل)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* انتخاب نقش مشتری و وضعیت مالی طبق درخواست کاربر */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">نقش مشتری در معاملات:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { role: 'موجر', label: 'موجر (هایلایت توسی)', colorClass: 'bg-slate-100 text-slate-800 border-slate-300 peer-checked:bg-slate-700 peer-checked:text-white' },
                      { role: 'خریدار', label: 'خریدار (سبز کمرنگ)', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 peer-checked:bg-emerald-700 peer-checked:text-white' },
                      { role: 'مستأجر', label: 'مستأجر', colorClass: 'bg-blue-50 text-blue-800 border-blue-200 peer-checked:bg-blue-600 peer-checked:text-white' },
                      { role: 'فروشنده', label: 'فروشنده', colorClass: 'bg-purple-50 text-purple-800 border-purple-200 peer-checked:bg-purple-600 peer-checked:text-white' }
                    ].map(item => {
                      const isChecked = (formData.roles || []).includes(item.role);
                      return (
                        <label key={item.role} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer bg-white hover:border-slate-400 transition-all text-xs font-medium">
                          <input 
                            type="checkbox"
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                            checked={isChecked}
                            onChange={(e) => {
                              const currentRoles = formData.roles || [];
                              const newRoles = e.target.checked
                                ? [...currentRoles, item.role]
                                : currentRoles.filter(r => r !== item.role);
                              
                              let newType = formData.customerType;
                              if (newRoles.includes('موجر')) newType = 'landlord';
                              else if (newRoles.includes('خریدار')) newType = 'buyer';
                              else if (newRoles.includes('مستأجر')) newType = 'tenant';
                              else if (newRoles.includes('فروشنده')) newType = 'seller';

                              setFormData({
                                ...formData,
                                roles: newRoles,
                                customerType: newType
                              });
                            }}
                          />
                          <span>{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2.5 p-2.5 bg-red-50/70 border border-red-200 rounded-xl cursor-pointer hover:bg-red-50 transition-colors">
                    <input 
                      type="checkbox"
                      className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                      checked={Boolean(formData.hasUncollectedCheque)}
                      onChange={(e) => setFormData({...formData, hasUncollectedCheque: e.target.checked})}
                    />
                    <div className="text-xs">
                      <span className="font-bold text-red-700 block">دارای چک وصول‌نشده (رنگ قرمز)</span>
                      <span className="text-[10px] text-red-500">علامت‌گذاری با رنگ قرمز در لیست مشتریان</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50 transition-colors">
                    <input 
                      type="checkbox"
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      checked={Boolean(formData.hasDebt)}
                      onChange={(e) => setFormData({...formData, hasDebt: e.target.checked})}
                    />
                    <div className="text-xs">
                      <span className="font-bold text-amber-800 block">دارای بدهی مالی (رنگ نارنجی)</span>
                      <span className="text-[10px] text-amber-600">علامت‌گذاری با رنگ نارنجی در لیست مشتریان</span>
                    </div>
                  </label>
                </div>

                {formData.hasDebt && (
                  <div className="pt-1 animate-in fade-in">
                    <label className="block text-xs font-bold text-amber-900 mb-1">مبلغ بدهی به تومان:</label>
                    <input 
                      type="text"
                      dir="ltr"
                      placeholder="مبلغ بدهی..."
                      className="w-full border border-amber-200 bg-white rounded-xl p-2.5 text-right font-mono text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      value={formData.debtAmount ? toPersianDigits(formData.debtAmount.toString()) : ''}
                      onChange={(e) => {
                        const val = parseInt(toEnglishDigits(e.target.value).replace(/\D/g, '')) || 0;
                        setFormData({...formData, debtAmount: val});
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  id="autoSend"
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  checked={Boolean(formData.autoSendMessages)}
                  onChange={e => setFormData({...formData, autoSendMessages: e.target.checked})}
                />
                <label htmlFor="autoSend" className="text-sm font-bold text-slate-600 cursor-pointer">
                  ارسال خودکار پیام‌های موعد (تولد، اتمام قرارداد و یادآوری اجاره)
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1.5">Chat ID تلگرام</label>
                  <input type="text" dir="ltr" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2 text-left focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs font-mono" value={formData.telegramId || ''} onChange={e => setFormData({...formData, telegramId: toEnglishDigits(e.target.value)})} placeholder="123456789" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1.5">شناسه روبیکا</label>
                  <input type="text" dir="ltr" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2 text-left focus:ring-2 focus:ring-orange-500 outline-none transition-all text-xs font-mono" value={formData.rubikaId || ''} onChange={e => setFormData({...formData, rubikaId: toEnglishDigits(e.target.value)})} placeholder="@username" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1.5">Chat ID بله</label>
                  <input type="text" dir="ltr" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2 text-left focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-xs font-mono" value={formData.baleId || ''} onChange={e => setFormData({...formData, baleId: toEnglishDigits(e.target.value)})} placeholder="123456789" />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-3 hover:bg-slate-50 font-bold transition-colors">انصراف</button>
                <button type="submit" className="flex-1 bg-emerald-600 text-white rounded-xl py-3 hover:bg-emerald-700 font-bold shadow-sm shadow-emerald-600/20 transition-colors">ذخیره مشتری</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال ارسال پیام همراه با پیش‌نمایش امضای املاک */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
              ارسال پیام به مشتریان ({toPersianDigits(selectedCustomers.length)} نفر)
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-100 leading-relaxed">
                  نام مشتری به صورت خودکار در ابتدای پیام قرار می‌گیرد و اطلاعات و آیدی‌های املاک مانند یک امضا در انتهای پیام درج خواهد شد.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                  <span>متن اصلی پیام</span>
                  <span className="text-[11px] text-blue-600 font-medium cursor-pointer hover:underline" onClick={() => setMessageText(settings?.defaultMessages?.businessCard || '')}>کارت ویزیت</span>
                </label>
                <textarea 
                  className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] text-sm"
                  placeholder="متن پیام خود را اینجا بنویسید..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                ></textarea>
                
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button 
                    onClick={() => {
                      const welcome = settings?.defaultMessages?.welcome || 'سلام 🌹\nبه سامانه هوشمند اطلاع‌رسانی {نام_املاک} خوش آمدید.\n\nجهت استفاده از خدمات، دریافت صورتحساب‌ها، فاکتورها و دسترسی به اطلاعات قراردادها در خدمت شما هستیم.';
                      setMessageText(formatTemplateMessage(welcome, settings));
                    }} 
                    className="text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg hover:bg-indigo-100 border border-indigo-200"
                  >
                    خوش‌آمدگویی و معرفی ربات
                  </button>
                  <button onClick={() => setMessageText(settings?.defaultMessages?.birthday || '')} className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-200">تبریک تولد</button>
                  <button onClick={() => setMessageText(settings?.defaultMessages?.contractExpiry || '')} className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-200">اتمام قرارداد</button>
                  <button onClick={() => setMessageText(settings?.defaultMessages?.rentPayment || '')} className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-200">اجاره بها</button>
                  <button onClick={() => setMessageText(settings?.defaultMessages?.chequeDue || '')} className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-200">وصول چک</button>
                </div>
              </div>

              {/* پیش‌نمایش امضای املاک در انتهای پیام */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5 mb-1.5 text-emerald-700">
                  <CheckCircle2 size={16} />
                  <span className="text-xs font-bold">امضای انتهای پیام (اطلاعات و آیدی‌های املاک):</span>
                </div>
                <pre className="text-[11px] text-slate-600 font-sans whitespace-pre-wrap leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200" dir="rtl">
                  {getAgencySignature(settings) || 'اطلاعات املاک جهت درج در امضا تنظیم نشده است.'}
                </pre>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsMessageModalOpen(false)} className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-3 hover:bg-slate-50 font-bold transition-colors text-sm">انصراف</button>
                <button onClick={handleSendMessage} className="flex-1 bg-blue-600 text-white rounded-xl py-3 hover:bg-blue-700 font-bold shadow-sm shadow-blue-600/20 transition-colors flex justify-center items-center gap-2 text-sm">
                  <Send size={18} /> پیام‌رسان‌ها
                </button>
                <button onClick={handleSendSms} className="flex-1 bg-emerald-600 text-white rounded-xl py-3 hover:bg-emerald-700 font-bold shadow-sm shadow-emerald-600/20 transition-colors flex justify-center items-center gap-2 text-sm">
                  <Smartphone size={18} /> پیامک (SMS)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;

