import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Send, Book, MessageSquare, ExternalLink, FileSpreadsheet } from 'lucide-react';
import axios from 'axios';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

const Help = () => {
  const [feedback, setFeedback] = useState('');
  const settings = useLiveQuery(() => db.settings.get(1));

  const sendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback) {
      toast.error('لطفا متن بازخورد را وارد کنید');
      return;
    }
    
    toast.loading('در حال ارسال بازخورد به پشتیبانی...', { id: 'feedback' });
    
    try {
      const token = settings?.baleToken;
      if (!token) {
        toast.error('برای ارسال بازخورد لطفاً ابتدا توکن ربات بله را در تنظیمات وارد نمایید.', { id: 'feedback' });
        return;
      }
      
      const res = await axios.post('/api/send-message', {
        platform: 'bale',
        token: token,
        chatId: 'AmlakeFaraz',
        message: `📩 بازخورد جدید سامانه:\n\n${feedback}`
      });
      
      if (res.data.success) {
        toast.success('بازخورد شما با موفقیت برای تیم توسعه ارسال شد. با تشکر!', { id: 'feedback' });
        setFeedback('');
      } else {
        toast.error('خطا در ارتباط با پیام‌رسان. لطفاً توکن بله را بررسی کنید.', { id: 'feedback' });
      }
    } catch (err) {
      toast.error('خطای ارتباط با سرور. لطفاً دوباره تلاش کنید.', { id: 'feedback' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <h2 className="text-2xl font-bold text-slate-800">راهنما و بازخورد</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Help Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold border-b border-slate-100 pb-3 text-emerald-700 flex items-center gap-2">
            <Book size={20} />
            راهنمای استفاده از سامانه
          </h3>
          
          <div className="space-y-4 text-sm text-slate-600">
            <details className="bg-slate-50 p-4 rounded-lg cursor-pointer border border-slate-100 open:bg-emerald-50 open:border-emerald-200 transition-colors">
              <summary className="font-bold text-slate-800 outline-none">چگونه یک فاکتور صادر کنم؟</summary>
              <p className="mt-3 leading-relaxed">برای صدور فاکتور، به منوی "قرارداد" بروید. اطلاعات طرفین (خریدار/فروشنده یا موجر/مستأجر) و مبلغ معامله را وارد کنید. سامانه به طور خودکار حق کمیسیون را بر اساس تنظیماتی که وارد کرده‌اید محاسبه کرده و فرم پرداخت را به تفکیک هر شخص در اختیار شما قرار می‌دهد.</p>
            </details>
            
            <details className="bg-slate-50 p-4 rounded-lg cursor-pointer border border-slate-100 open:bg-emerald-50 open:border-emerald-200 transition-colors">
              <summary className="font-bold text-slate-800 outline-none flex items-center gap-1">
                <FileSpreadsheet size={16} className="text-emerald-600" />
                راهنمای افزودن گروهی مشتریان (فایل اکسل)
              </summary>
              <div className="mt-3 leading-relaxed">
                <p>جهت افزودن گروهی مشتریان، به تب "مشتریان" رفته و روی دکمه "افزودن با اکسل" کلیک کنید. فایل شما باید دقیقاً مطابق ساختار زیر (با عناوین ستون مشخص) باشد:</p>
                <div className="overflow-x-auto mt-4 mb-3 border border-slate-200 rounded-lg">
                  <table className="w-full text-sm text-center">
                    <thead className="bg-emerald-100 font-bold text-emerald-800">
                      <tr>
                        <th className="p-2 border-b border-l border-emerald-200">نام و نام خانوادگی</th>
                        <th className="p-2 border-b border-l border-emerald-200">موبایل</th>
                        <th className="p-2 border-b border-emerald-200">کد ملی (اختیاری)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white text-slate-700">
                      <tr>
                        <td className="p-2 border-b border-l border-slate-200">علی محمدی</td>
                        <td className="p-2 border-b border-l border-slate-200 font-mono">09123456789</td>
                        <td className="p-2 border-b border-slate-200 font-mono">1234567890</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-l border-slate-200">زهرا حسینی</td>
                        <td className="p-2 border-l border-slate-200 font-mono">09351112233</td>
                        <td className="p-2 border-slate-200 font-mono">0987654321</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <ul className="text-xs text-slate-500 list-disc list-inside space-y-1 mt-2">
                  <li>ستون‌های نام و موبایل <strong>الزامی</strong> هستند.</li>
                  <li>عناوین مجاز ستون نام: <span className="font-mono bg-slate-200 px-1 rounded">نام و نام خانوادگی</span>, <span className="font-mono bg-slate-200 px-1 rounded">نام</span>, <span className="font-mono bg-slate-200 px-1 rounded">fullName</span></li>
                  <li>عناوین مجاز ستون موبایل: <span className="font-mono bg-slate-200 px-1 rounded">موبایل</span>, <span className="font-mono bg-slate-200 px-1 rounded">تلفن</span>, <span className="font-mono bg-slate-200 px-1 rounded">phone</span></li>
                  <li>عناوین مجاز ستون کد ملی: <span className="font-mono bg-slate-200 px-1 rounded">کد ملی</span>, <span className="font-mono bg-slate-200 px-1 rounded">کدملی</span>, <span className="font-mono bg-slate-200 px-1 rounded">nationalId</span></li>
                </ul>
              </div>
            </details>
            
            <details className="bg-slate-50 p-4 rounded-lg cursor-pointer border border-slate-100 open:bg-emerald-50 open:border-emerald-200 transition-colors">
              <summary className="font-bold text-slate-800 outline-none">ارسال خودکار پیام به مشتریان چگونه است؟</summary>
              <p className="mt-3 leading-relaxed">شما می‌توانید توکن‌های API پیام‌رسان‌ها (مانند ربات بله) را در بخش "تنظیمات" وارد کنید. سپس از طریق منوی "مشتریان"، می‌توانید به صورت دستی یا گروهی برای مشتریان خود پیام ارسال نمایید یا فاکتورها را بلافاصله پس از ثبت برای آن‌ها پیامک/ارسال کنید.</p>
            </details>
            
            <details className="bg-slate-50 p-4 rounded-lg cursor-pointer border border-slate-100 open:bg-emerald-50 open:border-emerald-200 transition-colors">
              <summary className="font-bold text-slate-800 outline-none flex items-center gap-1">
                ارتباط خودکار مشتریان با ربات (بدون نیاز به Chat ID)
              </summary>
              <div className="mt-3 leading-relaxed">
                <p>سامانه به گونه‌ای طراحی شده که نیازی به کپی کردن دستی شناسه چت (Chat ID) مشتریان <strong>ندارید</strong>. برای اتصال مشتری به بات مراحل زیر را طی کنید:</p>
                <ol className="text-sm text-slate-600 list-decimal list-inside space-y-2 mt-2">
                  <li>ابتدا مشتری در ربات (مثلا بله یا تلگرام) دکمه <span className="font-mono bg-slate-200 px-1 rounded">/start</span> را می‌زند.</li>
                  <li>ربات از او می‌خواهد تا شماره تماس خود را ارسال کند (با زدن دکمه <strong>ارسال شماره تماس</strong>).</li>
                  <li>درون نرم‌افزار، به تب <strong>مشتریان</strong> رفته و روی دکمه <strong className="text-indigo-600">دریافت از ربات</strong> کلیک کنید.</li>
                </ol>
                <p className="mt-2">با این کار تمام مشتریانی که شماره خود را در ربات تایید کرده‌اند به صورت خودکار به لیست مشتریان نرم‌افزار اضافه می‌شوند و شما می‌توانید مستقیماً از داخل نرم‌افزار برای آن‌ها پیام یا فاکتور ارسال کنید.</p>
              </div>
            </details>
            
            <details className="bg-slate-50 p-4 rounded-lg cursor-pointer border border-slate-100 open:bg-emerald-50 open:border-emerald-200 transition-colors">
              <summary className="font-bold text-slate-800 outline-none">شخصی‌سازی فاکتور و قالب</summary>
              <p className="mt-3 leading-relaxed">در بخش تنظیمات می‌توانید لوگو و مهر بنگاه خود را آپلود کرده، رنگ‌بندی نرم‌افزار، متون دلخواه زیر فاکتور (قوانین و شروط) و چیدمان نهایی را به صورت کامل تغییر دهید.</p>
            </details>
          </div>
          
        </div>

        {/* Feedback Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold border-b border-slate-100 pb-3 text-blue-700 flex items-center gap-2">
            <MessageSquare size={20} />
            ارسال بازخورد و پیشنهادات
          </h3>
          
          <form onSubmit={sendFeedback} className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">نظرات، پیشنهادات و یا مشکلات خود را در حین کار با نرم‌افزار برای تیم توسعه ارسال کنید تا در آپدیت‌های بعدی لحاظ گردد. این پیام به صورت مستقیم از طریق ربات بله به مدیریت (<span className="font-mono bg-slate-100 px-1 rounded text-blue-600">AmlakeFaraz</span>) ارسال خواهد شد.</p>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">متن پیام</label>
              <textarea 
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none min-h-[150px]"
                placeholder="پیشنهاد یا مشکل خود را اینجا بنویسید..."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
              ></textarea>
            </div>
            
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm shadow-blue-600/20">
              <Send size={18} />
              ارسال به تیم پشتیبانی
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Help;
