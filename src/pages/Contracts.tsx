import React, { useState } from 'react';
import { db } from '../db/db';
import toast from 'react-hot-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import moment from 'moment-jalaali';
import { numberToWords } from '../utils/helpers';
import { 
  toPersianDigits, 
  toEnglishDigits, 
  normalizeSearchQuery, 
  formatCurrency, 
  appendAgencySignature,
  createInvoiceMessengerMessage
} from '../utils/format';
import type { Customer, Contract } from '../types';
import { 
  Printer, Save, Calculator, CheckCircle2, Eye, Calendar, 
  CalendarCheck, Clock, Plus, Trash2, ArrowRight, FileText, 
  Search, Filter, Building2, User, Check, CreditCard, Banknote,
  Send, RotateCw, RefreshCw, X, AlertCircle, Share2, CalendarPlus, Download
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import axios from 'axios';

import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

const getTodayJalali = () => moment().format('jYYYY/jMM/jDD');
const getOneYearLaterJalali = (dateStr: string) => {
  try {
    return moment(dateStr, 'jYYYY/jMM/jDD').add(1, 'jYear').format('jYYYY/jMM/jDD');
  } catch (e) {
    return '';
  }
};

const defaultStartDate = getTodayJalali();
const initialContractState: Partial<Contract> = {
  contractNumber: '',
  date: defaultStartDate,
  endDate: getOneYearLaterJalali(defaultStartDate),
  type: 'rent',
  party1Role: 'موجر',
  party2Role: 'مستأجر',
  party1: null,
  party2: null,
  price: 0,
  rent: 0,
  commission: 0,
  tax: 0,
  totalPayable: 0,
  party1PaymentMethod: 'cash',
  party2PaymentMethod: 'cash',
  party1ChequeDate: '',
  party2ChequeDate: '',
  rentDueDay: 1,
  status: 'draft'
};

const Contracts = () => {
  const settings = useLiveQuery(() => db.settings.get(1));
  const customers = useLiveQuery(() => db.customers.toArray());
  const contracts = useLiveQuery(() => db.contracts.toArray());
  
  // Navigation tabs: 'list' (لیست قراردادها و فاکتورها) or 'new' (صدور فاکتور جدید)
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new');
  const [step, setStep] = useState(1);
  const [contractData, setContractData] = useState<Partial<Contract>>(initialContractState);

  const [search1, setSearch1] = useState('');
  const [search2, setSearch2] = useState('');
  
  const [showInvoice, setShowInvoice] = useState(false);
  const [isReprintMode, setIsReprintMode] = useState(false);
  const [printTarget, setPrintTarget] = useState<'party1' | 'party2' | 'both'>('both');

  // Resend Invoice Modal
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [resendContract, setResendContract] = useState<Contract | null>(null);
  const [resendTarget, setResendTarget] = useState<'both' | 'party1' | 'party2'>('both');
  const [resendPlatform, setResendPlatform] = useState<'all' | 'telegram' | 'bale' | 'rubika'>('all');
  const [resendMessageText, setResendMessageText] = useState('');
  const [isResending, setIsResending] = useState(false);

  // Contract Renewal Modal
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [renewalContract, setRenewalContract] = useState<Contract | null>(null);
  const [renewalStartDate, setRenewalStartDate] = useState('');
  const [renewalEndDate, setRenewalEndDate] = useState('');
  const [renewalPrice, setRenewalPrice] = useState(0);
  const [renewalRent, setRenewalRent] = useState(0);
  const [renewalRentDueDay, setRenewalRentDueDay] = useState(1);

  // List filters and search
  const [listSearch, setListSearch] = useState('');
  const [listFilter, setListFilter] = useState<'all' | 'rent' | 'sale' | 'cheque'>('all');

  const calculateTotal = () => {
    let commission = 0;
    if (contractData.type === 'sale') {
      commission = ((contractData.price || 0) * (settings?.commissionRate || 1)) / 100;
    } else {
      // فرمول رایج کمیسیون رهن و اجاره: ۲۵٪ (یک چهارم) مجموع اجاره‌بها و معادل اجاره‌ی رهن (هر ۱ میلیون = ۳۰ هزار تومان یا ۳٪)
      const equivalentRent = (contractData.rent || 0) + ((contractData.price || 0) * 0.03);
      commission = equivalentRent * 0.25;
    }
    
    const tax = (commission * (settings?.taxRate || 9)) / 100;
    const total = commission + tax;
    
    setContractData({
      ...contractData,
      commission,
      tax,
      totalPayable: total
    });
    
    toast.success('محاسبات انجام شد');
    setStep(3);
  };

  const handleSave = async () => {
    if (!contractData.party1 || !contractData.party2) {
      toast.error('لطفا اطلاعات طرفین را کامل کنید');
      return;
    }

    try {
      const newId = await db.contracts.add({
        ...contractData,
        status: 'completed',
        createdAt: Date.now()
      } as Contract);
      
  const sendAutoSms = async (contract: Partial<Contract>) => {
    if (!settings?.autoSendSmsInvoice || !settings?.smsProvider || settings.smsProvider === 'none') return;
    try {
      const amount = contract.totalPayable || 0;
      const tpl = settings.smsTemplateText || 'فاکتور شماره {contract} صادر شد. مبلغ قابل پرداخت: {amount} تومان.';
      
      if (contract.party1?.phone) {
        const msg1 = tpl
          .replace('{name}', contract.party1.fullName || '')
          .replace('{contract}', contract.contractNumber || '')
          .replace('{amount}', toPersianDigits(amount.toString()));
        axios.post('/api/bot/send-sms', { phone: contract.party1.phone, message: msg1 }).catch(()=>console.log('sms fail'));
      }
      if (contract.party2?.phone) {
        const msg2 = tpl
          .replace('{name}', contract.party2.fullName || '')
          .replace('{contract}', contract.contractNumber || '')
          .replace('{amount}', toPersianDigits(amount.toString()));
        axios.post('/api/bot/send-sms', { phone: contract.party2.phone, message: msg2 }).catch(()=>console.log('sms fail'));
      }
    } catch(e) {}
  };

      toast.success('قرارداد با موفقیت ثبت شد');
      sendAutoSms({ ...contractData, totalPayable: (contractData.commission || 0) + (contractData.tax || 0) });

      // Update tenant in customers collection for 1-year automation
      if (contractData.type === 'rent') {
        const tenant = (contractData.party1Role === 'مستأجر' ? contractData.party1 : contractData.party2) || contractData.party2;
        if (tenant?.id) {
          await db.customers.update(tenant.id, {
            contractStartDate: contractData.date,
            contractEndDate: contractData.endDate,
            rentDueDay: contractData.rentDueDay || 1
          });
        }
      }
      
      // Auto-send messages if enabled
      if (settings?.autoSendInvoices) {
        const messageText = createInvoiceMessengerMessage(contractData, settings, false);
        setTimeout(() => {
           if (contractData.party1) sendAutoMessage(contractData.party1, messageText);
           if (contractData.party2) sendAutoMessage(contractData.party2, messageText);
        }, 1000);
      }
      
      setContractData(prev => ({ ...prev, id: newId }));
      setIsReprintMode(false);
      setShowInvoice(true);
    } catch (error) {
      toast.error('خطا در ثبت قرارداد');
    }
  };

  const sendAutoMessage = async (customer: Customer, text: string) => {
    const finalMessage = appendAgencySignature(text, settings);
    const activePlatforms = [];
    if (settings?.telegramToken && (customer.phone)) activePlatforms.push({ name: 'telegram', token: settings.telegramToken, id: customer.phone });
    if (settings?.baleToken && (customer.phone)) activePlatforms.push({ name: 'bale', token: settings.baleToken, id: customer.phone });
    if (settings?.rubikaToken && (customer.phone)) activePlatforms.push({ name: 'rubika', token: settings.rubikaToken, id: customer.phone });

    for (const p of activePlatforms) {
      const cleanChatId = toEnglishDigits(p.id).trim();
      try {
        const res = await axios.post('/api/send-message', {
          platform: p.name,
          token: p.token,
          chatId: cleanChatId,
          message: finalMessage
        });
        await db.messageLogs.add({
          date: Date.now(),
          customerName: customer.fullName,
          phone: customer.phone,
          messenger: p.name,
          message: finalMessage,
          status: res.data?.success ? 'sent' : 'failed',
          chatId: cleanChatId
        } as any);
      } catch (err) {
        await db.messageLogs.add({
          date: Date.now(),
          customerName: customer.fullName,
          phone: customer.phone,
          messenger: p.name,
          message: finalMessage,
          status: 'failed',
          chatId: cleanChatId
        } as any);
      }
    }
  };

  const openInvoiceForContract = (contract: Contract, isReprint: boolean = true) => {
    setContractData(contract);
    setIsReprintMode(isReprint);
    setShowInvoice(true);
  };

  // Open Resend Invoice Modal with reprint text
  const handleOpenResendModal = (contract: Contract) => {
    setResendContract(contract);
    const msg = createInvoiceMessengerMessage(contract, settings, true);
    setResendMessageText(msg);
    setResendTarget('both');
    setResendPlatform('all');
    setResendModalOpen(true);
  };

  const executeResend = async () => {
    if (!resendContract) return;

    setIsResending(true);
    const toastId = toast.loading('در حال ارسال مجدد فاکتور به پیام‌رسان‌ها (با ذکر چاپ مجدد)...');

    const recipients: { customer: Customer; role: string }[] = [];
    if ((resendTarget === 'party1' || resendTarget === 'both') && resendContract.party1) {
      recipients.push({ customer: resendContract.party1, role: resendContract.party1Role || 'طرف اول' });
    }
    if ((resendTarget === 'party2' || resendTarget === 'both') && resendContract.party2) {
      recipients.push({ customer: resendContract.party2, role: resendContract.party2Role || 'طرف دوم' });
    }

    if (recipients.length === 0) {
      toast.error('هیچ مخاطبی برای ارسال انتخاب نشده است', { id: toastId });
      setIsResending(false);
      return;
    }

    let successCount = 0;

    for (const { customer } of recipients) {
      const activePlatforms = [];
      if ((resendPlatform === 'all' || resendPlatform === 'telegram') && settings?.telegramToken && (customer.phone)) {
        activePlatforms.push({ name: 'telegram', token: settings.telegramToken, id: customer.phone });
      }
      if ((resendPlatform === 'all' || resendPlatform === 'bale') && settings?.baleToken && (customer.phone)) {
        activePlatforms.push({ name: 'bale', token: settings.baleToken, id: customer.phone });
      }
      if ((resendPlatform === 'all' || resendPlatform === 'rubika') && settings?.rubikaToken && (customer.phone)) {
        activePlatforms.push({ name: 'rubika', token: settings.rubikaToken, id: customer.phone });
      }

      for (const p of activePlatforms) {
        const cleanChatId = toEnglishDigits(p.id).trim();
        try {
          const res = await axios.post('/api/send-message', {
            platform: p.name,
            token: p.token,
            chatId: cleanChatId,
            message: resendMessageText
          });
          if (res.data?.success) {
            await db.messageLogs.add({
              date: Date.now(),
              customerName: customer.fullName,
              phone: customer.phone,
              messenger: p.name,
              message: resendMessageText,
              status: 'sent',
              chatId: cleanChatId
            } as any);
            successCount++;
          } else {
            await db.messageLogs.add({
              date: Date.now(),
              customerName: customer.fullName,
              phone: customer.phone,
              messenger: p.name,
              message: resendMessageText,
              status: 'failed',
              chatId: cleanChatId
            } as any);
          }
        } catch (err) {
          await db.messageLogs.add({
            date: Date.now(),
            customerName: customer.fullName,
            phone: customer.phone,
            messenger: p.name,
            message: resendMessageText,
            status: 'failed',
            chatId: cleanChatId
          } as any);
        }
      }
    }

    setIsResending(false);
    toast.dismiss(toastId);
    if (successCount > 0) {
      toast.success(`فاکتور چاپ مجدد با موفقیت برای ${toPersianDigits(successCount)} پیام‌رسان ارسال شد.`);
      setResendModalOpen(false);
    } else {
      toast.error('ارسال پیام با خطا مواجه شد. لطفاً توکن پیام‌رسان‌ها و آیدی مخاطبان را بررسی فرمایید.');
    }
  };

  // Open Contract Renewal Modal
  const handleOpenRenewalModal = (contract: Contract) => {
    setRenewalContract(contract);
    const startD = contract.endDate || moment().format('jYYYY/jMM/jDD');
    const endD = moment(startD, 'jYYYY/jMM/jDD').add(1, 'jYear').format('jYYYY/jMM/jDD');
    setRenewalStartDate(startD);
    setRenewalEndDate(endD);
    setRenewalPrice(contract.price || 0);
    setRenewalRent(contract.rent || 0);
    setRenewalRentDueDay(contract.rentDueDay || 1);
    setRenewalModalOpen(true);
  };

  const executeRenewal = async () => {
    if (!renewalContract || !renewalContract.id) return;

    try {
      const updatedCount = (renewalContract.renewedCount || 0) + 1;
      let commission = 0;
      if (renewalContract.type === 'sale') {
        commission = (renewalPrice * (settings?.commissionRate || 1)) / 100;
      } else {
        const equivalentRent = renewalRent + (renewalPrice * 0.03);
        commission = equivalentRent * 0.25;
      }
      const tax = (commission * (settings?.taxRate || 9)) / 100;
      const totalPayable = commission + tax;

      await db.contracts.update(renewalContract.id, {
        date: renewalStartDate,
        renewalDate: renewalStartDate,
        endDate: renewalEndDate,
        renewedCount: updatedCount,
        status: 'renewed',
        price: renewalPrice,
        rent: renewalRent,
        rentDueDay: renewalRentDueDay,
        commission,
        tax,
        totalPayable
      });

      // Update tenant in customers table so auto-messages run for the renewed year
      const tenant = (renewalContract.party1Role === 'مستأجر' ? renewalContract.party1 : renewalContract.party2) || renewalContract.party2;
      if (tenant?.id) {
        await db.customers.update(tenant.id, {
          contractStartDate: renewalStartDate,
          contractEndDate: renewalEndDate,
          rentDueDay: renewalRentDueDay
        });
      }

      toast.success(`قرارداد برای ۱ سال تمدید شد (تا تاریخ ${toPersianDigits(renewalEndDate)}). یادآورهای هوشمند مجدداً فعال شدند.`);
      setRenewalModalOpen(false);
    } catch (err) {
      toast.error('خطا در ثبت تمدید قرارداد');
    }
  };

  const generatePDF = async () => {
    const element = document.getElementById('invoice-print-area');
    if (!element) return;
    
    toast.loading('در حال تولید و ارسال PDF...', { id: 'pdf' });
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${contractData.contractNumber}.pdf`);

      toast.success('فایل PDF با موفقیت تولید شد', { id: 'pdf' });
    } catch (err) {
      toast.error('خطا در تولید PDF', { id: 'pdf' });
    }
  };

  const processPOS1 = () => {
    toast.loading('در حال ارسال به دستگاه کارتخوان طرف اول...', { id: 'pos1' });
    setTimeout(() => {
      setContractData({ ...contractData, party1PosStatus: 'success', party1PosReceipt: Math.floor(Math.random() * 100000000).toString() });
      toast.success('تراکنش طرف اول با موفقیت انجام شد', { id: 'pos1' });
    }, 2000);
  };

  const processPOS2 = () => {
    toast.loading('در حال ارسال به دستگاه کارتخوان طرف دوم...', { id: 'pos2' });
    setTimeout(() => {
      setContractData({ ...contractData, party2PosStatus: 'success', party2PosReceipt: Math.floor(Math.random() * 100000000).toString() });
      toast.success('تراکنش طرف دوم با موفقیت انجام شد', { id: 'pos2' });
    }, 2000);
  };

  const handleDeleteContract = async (id: number) => {
    if (window.confirm('آیا از حذف این قرارداد و فاکتور اطمینان دارید؟')) {
      await db.contracts.delete(id);
      toast.success('قرارداد با موفقیت حذف شد');
      if (contractData.id === id) {
        setShowInvoice(false);
      }
    }
  };

  const resetForm = () => {
    setShowInvoice(false);
    setIsReprintMode(false);
    setStep(1);
    setSearch1('');
    setSearch2('');
    const tDate = moment().format('jYYYY/jMM/jDD');
    setContractData({
      ...initialContractState,
      contractNumber: '',
      date: tDate,
      endDate: getOneYearLaterJalali(tDate)
    });
  };

  // Filtered contracts for list view
  const filteredContracts = (contracts || []).filter(c => {
    // Type filter
    if (listFilter === 'rent' && c.type !== 'rent') return false;
    if (listFilter === 'sale' && c.type !== 'sale') return false;
    if (listFilter === 'cheque' && c.party1PaymentMethod !== 'cheque' && c.party2PaymentMethod !== 'cheque') return false;

    // Search query
    if (!listSearch.trim()) return true;
    const query = normalizeSearchQuery(listSearch);
    const contractNum = normalizeSearchQuery(c.contractNumber);
    const party1Name = normalizeSearchQuery(c.party1?.fullName);
    const party2Name = normalizeSearchQuery(c.party2?.fullName);
    const party1Phone = normalizeSearchQuery(c.party1?.phone);
    const party2Phone = normalizeSearchQuery(c.party2?.phone);
    const party1National = normalizeSearchQuery(c.party1?.nationalId);
    const party2National = normalizeSearchQuery(c.party2?.nationalId);
    const party1Cheque = normalizeSearchQuery(c.party1ChequeDate);
    const party2Cheque = normalizeSearchQuery(c.party2ChequeDate);

    return (
      contractNum.includes(query) ||
      party1Name.includes(query) ||
      party2Name.includes(query) ||
      party1Phone.includes(query) ||
      party2Phone.includes(query) ||
      party1National.includes(query) ||
      party2National.includes(query) ||
      party1Cheque.includes(query) ||
      party2Cheque.includes(query)
    );
  });

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">منوی قرارداد و فاکتورها</h2>
          <p className="text-xs text-slate-500 mt-1">مدیریت قراردادها، استعلام موعد چک، فاکتورهای بیم موجر و مستأجر</p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-sm font-bold">
          <button
            onClick={() => {
              setActiveTab('new');
              if (!showInvoice) setStep(1);
            }}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'new'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus size={16} />
            <span>صدور قرارداد / فاکتور جدید</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('list');
              setShowInvoice(false);
            }}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'list'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={16} />
            <span>لیست قراردادها و فاکتورها</span>
            <span className="font-mono text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
              {toPersianDigits(contracts?.length || 0)}
            </span>
          </button>
        </div>
      </div>

      {/* VIEW: CONTRACTS LIST (لیست قراردادها با نمایش موعد چک و تاریخ انجام) */}
      {activeTab === 'list' && !showInvoice && (
        <div className="space-y-6 animate-in fade-in">
          {/* Controls: Search & Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجوی شماره، نام، کد ملی، موعد چک..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setListFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  listFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                همه ({toPersianDigits(contracts?.length || 0)})
              </button>
              <button
                onClick={() => setListFilter('rent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  listFilter === 'rent' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                رهن و اجاره ({toPersianDigits(contracts?.filter(c => c.type === 'rent').length || 0)})
              </button>
              <button
                onClick={() => setListFilter('sale')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  listFilter === 'sale' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                خرید و فروش ({toPersianDigits(contracts?.filter(c => c.type === 'sale').length || 0)})
              </button>
              <button
                onClick={() => setListFilter('cheque')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                  listFilter === 'cheque' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <CreditCard size={14} className="text-amber-600" />
                <span>دارای پرداخت با چک ({toPersianDigits(contracts?.filter(c => c.party1PaymentMethod === 'cheque' || c.party2PaymentMethod === 'cheque').length || 0)})</span>
              </button>
            </div>
          </div>

          {/* Contracts Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="p-4 font-bold">شماره قرارداد</th>
                    <th className="p-4 font-bold">نوع معامله</th>
                    <th className="p-4 font-bold">طرفین قرارداد</th>
                    <th className="p-4 font-bold">تاریخ و اعتبار ۱ ساله</th>
                    <th className="p-4 font-bold">وضعیت پرداخت و چک</th>
                    <th className="p-4 font-bold">مبلغ کل / کمیسیون</th>
                    <th className="p-4 font-bold text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        هیچ قراردادی مطابق با جستجو یا فیلتر یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((c) => {
                      const hasCheque = c.party1PaymentMethod === 'cheque' || c.party2PaymentMethod === 'cheque';
                      const isExpired = c.endDate ? moment().isAfter(moment(c.endDate, 'jYYYY/jMM/jDD'), 'day') : false;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* شماره قرارداد با فرمت فارسی */}
                          <td className="p-4 font-mono font-bold text-slate-800">
                            {toPersianDigits(c.contractNumber)}
                          </td>

                          {/* نوع معامله */}
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              c.type === 'rent'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {c.type === 'rent' ? 'رهن و اجاره (موجر/مستأجر)' : 'خرید و فروش'}
                            </span>
                          </td>

                          {/* طرفین قرارداد */}
                          <td className="p-4">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-800 text-xs">
                                <span className="text-slate-500 font-normal">{c.party1Role || 'طرف ۱'}:</span> {c.party1?.fullName || '-'}
                              </p>
                              <p className="font-bold text-slate-800 text-xs">
                                <span className="text-slate-500 font-normal">{c.party2Role || 'طرف ۲'}:</span> {c.party2?.fullName || '-'}
                              </p>
                            </div>
                          </td>

                          {/* تاریخ انجام قرارداد و اعتبار ۱ ساله */}
                          <td className="p-4 text-xs">
                            <div className="flex items-center gap-1.5 font-mono text-slate-800 font-bold">
                              <Calendar size={14} className="text-emerald-600" />
                              <span>انعقاد: {toPersianDigits(c.date)}</span>
                            </div>
                            {c.endDate && (
                              <div className="text-[11px] text-slate-600 mt-0.5 font-mono">
                                اتمام (۱ ساله): {toPersianDigits(c.endDate)}
                              </div>
                            )}
                            {c.status === 'renewed' && (
                              <span className="inline-block mt-1 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-bold">
                                تمدید دور {toPersianDigits(c.renewedCount || 1)}
                              </span>
                            )}
                            {c.type === 'rent' && c.rentDueDay && (
                              <div className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-medium mt-1">
                                موعد اجاره: روز {toPersianDigits(c.rentDueDay)} ماه
                              </div>
                            )}
                            {isExpired && (
                              <div className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold mt-1">
                                پایان اعتبار ۱ ساله (نیاز به تمدید)
                              </div>
                            )}
                          </td>

                          {/* وضعیت پرداخت و سررسید چک */}
                          <td className="p-4">
                            {hasCheque ? (
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-300 font-bold text-xs">
                                  <CreditCard size={14} className="text-amber-600" />
                                  <span>پرداخت با چک صیادی / نسیه</span>
                                </div>
                                <div className="text-[11px] text-amber-900 bg-amber-50/50 p-1.5 rounded border border-amber-100">
                                  {c.party1PaymentMethod === 'cheque' && (
                                    <p>
                                      <strong>سررسید چک {c.party1Role}:</strong>{' '}
                                      <span className="font-mono font-bold">{toPersianDigits(c.party1ChequeDate) || 'ثبت نشده'}</span>
                                    </p>
                                  )}
                                  {c.party2PaymentMethod === 'cheque' && (
                                    <p>
                                      <strong>سررسید چک {c.party2Role}:</strong>{' '}
                                      <span className="font-mono font-bold">{toPersianDigits(c.party2ChequeDate) || 'ثبت نشده'}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-600 space-y-0.5">
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                                  {c.party1PaymentMethod === 'pos' ? 'کارتخوان' : c.party1PaymentMethod === 'transfer' ? 'انتقال وجه' : 'نقدی'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* مبلغ و کمیسیون */}
                          <td className="p-4 font-mono font-bold text-emerald-700 text-xs">
                            <div>کل: {formatCurrency(c.totalPayable || 0)}</div>
                            <div className="text-slate-400 text-[11px] font-normal">کمیسیون: {formatCurrency(c.commission || 0)}</div>
                          </td>

                          {/* عملیات */}
                          <td className="p-4 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              <button
                                onClick={() => openInvoiceForContract(c, false)}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-emerald-200 shadow-xs"
                                title="مشاهده فاکتور"
                              >
                                <Eye size={14} />
                                <span>فاکتور</span>
                              </button>
                              <button
                                onClick={() => handleOpenResendModal(c)}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-blue-200 shadow-xs"
                                title="ارسال مجدد فاکتور به پیام‌رسان‌ها (با ذکر چاپ مجدد)"
                              >
                                <Send size={14} />
                                <span>ارسال مجدد</span>
                              </button>
                              {c.type === 'rent' && (
                                <button
                                  onClick={() => handleOpenRenewalModal(c)}
                                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-purple-200 shadow-xs"
                                  title="تمدید قرارداد ۱ ساله و فعال‌سازی مجدد پیام‌های خودکار"
                                >
                                  <RotateCw size={14} />
                                  <span>تمدید ۱ ساله</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteContract(c.id!)}
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                title="حذف قرارداد"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: NEW CONTRACT WIZARD OR INVOICE PREVIEW */}
      {(activeTab === 'new' || showInvoice) && (
        <>
          {!showInvoice ? (
            <div className="space-y-6">
              {/* Progress Steps */}
              <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className={`flex flex-col items-center ${step >= 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 font-mono ${step >= 1 ? 'bg-emerald-100' : 'bg-slate-100'}`}>{toPersianDigits(1)}</div>
                  <span className="text-xs">طرفین و تاریخ</span>
                </div>
                <div className="flex-1 h-1 bg-slate-100 mx-2"><div className={`h-full bg-emerald-600 transition-all ${step >= 2 ? 'w-full' : 'w-0'}`}></div></div>
                <div className={`flex flex-col items-center ${step >= 2 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 font-mono ${step >= 2 ? 'bg-emerald-100' : 'bg-slate-100'}`}>{toPersianDigits(2)}</div>
                  <span className="text-xs">مبالغ و کمیسیون</span>
                </div>
                <div className="flex-1 h-1 bg-slate-100 mx-2"><div className={`h-full bg-emerald-600 transition-all ${step >= 3 ? 'w-full' : 'w-0'}`}></div></div>
                <div className={`flex flex-col items-center ${step >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 font-mono ${step >= 3 ? 'bg-emerald-100' : 'bg-slate-100'}`}>{toPersianDigits(3)}</div>
                  <span className="text-xs text-center leading-tight">پرداخت {contractData.party1Role || 'طرف ۱'}</span>
                </div>
                <div className="flex-1 h-1 bg-slate-100 mx-2"><div className={`h-full bg-emerald-600 transition-all ${step >= 4 ? 'w-full' : 'w-0'}`}></div></div>
                <div className={`flex flex-col items-center ${step >= 4 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 font-mono ${step >= 4 ? 'bg-emerald-100' : 'bg-slate-100'}`}>{toPersianDigits(4)}</div>
                  <span className="text-xs text-center leading-tight">پرداخت {contractData.party2Role || 'طرف ۲'}</span>
                </div>
              </div>

              {/* Form Area */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                
                {step === 1 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                    
                    <div className="mb-6 pb-6 border-b border-slate-100 max-w-md">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">شماره قرارداد</label>
                      <input 
                        type="tel" inputMode="numeric"
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-left font-mono text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={toPersianDigits(contractData.contractNumber || '')}
                        onChange={(e) => setContractData({...contractData, contractNumber: toEnglishDigits(e.target.value).replace(/\D/g, '')})}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* طرف اول */}
                      <div className="space-y-4">
                        <h3 className="font-bold border-b border-slate-100 pb-2 text-slate-700 flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                          طرف اول
                        </h3>
                        <div className="relative">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">جستجوی مشتری (نام، کد ملی یا شماره)</label>
                          <input 
                            type="text" 
                            placeholder="نام، کد ملی یا شماره..." 
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={search1}
                            onChange={(e) => setSearch1(e.target.value)}
                          />
                          {search1 && customers && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-40 overflow-y-auto">
                              {customers.filter(c => 
                                normalizeSearchQuery(c.fullName).includes(normalizeSearchQuery(search1)) ||
                                normalizeSearchQuery(c.phone).includes(normalizeSearchQuery(search1)) ||
                                normalizeSearchQuery(c.nationalId).includes(normalizeSearchQuery(search1))
                              ).map(c => (
                                <div 
                                  key={c.id} 
                                  className="p-2 hover:bg-slate-50 cursor-pointer text-sm flex justify-between items-center"
                                  onClick={() => {
                                    if (contractData.party2?.id === c.id) {
                                      toast.error('نمی‌توانید یک شخص را برای هر دو طرف قرارداد انتخاب کنید');
                                      return;
                                    }
                                    setContractData({...contractData, party1: c});
                                    setSearch1('');
                                  }}
                                >
                                  <span>{c.fullName}</span>
                                  <span className="font-mono text-xs text-slate-500">{toPersianDigits(c.phone)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {contractData.party1 && (
                          <div className="space-y-4 animate-in fade-in zoom-in-95">
                            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 flex items-center justify-between">
                              <div>
                                <p className="font-bold">{contractData.party1.fullName}</p>
                                <p className="text-sm font-mono mt-0.5">{toPersianDigits(contractData.party1.nationalId)} | {toPersianDigits(contractData.party1.phone)}</p>
                              </div>
                              <CheckCircle2 size={24} className="text-emerald-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">سمت در قرارداد</label>
                              <select 
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={contractData.party1Role || ''}
                                onChange={(e) => {
                                  const r1 = e.target.value;
                                  let r2 = contractData.party2Role;
                                  if (r1 === 'خریدار') r2 = 'فروشنده';
                                  if (r1 === 'فروشنده') r2 = 'خریدار';
                                  if (r1 === 'موجر') r2 = 'مستأجر';
                                  if (r1 === 'مستأجر') r2 = 'موجر';
                                  setContractData({
                                    ...contractData, 
                                    party1Role: r1, 
                                    party2Role: r2, 
                                    type: (r1==='موجر' || r1==='مستأجر') ? 'rent' : 'sale'
                                  });
                                }}
                              >
                                <option value="موجر">موجر</option>
                                <option value="مستأجر">مستأجر</option>
                                <option value="خریدار">خریدار</option>
                                <option value="فروشنده">فروشنده</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* طرف دوم */}
                      <div className="space-y-4">
                        <h3 className="font-bold border-b border-slate-100 pb-2 text-slate-700 flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                          طرف دوم
                        </h3>
                        <div className="relative">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">جستجوی مشتری (نام، کد ملی یا شماره)</label>
                          <input 
                            type="text" 
                            placeholder="نام، کد ملی یا شماره..." 
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={search2}
                            onChange={(e) => setSearch2(e.target.value)}
                          />
                          {search2 && customers && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-40 overflow-y-auto">
                              {customers.filter(c => 
                                normalizeSearchQuery(c.fullName).includes(normalizeSearchQuery(search2)) ||
                                normalizeSearchQuery(c.phone).includes(normalizeSearchQuery(search2)) ||
                                normalizeSearchQuery(c.nationalId).includes(normalizeSearchQuery(search2))
                              ).map(c => (
                                <div 
                                  key={c.id} 
                                  className="p-2 hover:bg-slate-50 cursor-pointer text-sm flex justify-between items-center"
                                  onClick={() => {
                                    if (contractData.party1?.id === c.id) {
                                      toast.error('نمی‌توانید یک شخص را برای هر دو طرف قرارداد انتخاب کنید');
                                      return;
                                    }
                                    setContractData({...contractData, party2: c});
                                    setSearch2('');
                                  }}
                                >
                                  <span>{c.fullName}</span>
                                  <span className="font-mono text-xs text-slate-500">{toPersianDigits(c.phone)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {contractData.party2 && (
                          <div className="space-y-4 animate-in fade-in zoom-in-95">
                            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 flex items-center justify-between">
                              <div>
                                <p className="font-bold">{contractData.party2.fullName}</p>
                                <p className="text-sm font-mono mt-0.5">{toPersianDigits(contractData.party2.nationalId)} | {toPersianDigits(contractData.party2.phone)}</p>
                              </div>
                              <CheckCircle2 size={24} className="text-emerald-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">سمت در قرارداد</label>
                              <select 
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={contractData.party2Role || ''}
                                onChange={(e) => setContractData({...contractData, party2Role: e.target.value})}
                              >
                                <option value="مستأجر">مستأجر</option>
                                <option value="موجر">موجر</option>
                                <option value="خریدار">خریدار</option>
                                <option value="فروشنده">فروشنده</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 p-4 bg-white border-t border-slate-100 flex justify-end rounded-b-xl z-10 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
                      <button 
                        onClick={() => setStep(2)} 
                        disabled={!contractData.party1 || !contractData.party2} 
                        className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold disabled:opacity-50 hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        مرحله بعد
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {contractData.type === 'sale' ? 'مبلغ ثمن معامله (تومان)' : 'مبلغ ودیعه / رهن (تومان)'}
                        </label>
                        <input 
                          type="number" 
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-left font-mono text-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={contractData.price || ''}
                          onChange={(e) => setContractData({...contractData, price: Number(e.target.value)})}
                        />
                        <p className="text-xs mt-1 text-slate-500 font-mono">
                          {formatCurrency(contractData.price || 0)} ({numberToWords(contractData.price || 0)} تومان)
                        </p>
                      </div>
                      
                      {contractData.type === 'rent' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">اجاره ماهیانه (تومان)</label>
                          <input 
                            type="number" 
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-left font-mono text-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={contractData.rent || ''}
                            onChange={(e) => setContractData({...contractData, rent: Number(e.target.value)})}
                          />
                          <p className="text-xs mt-1 text-slate-500 font-mono">
                            {formatCurrency(contractData.rent || 0)} ({numberToWords(contractData.rent || 0)} تومان)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* قرارگیری تاریخ انجام قرارداد دقیقاً بعد از ورود مبالغ */}
                    <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                        <CalendarCheck size={18} className="text-emerald-600" />
                        <span>
                          {contractData.type === 'rent' || (contractData.party1Role === 'موجر' || contractData.party2Role === 'موجر' || contractData.party1Role === 'مستأجر' || contractData.party2Role === 'مستأجر')
                            ? 'تاریخ انجام و انعقاد قرارداد بین موجر و مستأجر'
                            : 'تاریخ انجام و انعقاد قرارداد بین طرفین'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        تاریخ انجام قرارداد را مشخص فرمایید؛ طبق قانون و ضوابط سامانه، تاریخ اتمام قرارداد به صورت خودکار دقیقاً ۱ سال بعد در نظر گرفته می‌شود:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">تاریخ انعقاد قرارداد</label>
                          <DatePicker 
                            calendar={persian}
                            locale={persian_fa}
                            format="YYYY/MM/DD"
                            value={contractData.date || ""}
                            onChange={(dateObject) => {
                              const newDate = dateObject ? dateObject.format() : '';
                              const oneYearLater = newDate ? getOneYearLaterJalali(newDate) : '';
                              setContractData(prev => ({
                                ...prev,
                                date: newDate,
                                endDate: oneYearLater
                              }));
                            }}
                            inputClass="w-full border border-slate-200 rounded-lg p-2.5 text-left font-mono text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="انتخاب تاریخ انجام قرارداد"
                          />
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-emerald-100 flex flex-col justify-center">
                          <label className="text-xs font-bold text-slate-500 mb-1">تاریخ اتمام قرارداد:</label>
                          <DatePicker
                            calendar={persian}
                            locale={persian_fa}
                            calendarPosition="bottom-right"
                            value={contractData.endDate}
                            onChange={(dateObject: any) => {
                              const newDate = dateObject ? dateObject.format() : '';
                              setContractData(prev => ({ ...prev, endDate: newDate }));
                            }}
                            inputClass="w-full border-none p-0 text-sm font-bold text-emerald-700 font-mono bg-transparent focus:ring-0 outline-none"
                            placeholder="انتخاب تاریخ اتمام"
                          />
                        </div>
                      </div>

                      {/* فیلد موعد پرداخت اجاره بها برای رهن و اجاره */}
                      {contractData.type === 'rent' && (
                        <div className="mt-3 pt-3 border-t border-emerald-200/60">
                          <label className="block text-xs font-bold text-emerald-900 mb-1.5">
                            روز موعد پرداخت اجاره بها در هر ماه (ارسال پیام ۱ روز قبل):
                          </label>
                          <select
                            className="w-full max-w-sm border border-emerald-300 rounded-lg p-2.5 text-sm bg-white font-mono text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={contractData.rentDueDay || 1}
                            onChange={(e) => setContractData(prev => ({ ...prev, rentDueDay: Number(e.target.value) }))}
                          >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <option key={day} value={day}>
                                روز {toPersianDigits(day)} هر ماه (پیام یادآوری ۱ روز قبل ارسال می‌شود)
                              </option>
                            ))}
                          </select>
                          <p className="text-[11px] text-emerald-800 mt-1.5">
                            نرم‌افزار در هر ماه یک روز مانده به این موعد، پیام یادآوری را به صورت خودکار تا اتمام مدت ۱ ساله قرارداد ارسال خواهد کرد.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 p-4 bg-white border-t border-slate-100 flex justify-between rounded-b-xl z-10 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
                      <button onClick={() => setStep(1)} className="border border-slate-200 text-slate-600 px-6 py-2.5 rounded-lg hover:bg-slate-50 font-bold transition-colors">مرحله قبل</button>
                      <button onClick={calculateTotal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold transition-colors shadow-sm shadow-emerald-600/20">
                        <Calculator size={20} /> محاسبه کمیسیون و ادامه
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-3 text-sm">
                        <span className="text-slate-600">حق کمیسیون کل مشاور املاک:</span>
                        <span className="font-bold text-slate-800 font-mono">{formatCurrency(contractData.commission || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-3 text-sm">
                        <span className="text-slate-600">مالیات بر ارزش افزوده ({toPersianDigits(settings?.taxRate || 9)}٪):</span>
                        <span className="font-bold text-slate-800 font-mono">{formatCurrency(contractData.tax || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg border-t border-slate-200 mt-4 pt-4 text-emerald-700">
                        <span className="font-bold">سهم پرداخت {contractData.party1Role} ({contractData.party1?.fullName}):</span>
                        <span className="font-bold font-mono">{formatCurrency((contractData.totalPayable || 0) / 2)}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">روش پرداخت - {contractData.party1?.fullName || 'طرف اول'}</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { id: 'cash', label: 'نقدی' },
                          { id: 'pos', label: 'کارتخوان' },
                          { id: 'transfer', label: 'انتقال وجه' },
                          { id: 'cheque', label: 'چک صیادی / نسیه' }
                        ].map((m) => (
                          <button 
                            key={m.id}
                            onClick={() => setContractData({...contractData, party1PaymentMethod: m.id as any})}
                            className={`p-3 rounded-xl border-2 text-center transition-all font-bold flex items-center justify-center gap-1.5 ${
                              contractData.party1PaymentMethod === m.id 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-sm' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {m.id === 'cheque' && <CreditCard size={16} className="text-amber-600" />}
                            <span>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {contractData.party1PaymentMethod === 'pos' && (
                      <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 text-slate-700">
                        <p className="mb-4 font-medium text-slate-600">ارسال مبلغ به دستگاه کارتخوان متصل...</p>
                        <button onClick={processPOS1} disabled={contractData.party1PosStatus === 'success'} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors">
                          {contractData.party1PosStatus === 'success' ? <><CheckCircle2 size={20} className="text-emerald-400" /> پرداخت شد</> : 'ارسال به POS'}
                        </button>
                      </div>
                    )}

                    {(contractData.party1PaymentMethod === 'transfer' || contractData.party1PaymentMethod === 'cheque') && (
                      <div className="p-5 border border-emerald-200 rounded-xl bg-emerald-50 text-emerald-800 space-y-3">
                        <p className="font-bold border-b border-emerald-200 pb-2 mb-2 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>اطلاعات حساب بانکی جهت واریز:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div><span className="text-emerald-600/70">صاحب حساب:</span> <strong>{settings?.accountHolderName || '-'}</strong></div>
                          <div><span className="text-emerald-600/70">شماره حساب:</span> <strong className="font-mono">{toPersianDigits(settings?.accountNumber) || '-'}</strong></div>
                          <div><span className="text-emerald-600/70">شماره کارت:</span> <strong className="font-mono text-left block" dir="ltr">{toPersianDigits(settings?.cardNumber) || '-'}</strong></div>
                          <div><span className="text-emerald-600/70">شماره شبا:</span> <strong className="font-mono text-left block" dir="ltr">{toPersianDigits(settings?.shebaNumber) || '-'}</strong></div>
                        </div>
                      </div>
                    )}

                    {/* فیلد تاریخ سررسید چک */}
                    {contractData.party1PaymentMethod === 'cheque' && (
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                        <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                          <CreditCard size={18} className="text-amber-600" />
                          <span>ثبت تاریخ سررسید چک برای فاکتور {contractData.party1Role}</span>
                        </div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">تاریخ موعد چک / سررسید پرداخت</label>
                        <DatePicker 
                          calendar={persian}
                          locale={persian_fa}
                          format="YYYY/MM/DD"
                          value={contractData.party1ChequeDate || ""}
                          onChange={(dateObject) => setContractData({...contractData, party1ChequeDate: dateObject ? dateObject.format() : ''})}
                          inputClass="w-full md:w-1/2 border border-slate-200 rounded-lg p-2.5 text-left font-mono text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                          placeholder="1404/02/15"
                        />
                        <p className="text-[11px] text-amber-700">تاریخ سررسید چک در فاکتور و منوی قراردادها ثبت و نمایش داده می‌شود.</p>
                      </div>
                    )}

                    <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 p-4 bg-white border-t border-slate-100 flex justify-between rounded-b-xl z-10 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
                      <button onClick={() => setStep(2)} className="border border-slate-200 text-slate-600 px-6 py-2.5 rounded-lg hover:bg-slate-50 font-bold transition-colors">مرحله قبل</button>
                      <button onClick={() => setStep(4)} disabled={contractData.party1PaymentMethod === 'pos' && contractData.party1PosStatus !== 'success'} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold disabled:opacity-50 hover:bg-emerald-700 transition-colors shadow-sm">
                        ادامه (پرداخت طرف دوم)
                      </button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center text-lg text-emerald-700">
                        <span className="font-bold">سهم پرداخت {contractData.party2Role} ({contractData.party2?.fullName}):</span>
                        <span className="font-bold font-mono">{formatCurrency((contractData.totalPayable || 0) / 2)}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">روش پرداخت - {contractData.party2?.fullName || 'طرف دوم'}</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { id: 'cash', label: 'نقدی' },
                          { id: 'pos', label: 'کارتخوان' },
                          { id: 'transfer', label: 'انتقال وجه' },
                          { id: 'cheque', label: 'چک صیادی / نسیه' }
                        ].map((m) => (
                          <button 
                            key={m.id}
                            onClick={() => setContractData({...contractData, party2PaymentMethod: m.id as any})}
                            className={`p-3 rounded-xl border-2 text-center transition-all font-bold flex items-center justify-center gap-1.5 ${
                              contractData.party2PaymentMethod === m.id 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-sm' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {m.id === 'cheque' && <CreditCard size={16} className="text-amber-600" />}
                            <span>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {contractData.party2PaymentMethod === 'pos' && (
                      <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 text-slate-700">
                        <p className="mb-4 font-medium text-slate-600">ارسال مبلغ به دستگاه کارتخوان متصل...</p>
                        <button onClick={processPOS2} disabled={contractData.party2PosStatus === 'success'} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors">
                          {contractData.party2PosStatus === 'success' ? <><CheckCircle2 size={20} className="text-emerald-400" /> پرداخت شد</> : 'ارسال به POS'}
                        </button>
                      </div>
                    )}

                    {(contractData.party2PaymentMethod === 'transfer' || contractData.party2PaymentMethod === 'cheque') && (
                      <div className="p-5 border border-emerald-200 rounded-xl bg-emerald-50 text-emerald-800 space-y-3">
                        <p className="font-bold border-b border-emerald-200 pb-2 mb-2 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>اطلاعات حساب بانکی جهت واریز:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div><span className="text-emerald-600/70">صاحب حساب:</span> <strong>{settings?.accountHolderName || '-'}</strong></div>
                          <div><span className="text-emerald-600/70">شماره حساب:</span> <strong className="font-mono">{toPersianDigits(settings?.accountNumber) || '-'}</strong></div>
                          <div><span className="text-emerald-600/70">شماره کارت:</span> <strong className="font-mono text-left block" dir="ltr">{toPersianDigits(settings?.cardNumber) || '-'}</strong></div>
                          <div><span className="text-emerald-600/70">شماره شبا:</span> <strong className="font-mono text-left block" dir="ltr">{toPersianDigits(settings?.shebaNumber) || '-'}</strong></div>
                        </div>
                      </div>
                    )}

                    {/* فیلد تاریخ سررسید چک */}
                    {contractData.party2PaymentMethod === 'cheque' && (
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                        <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                          <CreditCard size={18} className="text-amber-600" />
                          <span>ثبت تاریخ سررسید چک برای فاکتور {contractData.party2Role}</span>
                        </div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">تاریخ موعد چک / سررسید پرداخت</label>
                        <DatePicker 
                          calendar={persian}
                          locale={persian_fa}
                          format="YYYY/MM/DD"
                          value={contractData.party2ChequeDate || ""}
                          onChange={(dateObject) => setContractData({...contractData, party2ChequeDate: dateObject ? dateObject.format() : ''})}
                          inputClass="w-full md:w-1/2 border border-slate-200 rounded-lg p-2.5 text-left font-mono text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                          placeholder="1404/02/15"
                        />
                        <p className="text-[11px] text-amber-700">تاریخ سررسید چک در فاکتور و منوی قراردادها ثبت و نمایش داده می‌شود.</p>
                      </div>
                    )}

                    <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 p-4 bg-white border-t border-slate-100 flex justify-between rounded-b-xl z-10 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
                      <button onClick={() => setStep(3)} className="border border-slate-200 text-slate-600 px-6 py-2.5 rounded-lg hover:bg-slate-50 font-bold transition-colors">مرحله قبل</button>
                      <button onClick={handleSave} disabled={contractData.party2PaymentMethod === 'pos' && contractData.party2PosStatus !== 'success'} className="bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 text-white px-8 py-2.5 rounded-lg flex items-center gap-2 font-bold transition-colors">
                        <Save size={20} /> ثبت نهایی و صدور فاکتور
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Invoice Print View */
            <div className="space-y-4 animate-in zoom-in-95">
              <div className="flex flex-col gap-3 print-hide mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button onClick={() => { setPrintTarget('party1'); setTimeout(() => window.print(), 100); }} className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm font-bold transition-colors text-sm">
                    <Printer size={18}/> فاکتور {contractData.party1Role}
                  </button>
                  <button onClick={() => { setPrintTarget('party2'); setTimeout(() => window.print(), 100); }} className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm font-bold transition-colors text-sm">
                    <Printer size={18}/> فاکتور {contractData.party2Role}
                  </button>
                  <button onClick={() => { setPrintTarget('both'); setTimeout(() => window.print(), 100); }} className="bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm font-bold transition-colors text-sm">
                    <Printer size={18}/> یکپارچه (هردو)
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={generatePDF} className="flex-1 bg-slate-700 hover:bg-slate-800 text-white py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm font-bold transition-colors">
                    <Download size={20}/> دانلود PDF
                  </button>
                  <button 
                    onClick={() => handleOpenResendModal(contractData)} 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm font-bold transition-colors"
                  >
                    <Send size={18} />
                    <span>ارسال (چاپ مجدد)</span>
                  </button>
                  <button 
                    onClick={() => setIsReprintMode(!isReprintMode)} 
                    className={`px-4 py-3 rounded-xl border font-bold flex items-center gap-2 transition-colors ${
                      isReprintMode 
                        ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <RotateCw size={16} />
                    <span>{isReprintMode ? 'چاپ مجدد: فعال' : 'برچسب'}</span>
                  </button>
                </div>
              </div>

              <div 
                id="invoice-print-area" 
                className={`bg-white rounded-xl shadow-sm border border-slate-200 text-slate-900 mx-auto ${
                  settings?.paperSize === '57mm' 
                    ? 'max-w-[57mm] p-2 text-[10px]' 
                    : settings?.paperSize === '80mm' 
                      ? 'max-w-[80mm] p-3 text-xs' 
                      : settings?.paperSize === 'a5' 
                        ? 'max-w-xl p-6 text-sm' 
                        : 'max-w-3xl p-8'
                }`} 
                style={{ direction: 'rtl' }}
              >
                {/* برچسب نسخه چاپ مجدد / فاکتور المثنی */}
                {isReprintMode && (
                  <div className="mb-4 p-2 bg-amber-50 text-amber-900 border-2 border-dashed border-amber-300 rounded-lg text-center font-bold text-xs flex items-center justify-center gap-1.5">
                    <span>⚠️ نسخه چاپ مجدد / فاکتور المثنی</span>
                  </div>
                )}

                {/* Modern Layout */}
                {settings?.invoiceLayout === 'modern' ? (
                  <div className="bg-emerald-50 -mx-8 -mt-8 p-8 mb-6 rounded-t-xl border-b border-emerald-100 flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                      {settings?.logoBase64 && settings?.printOptions?.showLogo !== false && <img src={settings.logoBase64} alt="Logo" className="w-16 h-16 object-contain" />}
                      <div>
                        <h1 className="text-3xl font-bold text-emerald-900">{settings?.agencyName}</h1>
                        <p className="text-emerald-700 mt-1">{settings?.slogan}</p>
                        <div className="text-xs text-emerald-800 mt-2 flex gap-4 font-mono opacity-80">
                          {settings?.nationalId && settings?.printOptions?.showNationalId !== false && <span>شناسه ملی: {toPersianDigits(settings.nationalId)}</span>}
                          {settings?.economicCode && settings?.printOptions?.showEconomicCode !== false && <span>کد اقتصادی: {toPersianDigits(settings.economicCode)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-left text-sm text-emerald-800">
                      <p><strong className="opacity-80">شماره قرارداد:</strong> <span className="font-mono font-bold">{toPersianDigits(contractData.contractNumber)}</span></p>
                      <p className="text-xs text-emerald-600 mt-0.5">صورتحساب رسمی خدمات املاک</p>
                      {isReprintMode && (
                        <span className="inline-block mt-1 text-[11px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                          چاپ مجدد
                        </span>
                      )}
                    </div>
                  </div>
                ) : settings?.invoiceLayout === 'compact' ? (
                  <div className="border-b-2 border-slate-800 pb-2 mb-4">
                    <div className="flex justify-between items-end mb-2">
                      <h1 className="text-xl font-bold">{settings?.agencyName}</h1>
                      <div className="text-left text-xs font-mono">
                        شماره: {toPersianDigits(contractData.contractNumber)}
                        {isReprintMode && ' (چاپ مجدد)'}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 flex gap-3 font-mono">
                      {settings?.nationalId && settings?.printOptions?.showNationalId !== false && <span>شناسه ملی: {toPersianDigits(settings.nationalId)}</span>}
                      {settings?.economicCode && settings?.printOptions?.showEconomicCode !== false && <span>کد اقتصادی: {toPersianDigits(settings.economicCode)}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                      {settings?.logoBase64 && settings?.printOptions?.showLogo !== false && <img src={settings.logoBase64} alt="Logo" className="w-16 h-16 object-contain" />}
                      <div>
                        <h1 className="text-3xl font-bold">{settings?.agencyName}</h1>
                        <p className="text-slate-500 mt-1">{settings?.slogan}</p>
                        <div className="text-xs text-slate-500 mt-2 flex gap-4 font-mono">
                          {settings?.nationalId && settings?.printOptions?.showNationalId !== false && <span>شناسه ملی: {toPersianDigits(settings.nationalId)}</span>}
                          {settings?.economicCode && settings?.printOptions?.showEconomicCode !== false && <span>کد اقتصادی: {toPersianDigits(settings.economicCode)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-left text-sm">
                      <p><strong className="text-slate-500">شماره قرارداد:</strong> <span className="font-mono font-bold">{toPersianDigits(contractData.contractNumber)}</span></p>
                      <p className="text-xs text-slate-400 mt-0.5">صورتحساب رسمی کمیسیون</p>
                      {isReprintMode && (
                        <span className="inline-block mt-1 text-[11px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                          چاپ مجدد
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <h2 className={`text-center font-bold mb-6 bg-slate-50 rounded-lg border border-slate-100 ${settings?.paperSize === '57mm' ? 'text-sm py-1 mb-2' : settings?.paperSize === '80mm' ? 'text-base py-2 mb-4' : 'text-xl py-3'}`}>
                  صورتحساب خدمات {contractData.type === 'sale' ? 'خرید و فروش' : 'رهن و اجاره (بین موجر و مستأجر)'}
                </h2>

                {/* اطلاعات طرفین فاکتور */}
                <div className={`grid ${settings?.paperSize === '57mm' || settings?.paperSize === '80mm' ? 'grid-cols-1 gap-2 mb-4' : 'grid-cols-2 gap-8 mb-8'}`}>
                  <div className={`border border-slate-200 rounded-lg bg-white ${settings?.paperSize === '57mm' ? 'p-2' : 'p-5'}`}>
                    <h3 className="font-bold border-b border-slate-100 pb-1 mb-2 text-emerald-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      {contractData.party1Role}
                    </h3>
                    <p className="mb-1"><strong>نام و نام خانوادگی:</strong> {contractData.party1?.fullName}</p>
                    {settings?.paperSize !== '57mm' && (
                      <p className="mb-1 font-mono"><strong>کد ملی:</strong> {toPersianDigits(contractData.party1?.nationalId) || '-'}</p>
                    )}
                    <p className="font-mono"><strong>تلفن همراه:</strong> {toPersianDigits(contractData.party1?.phone)}</p>
                  </div>

                  <div className={`border border-slate-200 rounded-lg bg-white ${settings?.paperSize === '57mm' ? 'p-2' : 'p-5'}`}>
                    <h3 className="font-bold border-b border-slate-100 pb-1 mb-2 text-emerald-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      {contractData.party2Role}
                    </h3>
                    <p className="mb-1"><strong>نام و نام خانوادگی:</strong> {contractData.party2?.fullName}</p>
                    {settings?.paperSize !== '57mm' && (
                      <p className="mb-1 font-mono"><strong>کد ملی:</strong> {toPersianDigits(contractData.party2?.nationalId) || '-'}</p>
                    )}
                    <p className="font-mono"><strong>تلفن همراه:</strong> {toPersianDigits(contractData.party2?.phone)}</p>
                  </div>
                </div>

                {/* جدول خدمات و مالیات با ارقام فارسی */}
                <table className="w-full border-collapse border border-slate-300 mb-6 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className={`border border-slate-300 text-right ${settings?.paperSize === '57mm' ? 'p-1' : 'p-3'}`}>شرح خدمات</th>
                      <th className={`border border-slate-300 text-center ${settings?.paperSize === '57mm' ? 'p-1 w-20' : 'p-3 w-48'}`}>مبلغ ({settings?.currency})</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={`border border-slate-300 ${settings?.paperSize === '57mm' ? 'p-1' : 'p-3'}`}>حق کمیسیون مشاور املاک</td>
                      <td className={`border border-slate-300 text-center font-mono ${settings?.paperSize === '57mm' ? 'p-1' : 'p-3'}`}>
                        {toPersianDigits(new Intl.NumberFormat('en-US').format(contractData.commission || 0))}
                      </td>
                    </tr>
                    <tr>
                      <td className={`border border-slate-300 ${settings?.paperSize === '57mm' ? 'p-1' : 'p-3'}`}>
                        مالیات بر ارزش افزوده ({toPersianDigits(settings?.taxRate || 9)}٪)
                      </td>
                      <td className={`border border-slate-300 text-center font-mono ${settings?.paperSize === '57mm' ? 'p-1' : 'p-3'}`}>
                        {toPersianDigits(new Intl.NumberFormat('en-US').format(contractData.tax || 0))}
                      </td>
                    </tr>
                    <tr className="font-bold bg-slate-50 text-emerald-800">
                      <td className={`border border-slate-300 ${settings?.paperSize === '57mm' ? 'p-1' : 'p-3'}`}>جمع قابل پرداخت (هر طرف)</td>
                      <td className={`border border-slate-300 text-center font-mono ${settings?.paperSize === '57mm' ? 'p-1 text-base' : 'p-3 text-lg'}`}>
                        {toPersianDigits(new Intl.NumberFormat('en-US').format((contractData.totalPayable || 0) / 2))}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* به حروف و نحوه پرداخت */}
                <div className={`bg-slate-50 rounded-lg border border-slate-200 ${settings?.paperSize === '57mm' ? 'p-2 mb-3' : 'p-5 mb-6'}`}>
                  <p><strong className="text-slate-600">به حروف:</strong> {numberToWords(contractData.totalPayable || 0)} {settings?.currency}</p>
                  
                  {/* پرداخت و موعد چک برای هر دو طرف */}
                  <div className={`grid mt-4 pt-4 border-t border-slate-200 ${settings?.paperSize === '57mm' ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-4'}`}>
                    {/* طرف اول */}
                    {(printTarget === 'both' || printTarget === 'party1') && (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-700">
                        پرداخت سهم {contractData.party1Role}:
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {contractData.party1PaymentMethod === 'cash' && <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-medium">نقدی</span>}
                        {contractData.party1PaymentMethod === 'pos' && (
                          <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-medium font-mono">
                            کارتخوان (کد پیگیری: {toPersianDigits(contractData.party1PosReceipt || '-')})
                          </span>
                        )}
                        {contractData.party1PaymentMethod === 'transfer' && <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-medium">انتقال وجه / شبا</span>}
                        {contractData.party1PaymentMethod === 'cheque' && (
                          <div className="space-y-1 w-full">
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded text-xs font-bold">
                              <CreditCard size={14} className="text-amber-700" />
                              پرداخت با چک صیادی / نسیه
                            </span>
                            <p className="text-xs text-amber-900 font-bold flex items-center gap-1 mt-1">
                              <Calendar size={13} className="text-amber-700" />
                              سررسید چک: <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300">{toPersianDigits(contractData.party1ChequeDate) || 'ثبت نشده'}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    )}

                    {/* طرف دوم */}
                    {(printTarget === 'both' || printTarget === 'party2') && (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-700">
                        پرداخت سهم {contractData.party2Role}:
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {contractData.party2PaymentMethod === 'cash' && <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-medium">نقدی</span>}
                        {contractData.party2PaymentMethod === 'pos' && (
                          <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-medium font-mono">
                            کارتخوان (کد پیگیری: {toPersianDigits(contractData.party2PosReceipt || '-')})
                          </span>
                        )}
                        {contractData.party2PaymentMethod === 'transfer' && <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-medium">انتقال وجه / شبا</span>}
                        {contractData.party2PaymentMethod === 'cheque' && (
                          <div className="space-y-1 w-full">
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded text-xs font-bold">
                              <CreditCard size={14} className="text-amber-700" />
                              پرداخت با چک صیادی / نسیه
                            </span>
                            <p className="text-xs text-amber-900 font-bold flex items-center gap-1 mt-1">
                              <Calendar size={13} className="text-amber-700" />
                              سررسید چک: <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300">{toPersianDigits(contractData.party2ChequeDate) || 'ثبت نشده'}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    )}
                  </div>
                </div>

                {/* پیام‌های اختصاصی نقش‌ها */}
                {settings?.invoiceLayout !== 'compact' && settings?.paperSize !== '57mm' && (
                  <div className="mb-6 space-y-2 text-sm text-slate-600 italic border-r-2 border-emerald-500 pr-3">
                    {contractData.party1Role === 'خریدار' && settings?.invoiceMessageBuyer && <p>{settings.invoiceMessageBuyer}</p>}
                    {contractData.party1Role === 'فروشنده' && settings?.invoiceMessageSeller && <p>{settings.invoiceMessageSeller}</p>}
                    {contractData.party1Role === 'موجر' && settings?.invoiceMessageLandlord && <p>{settings.invoiceMessageLandlord}</p>}
                    {contractData.party1Role === 'مستأجر' && settings?.invoiceMessageTenant && <p>{settings.invoiceMessageTenant}</p>}
                    
                    {contractData.party2Role === 'خریدار' && settings?.invoiceMessageBuyer && <p>{settings.invoiceMessageBuyer}</p>}
                    {contractData.party2Role === 'فروشنده' && settings?.invoiceMessageSeller && <p>{settings.invoiceMessageSeller}</p>}
                    {contractData.party2Role === 'موجر' && settings?.invoiceMessageLandlord && <p>{settings.invoiceMessageLandlord}</p>}
                    {contractData.party2Role === 'مستأجر' && settings?.invoiceMessageTenant && <p>{settings.invoiceMessageTenant}</p>}
                  </div>
                )}

                {/* توضیحات و شرایط کلی فاکتور */}
                {settings?.invoiceDescription && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap border border-slate-200">
                    <p className="font-bold mb-1 text-slate-500 text-xs">توضیحات فاکتور:</p>
                    {settings.invoiceDescription}
                  </div>
                )}

                {/* امضاء و مهر */}
                <div className={`flex justify-between mt-8 pt-6 border-t border-slate-300 ${settings?.paperSize === '57mm' || settings?.paperSize === '80mm' ? 'flex-col gap-6 text-center' : ''}`}>
                  <div className={`text-center ${settings?.paperSize === '57mm' || settings?.paperSize === '80mm' ? 'w-full' : 'w-1/3'}`}>
                    <p className="font-bold text-slate-700">امضاء و اثر انگشت {contractData.party1Role}</p>
                    <p className="text-xs text-slate-400 mt-1">({contractData.party1?.fullName})</p>
                  </div>
                  <div className={`text-center relative ${settings?.paperSize === '57mm' || settings?.paperSize === '80mm' ? 'w-full min-h-[60px]' : 'w-1/3'}`}>
                    <p className="font-bold text-slate-700">مهر و امضاء مدیریت املاک</p>
                    {settings?.stampBase64 && settings?.printOptions?.showLogo !== false && (
                      <img src={settings.stampBase64} alt="Stamp" className={`absolute ${settings?.paperSize === '57mm' || settings?.paperSize === '80mm' ? 'top-6 w-16 h-16' : 'top-8 w-32 h-32'} left-1/2 -translate-x-1/2 object-contain pointer-events-none`} />
                    )}
                  </div>
                  <div className={`text-center ${settings?.paperSize === '57mm' || settings?.paperSize === '80mm' ? 'w-full' : 'w-1/3'}`}>
                    <p className="font-bold text-slate-700">امضاء و اثر انگشت {contractData.party2Role}</p>
                    <p className="text-xs text-slate-400 mt-1">({contractData.party2?.fullName})</p>
                  </div>
                </div>
                
                
                {/* پاورقی آدرس و تلفن با فرمت فارسی */}
                <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-200 pt-4">
                  <p>
                    {settings?.printOptions?.showAddress !== false && <span>{settings?.address}</span>}
                    {settings?.printOptions?.showAddress !== false && settings?.printOptions?.showPhones !== false && <span> | </span>}
                    {settings?.printOptions?.showPhones !== false && <span>تلفن تماس: {toPersianDigits(settings?.phone1)}</span>}
                  </p>
                </div>

                {/* ته قبض / Tear-off Receipt */}
                {(printTarget === 'party1' || printTarget === 'party2') && (
                  <div className="mt-8 pt-8 border-t-2 border-dashed border-slate-400" style={{ pageBreakInside: 'avoid' }}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-lg">ته قبض فاکتور (نسخه بایگانی املاک)</h4>
                      <span className="text-sm font-mono bg-slate-100 px-3 py-1 rounded-lg">شماره فاکتور: {toPersianDigits(contractData.contractNumber)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                      <div><span className="text-slate-500">نام طرف قرارداد:</span> <strong className="mr-1">{printTarget === 'party1' ? contractData.party1?.fullName : contractData.party2?.fullName} ({printTarget === 'party1' ? contractData.party1Role : contractData.party2Role})</strong></div>
                      <div><span className="text-slate-500">مبلغ پرداخت شده:</span> <strong className="mr-1">{toPersianDigits(formatCurrency(printTarget === 'party1' ? contractData.party1PaymentMethod === 'cash' ? contractData.totalPayable : contractData.totalPayable : contractData.totalPayable))} تومان</strong></div>
                      <div><span className="text-slate-500">روش پرداخت:</span> <strong className="mr-1">{printTarget === 'party1' ? (contractData.party1PaymentMethod === 'pos' ? 'کارتخوان' : contractData.party1PaymentMethod === 'cash' ? 'نقدی' : contractData.party1PaymentMethod === 'transfer' ? 'انتقال وجه' : 'چک') : (contractData.party2PaymentMethod === 'pos' ? 'کارتخوان' : contractData.party2PaymentMethod === 'cash' ? 'نقدی' : contractData.party2PaymentMethod === 'transfer' ? 'انتقال وجه' : 'چک')}</strong></div>
                      <div><span className="text-slate-500">تاریخ پرداخت:</span> <strong className="mr-1 font-mono">{toPersianDigits(contractData.date)}</strong></div>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="text-xs text-slate-500">اینجانب تایید می‌نمایم که فاکتور و مدارک فوق را دریافت نموده‌ام.</p>
                      <div className="text-center">
                        <p className="font-bold mb-8">امضاء و اثر انگشت {printTarget === 'party1' ? contractData.party1Role : contractData.party2Role}</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Contracts;
