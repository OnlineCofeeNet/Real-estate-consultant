import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  Download, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw, 
  Send, 
  Users, 
  Layers, 
  Smartphone, 
  CheckSquare, 
  Square, 
  AlertTriangle,
  RefreshCw,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import moment from 'moment-jalaali';
import toast from 'react-hot-toast';
import axios from 'axios';
import { toPersianDigits, formatCurrency } from '../utils/format';

const Dashboard = () => {
  const contracts = useLiveQuery(() => db.contracts.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());
  const messageLogs = useLiveQuery(() => db.messageLogs.toArray());
  const settings = useLiveQuery(() => db.settings.get(1));

  const [selectedLogIds, setSelectedLogIds] = useState<number[]>([]);
  const [isResending, setIsResending] = useState(false);
  const [activeGroupTab, setActiveGroupTab] = useState<'platform' | 'customer' | 'all'>('platform');
  const [logFilter, setLogFilter] = useState<'all' | 'failed' | 'sent'>('all');

  if (!contracts || !customers || !messageLogs) return <div className="p-4 text-slate-500">در حال بارگذاری...</div>;

  const totalRevenue = contracts.reduce((sum, c) => sum + (c.commission || 0), 0);
  
  const chartData = [
    { name: 'خرید/فروش', value: contracts.filter(c => c.type === 'sale').length },
    { name: 'رهن/اجاره', value: contracts.filter(c => c.type === 'rent').length },
  ];

  const pieData = [
    { name: 'نقدی', value: contracts.filter(c => c.party1PaymentMethod === 'cash').length + contracts.filter(c => c.party2PaymentMethod === 'cash').length },
    { name: 'انتقال وجه', value: contracts.filter(c => c.party1PaymentMethod === 'transfer').length + contracts.filter(c => c.party2PaymentMethod === 'transfer').length },
    { name: 'کارتخوان', value: contracts.filter(c => c.party1PaymentMethod === 'pos').length + contracts.filter(c => c.party2PaymentMethod === 'pos').length },
    { name: 'چک/نسیه', value: contracts.filter(c => c.party1PaymentMethod === 'cheque' || c.party1PaymentMethod === 'credit').length + contracts.filter(c => c.party2PaymentMethod === 'cheque' || c.party2PaymentMethod === 'credit').length },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const failedLogs = messageLogs.filter(m => m.status === 'failed');
  const sentLogs = messageLogs.filter(m => m.status === 'sent');

  const messageStatusData = [
    { name: 'موفق', value: sentLogs.length },
    { name: 'ناموفق', value: failedLogs.length },
  ];

  // دسته‌بندی پیام‌های ناموفق بر اساس پیام‌رسان
  const failedByPlatform = {
    telegram: failedLogs.filter(m => m.messenger === 'telegram'),
    bale: failedLogs.filter(m => m.messenger === 'bale'),
    rubika: failedLogs.filter(m => m.messenger === 'rubika' || !m.messenger),
  };

  // دسته‌بندی پیام‌های ناموفق بر اساس مشتری
  const failedByCustomer: Record<string, typeof failedLogs> = {};
  failedLogs.forEach(log => {
    const key = log.customerName || 'نامشخص';
    if (!failedByCustomer[key]) failedByCustomer[key] = [];
    failedByCustomer[key].push(log);
  });

  const exportStats = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'تعداد قراردادها': contracts.length, 'تعداد مشتریان': customers.length, 'مجموع کمیسیون (تومان)': totalRevenue }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "آمار کلی");
    XLSX.writeFile(wb, "dashboard-stats.xlsx");
  };

  const exportMessageLogs = () => {
    const ws = XLSX.utils.json_to_sheet(messageLogs.map(m => ({
      'تاریخ': moment(m.date).format('jYYYY/jMM/jDD HH:mm'),
      'مشتری': m.customerName,
      'شماره': m.phone,
      'پیام‌رسان': m.messenger === 'telegram' ? 'تلگرام' : m.messenger === 'rubika' ? 'روبیکا' : 'بله',
      'وضعیت': m.status === 'sent' ? 'موفق' : m.status === 'failed' ? 'ناموفق' : 'در حال ارسال',
      'متن پیام': m.message
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "لاگ پیام‌ها");
    XLSX.writeFile(wb, "message-logs.xlsx");
  };

  // تابع ارسال گروهی پیام‌های انتخاب‌شده
  const executeBulkResend = async (targetLogs: typeof failedLogs, label: string) => {
    if (targetLogs.length === 0) {
      toast.error('هیچ پیامی برای ارسال مجدد وجود ندارد');
      return;
    }

    setIsResending(true);
    const toastId = toast.loading(`در حال ارسال گروهی ${toPersianDigits(targetLogs.length)} پیام (${label})...`);

    let successCount = 0;
    let failCount = 0;

    for (const log of targetLogs) {
      try {
        const messenger = log.messenger || 'bale';
        let token = '';
        if (messenger === 'telegram') token = settings?.telegramToken || '';
        else if (messenger === 'bale') token = settings?.baleToken || '';
        else if (messenger === 'rubika') token = settings?.rubikaToken || '';

        // Find customer to get specific messenger ID if available
        let targetChatId = (log as any).chatId;
        if (!targetChatId && log.phone) {
          const customer = await db.customers.where('phone').equals(log.phone).first();
          if (customer) {
            if (messenger === 'telegram') targetChatId = customer.telegramId;
            else if (messenger === 'bale') targetChatId = customer.baleId;
            else if (messenger === 'rubika') targetChatId = customer.rubikaId;
          }
        }
        if (!targetChatId) {
          targetChatId = log.phone;
        }

        // ارسال واقعی به اندپوینت بک‌اند در صورت موجود بودن توکن
        if (token && targetChatId) {
          const res = await axios.post('/api/send-message', {
            platform: messenger,
            token,
            chatId: targetChatId,
            message: log.message
          }, { timeout: 8000 });

          if (res.data?.success) {
            if (log.id) {
              await db.messageLogs.update(log.id, { 
                status: 'sent', 
                date: Date.now() 
              });
              successCount++;
            }
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      } catch (err: any) {
        console.log('Resend message notice:', err?.response?.data?.details || err?.response?.data?.error || err.message);
        failCount++;
      }
    }

    // پاکسازی موارد انتخاب‌شده
    setSelectedLogIds(prev => prev.filter(id => !targetLogs.some(t => t.id === id)));
    setIsResending(false);

    toast.dismiss(toastId);
    if (successCount > 0 && failCount === 0) {
      toast.success(`${toPersianDigits(successCount)} پیام با موفقیت ارسال مجدد شد.`);
    } else if (successCount > 0 && failCount > 0) {
      toast.success(`${toPersianDigits(successCount)} پیام ارسال شد (${toPersianDigits(failCount)} مورد ناموفق به دلیل عدم ثبت‌نام کاربر در ربات).`);
    } else {
      toast.error('ارسال پیام‌ها ناموفق بود. کاربر باید ابتدا در ربات /start را بزند یا شناسه عددی او وارد شود.');
    }
  };

  const handleResendSingle = async (id: number) => {
    const target = messageLogs.find(m => m.id === id);
    if (target) {
      await executeBulkResend([target], target.customerName);
    }
  };

  const toggleSelectLog = (id: number) => {
    setSelectedLogIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFailed = () => {
    if (selectedLogIds.length === failedLogs.length) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(failedLogs.map(l => l.id!).filter(Boolean));
    }
  };

  // فیلتر کردن ردیف‌های جدول لاگ‌ها
  const displayedLogs = messageLogs
    .filter(log => {
      if (logFilter === 'failed') return log.status === 'failed';
      if (logFilter === 'sent') return log.status === 'sent';
      return true;
    })
    .sort((a, b) => b.date - a.date);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">داشبورد</h2>
          <p className="text-xs text-slate-500 mt-1">مدیریت آمار، پیام‌های ارسالی و ارسال گروهی پیام‌های ناموفق</p>
        </div>
        <button onClick={exportStats} className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm font-bold text-sm">
          <Download size={18} /> خروجی آماری اکسل
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">تعداد قراردادها</p>
          <p className="text-3xl font-bold mt-2 text-slate-800 font-mono">{toPersianDigits(contracts.length)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">تعداد مشتریان</p>
          <p className="text-3xl font-bold mt-2 text-slate-800 font-mono">{toPersianDigits(customers.length)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">مجموع کمیسیون</p>
          <p className="text-3xl font-bold mt-2 text-emerald-600 font-mono">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-80 col-span-2">
          <h3 className="text-lg font-bold mb-4 text-slate-700 flex items-center gap-2">
            <span className="w-1 h-5 bg-emerald-500 rounded-full"></span>
            آمار قراردادها (نوع)
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-80">
          <h3 className="text-lg font-bold mb-4 text-slate-700 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
            روش‌های پرداخت
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }}></span>
                {entry.name}: {toPersianDigits(entry.value)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* بخش اختصاصی: دسته‌بندی و ارسال گروهی پیام‌های ناموفق */}
      {failedLogs.length > 0 && (
        <div className="bg-gradient-to-br from-red-50/70 via-white to-amber-50/50 p-6 rounded-2xl border border-red-200/80 shadow-sm space-y-5 animate-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>مدیریت و ارسال گروهی پیام‌های ناموفق</span>
                  <span className="bg-red-500 text-white text-xs px-2.5 py-0.5 rounded-full font-mono">
                    {toPersianDigits(failedLogs.length)} پیام
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">پیام‌های ناموفق را بر اساس پیام‌رسان یا مشتری دسته‌بندی کرده و به صورت گروهی ارسال نمایید</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={isResending}
                onClick={() => executeBulkResend(failedLogs, 'تمام پیام‌های ناموفق')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
                <span>ارسال مجدد همه ناموفق‌ها ({toPersianDigits(failedLogs.length)})</span>
              </button>

              {selectedLogIds.length > 0 && (
                <button
                  type="button"
                  disabled={isResending}
                  onClick={() => {
                    const selected = failedLogs.filter(l => selectedLogIds.includes(l.id!));
                    executeBulkResend(selected, 'موارد انتخاب شده');
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>ارسال موارد انتخاب شده ({toPersianDigits(selectedLogIds.length)})</span>
                </button>
              )}
            </div>
          </div>

          {/* تب‌های دسته‌بندی پیام‌های ناموفق */}
          <div className="flex gap-2 border-b border-slate-200/80 pb-2">
            <button
              type="button"
              onClick={() => setActiveGroupTab('platform')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                activeGroupTab === 'platform' 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Smartphone size={14} />
              <span>دسته‌بندی بر اساس پیام‌رسان</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveGroupTab('customer')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                activeGroupTab === 'customer' 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users size={14} />
              <span>دسته‌بندی بر اساس مشتریان</span>
            </button>
          </div>

          {/* محتوای دسته‌بندی بر اساس پیام‌رسان */}
          {activeGroupTab === 'platform' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* گروه بله */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold text-slate-700">پیام‌رسان بله</span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                    {toPersianDigits(failedByPlatform.bale.length)} ناموفق
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isResending || failedByPlatform.bale.length === 0}
                  onClick={() => executeBulkResend(failedByPlatform.bale, 'پیام‌رسان بله')}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={13} />
                  <span>ارسال مجدد گروه بله</span>
                </button>
              </div>

              {/* گروه تلگرام */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                    <span className="text-xs font-bold text-slate-700">پیام‌رسان تلگرام</span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                    {toPersianDigits(failedByPlatform.telegram.length)} ناموفق
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isResending || failedByPlatform.telegram.length === 0}
                  onClick={() => executeBulkResend(failedByPlatform.telegram, 'پیام‌رسان تلگرام')}
                  className="w-full bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={13} />
                  <span>ارسال مجدد گروه تلگرام</span>
                </button>
              </div>

              {/* گروه روبیکا */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-xs font-bold text-slate-700">پیام‌رسان روبیکا</span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                    {toPersianDigits(failedByPlatform.rubika.length)} ناموفق
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isResending || failedByPlatform.rubika.length === 0}
                  onClick={() => executeBulkResend(failedByPlatform.rubika, 'پیام‌رسان روبیکا')}
                  className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={13} />
                  <span>ارسال مجدد گروه روبیکا</span>
                </button>
              </div>
            </div>
          )}

          {/* محتوای دسته‌بندی بر اساس مشتری */}
          {activeGroupTab === 'customer' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              {Object.keys(failedByCustomer).map(name => {
                const customerFailed = failedByCustomer[name];
                return (
                  <div key={name} className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-xs">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{toPersianDigits(customerFailed.length)} پیام ناموفق</p>
                    </div>
                    <button
                      type="button"
                      disabled={isResending}
                      onClick={() => executeBulkResend(customerFailed, name)}
                      className="text-xs bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={12} />
                      <span>ارسال</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* جدول تاریخچه لاگ ارسال پیام‌ها */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
              لاگ ارسال پیام‌ها
            </h3>
            
            {/* فیلتر وضعیت پیام‌ها */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setLogFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${logFilter === 'all' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                همه ({toPersianDigits(messageLogs.length)})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('failed')}
                className={`px-2.5 py-1 rounded-md transition-colors ${logFilter === 'failed' ? 'bg-red-500 text-white' : 'text-red-600 hover:bg-red-50'}`}
              >
                ناموفق ({toPersianDigits(failedLogs.length)})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('sent')}
                className={`px-2.5 py-1 rounded-md transition-colors ${logFilter === 'sent' ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50'}`}
              >
                موفق ({toPersianDigits(sentLogs.length)})
              </button>
            </div>
          </div>

          <div className="flex gap-3 items-center flex-wrap">
            {failedLogs.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllFailed}
                className="text-xs border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                {selectedLogIds.length === failedLogs.length ? <CheckSquare size={14} /> : <Square size={14} />}
                <span>انتخاب همه ناموفق‌ها</span>
              </button>
            )}
            <button 
              onClick={exportMessageLogs} 
              className="border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-50 transition-colors"
            >
              <Download size={14} /> خروجی اکسل
            </button>
          </div>
        </div>
        
        {displayedLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
            <MessageSquare className="opacity-20" size={48} />
            <p>موردی برای نمایش یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <span className="sr-only">انتخاب</span>
                  </th>
                  <th className="p-3 font-bold">تاریخ</th>
                  <th className="p-3 font-bold">مشتری</th>
                  <th className="p-3 font-bold">شماره تماس</th>
                  <th className="p-3 font-bold">پیام‌رسان</th>
                  <th className="p-3 font-bold">وضعیت</th>
                  <th className="p-3 font-bold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedLogs.slice(0, 15).map((log) => {
                  const isSelected = selectedLogIds.includes(log.id!);
                  return (
                    <tr key={log.id} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-amber-50/50' : ''}`}>
                      <td className="p-3 text-center">
                        {log.status === 'failed' ? (
                          <button
                            type="button"
                            onClick={() => toggleSelectLog(log.id!)}
                            className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                          >
                            {isSelected ? <CheckSquare size={16} className="text-slate-900" /> : <Square size={16} />}
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-xs" dir="ltr">
                        {toPersianDigits(moment(log.date).format('jYY/jMM/jDD HH:mm'))}
                      </td>
                      <td className="p-3 font-medium text-slate-800">{log.customerName}</td>
                      <td className="p-3 text-slate-600 font-mono text-xs" dir="ltr">
                        {toPersianDigits(log.phone)}
                      </td>
                      <td className="p-3 text-xs">
                        {log.messenger === 'telegram' ? (
                          <span className="text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded">تلگرام</span>
                        ) : log.messenger === 'rubika' ? (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">روبیکا</span>
                        ) : (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">بله</span>
                        )}
                      </td>
                      <td className="p-3">
                        {log.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">
                            <CheckCircle2 size={14} /> موفق
                          </span>
                        ) : log.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 text-red-500 bg-red-50 px-2 py-1 rounded-md text-xs font-bold">
                            <XCircle size={14} /> ناموفق
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-500 bg-blue-50 px-2 py-1 rounded-md text-xs font-bold">
                            <Clock size={14} /> در حال ارسال
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {log.status === 'failed' && (
                          <button 
                            disabled={isResending}
                            onClick={() => handleResendSingle(log.id!)} 
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-50"
                          >
                            ارسال مجدد
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {displayedLogs.length > 15 && (
              <p className="text-center text-slate-400 text-xs mt-4">تنها ۱۵ پیام اخیر نمایش داده می‌شود. برای مشاهده کامل لیست، خروجی اکسل بگیرید.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

