const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const regex = /\{!-- بخش اتصال به تلگرام و بله و روبیکا --\}[\s\S]*?\{\/\* دکمه ذخیره \*\/\}/;

const replacement = `{/* بخش ارسال پیامک */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500"></div>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">تنظیمات ارسال پیامک (SMS)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">اتصال به پنل‌های پیامکی مانند فراز اس‌ام‌اس و SMS.ir</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ارائه‌دهنده پیامک</label>
                  <select 
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-slate-700"
                    value={formData.smsProvider || 'none'}
                    onChange={e => setFormData({...formData, smsProvider: e.target.value as any})}
                  >
                    <option value="none">غیرفعال (بدون ارسال پیامک)</option>
                    <option value="farazsms">فراز اس‌ام‌اس (FarazSMS)</option>
                    <option value="smsir">اس‌ام‌اس دات آی‌آر (SMS.ir)</option>
                  </select>
                </div>
                
                {formData.smsProvider && formData.smsProvider !== 'none' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">توکن / کلید API پنل پیامکی</label>
                      <input 
                        type="password" 
                        placeholder="API Key / Token" 
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left font-mono text-xs" 
                        dir="ltr" 
                        value={formData.smsToken || ''} 
                        onChange={e => setFormData({...formData, smsToken: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">شماره خط فرستنده (Line Number)</label>
                      <input 
                        type="text" 
                        placeholder="مثلا: 3000505" 
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left font-mono text-xs" 
                        dir="ltr" 
                        value={formData.smsLineNumber || ''} 
                        onChange={e => setFormData({...formData, smsLineNumber: toEnglishDigits(e.target.value.replace(/[^0-9]/g, ''))})} 
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-6">
                      <input 
                        type="checkbox" 
                        id="autoSendSmsInvoice" 
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        checked={formData.autoSendSmsInvoice || false}
                        onChange={e => setFormData({...formData, autoSendSmsInvoice: e.target.checked})}
                      />
                      <label htmlFor="autoSendSmsInvoice" className="text-sm font-bold text-slate-700 cursor-pointer">ارسال خودکار پیامک هنگام صدور/تمدید فاکتور</label>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">الگوی پیامک ارسالی (صدور فاکتور)</label>
                      <textarea 
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm h-24 resize-none leading-relaxed" 
                        placeholder="متن پیامک صدور فاکتور. متغیرها: {name}, {contract}, {amount}" 
                        value={formData.smsTemplateText || ''} 
                        onChange={e => setFormData({...formData, smsTemplateText: e.target.value})} 
                      ></textarea>
                      <p className="text-[10px] text-slate-400 mt-1">از متغیرهای <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded font-mono mx-0.5">{'{name}'}</code> (نام مشتری)، <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded font-mono mx-0.5">{'{contract}'}</code> (شماره قرارداد) و <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded font-mono mx-0.5">{'{amount}'}</code> (مبلغ) می‌توانید استفاده کنید.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* دکمه ذخیره */}`;

const regex2 = /\{\/\* دکمه ذخیره \*\/\}/;
code = code.replace(regex2, replacement);
fs.writeFileSync('src/pages/Settings.tsx', code);
