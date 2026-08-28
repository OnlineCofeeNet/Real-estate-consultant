import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Send, Book, MessageSquare, ExternalLink } from 'lucide-react';

const Help = () => {
  const [feedback, setFeedback] = useState('');

  const sendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback) {
      toast.error('لطفا متن بازخورد را وارد کنید');
      return;
    }
    toast.loading('در حال ارسال بازخورد...', { id: 'feedback' });
    setTimeout(() => {
      toast.success('بازخورد شما با موفقیت ارسال شد. با تشکر!', { id: 'feedback' });
      setFeedback('');
    }, 1500);
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
              <p className="mt-3 leading-relaxed">برای صدور فاکتور، به منوی "قرارداد" بروید. اطلاعات طرفین و مبلغ معامله را وارد کنید. سامانه به طور خودکار حق کمیسیون را بر اساس تنظیمات محاسبه کرده و فرم پرداخت را به تفکیک هر شخص در اختیار شما قرار می‌دهد.</p>
            </details>
            <details className="bg-slate-50 p-4 rounded-lg cursor-pointer border border-slate-100 open:bg-emerald-50 open:border-emerald-200 transition-colors">
              <summary className="font-bold text-slate-800 outline-none">ارسال خودکار پیام به مشتریان چگونه است؟</summary>
              <p className="mt-3 leading-relaxed">شما می‌توانید توکن‌های API تلگرام، بله و روبیکا را در بخش "تنظیمات" وارد کنید. سپس از طریق منوی "مشتریان"، می‌توانید به صورت دستی یا گروهی برای مشتریان خود پیام (مثل تبریک تولد، موعد پرداخت چک یا کارت ویزیت) ارسال نمایید.</p>
            </details>
            <details className="bg-slate-50 p-4 rounded-lg cursor-pointer border border-slate-100 open:bg-emerald-50 open:border-emerald-200 transition-colors">
              <summary className="font-bold text-slate-800 outline-none">شخصی‌سازی فاکتور و قالب</summary>
              <p className="mt-3 leading-relaxed">در بخش تنظیمات می‌توانید لوگو و مهر بنگاه خود را آپلود کرده، رنگ‌بندی نرم‌افزار، فونت‌ها و چیدمان فاکتور نهایی را تغییر دهید.</p>
            </details>
          </div>

          <a href="#" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm mt-4">
            <ExternalLink size={16} /> مشاهده مستندات کامل
          </a>
        </div>

        {/* Feedback Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold border-b border-slate-100 pb-3 text-blue-700 flex items-center gap-2">
            <MessageSquare size={20} />
            ارسال بازخورد و پیشنهادات
          </h3>
          
          <form onSubmit={sendFeedback} className="space-y-4">
            <p className="text-sm text-slate-600">نظرات، پیشنهادات و یا مشکلات خود را در حین کار با نرم‌افزار برای تیم توسعه ارسال کنید تا در آپدیت‌های بعدی لحاظ گردد.</p>
            
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
