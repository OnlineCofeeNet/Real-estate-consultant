const fs = require('fs');
let code = fs.readFileSync('src/pages/Contracts.tsx', 'utf8');

const regex = /<div className="flex flex-wrap gap-2 print-hide">[\s\S]*?<\/button>\s*<\/div>/;

const replacement = `<div className="flex flex-col gap-3 print-hide mb-4">
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
                    className={\`px-4 py-3 rounded-xl border font-bold flex items-center gap-2 transition-colors \${
                      isReprintMode 
                        ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }\`}
                  >
                    <RotateCw size={16} />
                    <span>{isReprintMode ? 'چاپ مجدد: فعال' : 'برچسب'}</span>
                  </button>
                </div>
              </div>`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/Contracts.tsx', code);
