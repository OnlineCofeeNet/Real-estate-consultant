const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// Insert SMS settings UI
const smsSettingsHTML = `
              <h3 className="text-lg font-bold border-b border-slate-100 pb-3 text-indigo-700 flex items-center gap-2 mt-12">
                <MessageCircle size={20} />
                تنظیمات پنل پیامک
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/50">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ارائه‌دهنده پیامک</label>
                  <select 
                    className="w-full border border-slate-200 bg-white rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm" 
                    value={formData.smsProvider || 'none'} 
                    onChange={e => setFormData({...formData, smsProvider: e.target.value as any})}
                  >
                    <option value="none">غیرفعال (عدم ارسال پیامک)</option>
                    <option value="farazsms">فراز اس‌ام‌اس (FarazSMS)</option>
                    <option value="smsir">اس‌ام‌اس دات آی‌آر (SMS.ir)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">کلید دسترسی (API Key)</label>
                  <input type="password" placeholder="توکن پنل پیامک" className="w-full border border-slate-200 bg-white rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-left font-mono text-xs" dir="ltr" value={formData.smsToken || ''} onChange={e => setFormData({...formData, smsToken: e.target.value})} disabled={formData.smsProvider === 'none'} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">شماره خط ارسال</label>
                  <input type="text" placeholder="مثال: 3000505" className="w-full border border-slate-200 bg-white rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-left font-mono text-xs" dir="ltr" value={formData.smsLineNumber || ''} onChange={e => setFormData({...formData, smsLineNumber: e.target.value})} disabled={formData.smsProvider === 'none'} />
                </div>
              </div>
`;

code = code.replace('{/* کارت‌های وضعیت ربات‌های بله، تلگرام و روبیکا */}', smsSettingsHTML + '\n              {/* کارت‌های وضعیت ربات‌های بله، تلگرام و روبیکا */}');

// Change the webhook button from clear to set.
code = code.replace(/<button[^>]*onClick=\{handleClearWebhook\}[^>]*>[\s\S]*?<\/button>/g, `
<div className="flex gap-2">
  <button
    type="button"
    onClick={() => handleSetWebhook('telegram')}
    disabled={isClearingWebhook || !formData.telegramToken}
    className="flex-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold p-2.5 rounded-lg hover:bg-teal-50 hover:text-teal-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  >
    {isClearingWebhook ? <RefreshCw size={14} className="animate-spin" /> : <Link2 size={14} />}
    تنظیم وب‌هوک (اتصال مکرر)
  </button>
  <button
    type="button"
    onClick={handleClearWebhook}
    disabled={isClearingWebhook || !formData.telegramToken}
    className="bg-white border border-slate-200 text-slate-700 text-xs font-bold p-2.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    title="پاکسازی وبهوک (ارتباط مستقیم / Polling)"
  >
    <RefreshCw size={14} className={isClearingWebhook ? 'animate-spin' : ''} />
  </button>
</div>
`);

fs.writeFileSync('src/pages/Settings.tsx', code);
