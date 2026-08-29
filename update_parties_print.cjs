const fs = require('fs');
let code = fs.readFileSync('src/pages/Contracts.tsx', 'utf8');

const replacement = `{/* پرداخت و موعد چک برای هر دو طرف */}
                  <div className={\`grid mt-4 pt-4 border-t border-slate-200 \${settings?.paperSize === '57mm' ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-4'}\`}>
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
                              پرداخت با چک صیادی / نسیه`;

const regex = /\{\/\* پرداخت و موعد چک برای هر دو طرف \*\/\}[\s\S]*?پرداخت با چک صیادی \/ نسیه/m;
code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/Contracts.tsx', code);
