const fs = require('fs');
let code = fs.readFileSync('src/pages/Contracts.tsx', 'utf8');

// We need to inject the tear-off receipt at the end of the print layout.
// Let's find the closing tag for the print section.
// Usually it's around `</div>\n            </div>\n          ) : (\n            /* Invoice Print View */`
// The layout ends with `<div className="mt-12 text-center text-xs text-slate-500 border-t border-slate-200 pt-4">`
// Let's find `{/* پاورقی آدرس و تلفن با فرمت فارسی */}` and the closing div of that.

const tearOffCode = `
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
`;

// Replace the existing footer
const oldFooterRegex = /\{\/\* پاورقی آدرس و تلفن با فرمت فارسی \*\/\}[\s\S]*?<\/div>\n\s*<\/div>\n\s*<\/div>/;
const newFooter = tearOffCode + '\n              </div>\n            </div>';
code = code.replace(oldFooterRegex, newFooter);

fs.writeFileSync('src/pages/Contracts.tsx', code);
