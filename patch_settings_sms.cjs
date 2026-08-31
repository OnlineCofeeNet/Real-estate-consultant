const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const smsTemplateUI = `
                <div className="col-span-1 md:col-span-3 mt-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    متن پیامک اطلاع‌رسانی صدور فاکتور (ارسال به تلفن مشتری)
                  </label>
                  <textarea
                    placeholder="فاکتور شما صادر شد. مبلغ: {amount} تومان"
                    className="w-full border border-slate-200 bg-white rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm min-h-[80px]"
                    value={formData.smsTemplateText || ''}
                    onChange={e => setFormData({...formData, smsTemplateText: e.target.value})}
                    disabled={formData.smsProvider === 'none'}
                  />
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    متغیرهای قابل استفاده: { '{name}' }, { '{contract}' }, { '{amount}' }
                  </p>
                </div>
              </div>
`;
code = code.replace("</div>\n\n              {/* کارت‌های وضعیت ربات‌های بله، تلگرام و روبیکا */}", smsTemplateUI + "\n              {/* کارت‌های وضعیت ربات‌های بله، تلگرام و روبیکا */}");

fs.writeFileSync('src/pages/Settings.tsx', code);
