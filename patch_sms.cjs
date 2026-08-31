const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const smsPanelCode = `                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">شماره خط ارسال</label>
                  <input type="text" placeholder="مثال: 3000505" className="w-full border border-slate-200 bg-white rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-left font-mono text-xs" dir="ltr" value={formData.smsLineNumber || ''} onChange={e => setFormData({...formData, smsLineNumber: e.target.value})} disabled={formData.smsProvider === 'none'} />
                </div>
              </div>
              
              <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/50 mt-4 space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300" checked={formData.autoSendSmsInvoice || false} onChange={e => setFormData({...formData, autoSendSmsInvoice: e.target.checked})} disabled={formData.smsProvider === 'none'} />
                  <span className="text-sm font-bold text-slate-700">ارسال خودکار پیامک اطلاع‌رسانی پس از صدور فاکتور</span>
                </label>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">متن پیامک اطلاع‌رسانی قرار گرفتن فاکتور در بات</label>
                  <p className="text-[11px] text-slate-500 mb-2">می‌توانید از کلمات <span className="font-mono bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded">{"{name}"}</span> و <span className="font-mono bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded">{"{contract}"}</span> و <span className="font-mono bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded">{"{amount}"}</span> استفاده کنید.</p>
                  <textarea className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500" rows={2} value={formData.smsTemplateText || ''} onChange={e => setFormData({...formData, smsTemplateText: e.target.value})} disabled={formData.smsProvider === 'none'} placeholder="جناب/سرکار {name}، فاکتور شما صادر شد و در ربات قرار گرفت."></textarea>
                </div>
              </div>`;

code = code.replace(`                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">شماره خط ارسال</label>
                  <input type="text" placeholder="مثال: 3000505" className="w-full border border-slate-200 bg-white rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-left font-mono text-xs" dir="ltr" value={formData.smsLineNumber || ''} onChange={e => setFormData({...formData, smsLineNumber: e.target.value})} disabled={formData.smsProvider === 'none'} />
                </div>
              </div>`, smsPanelCode);

fs.writeFileSync('src/pages/Settings.tsx', code);
