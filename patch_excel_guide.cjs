const fs = require('fs');
let code = fs.readFileSync('src/pages/Customers.tsx', 'utf8');

const replacement = `<div className="flex gap-2">
          <button onClick={exportToExcel} className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm text-sm">
            <Download size={18} /> خروجی اکسل
          </button>
          
          <div className="relative group">
            <label className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer text-sm">
              <Upload size={18} /> وارد کردن اکسل
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importFromExcel} />
            </label>
            <div className="absolute top-full mt-2 w-64 bg-slate-800 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 right-0">
              <p className="font-bold mb-2 text-emerald-400">راهنمای آپلود فایل اکسل:</p>
              <ul className="space-y-1 text-slate-200 list-disc list-inside">
                <li>سطر اول فایل باید شامل عناوین زیر باشد:</li>
                <li className="text-emerald-300 font-mono">نام و نام خانوادگی</li>
                <li className="text-emerald-300 font-mono">موبایل</li>
                <li className="text-emerald-300 font-mono">کد ملی</li>
                <li>فایل پشتیبانی شده: xlsx, csv</li>
              </ul>
            </div>
          </div>`;

const regex = /<button onClick=\{exportToExcel\}[\s\S]*?<input type="file" accept="\.xlsx,\.xls,\.csv" className="hidden" onChange=\{importFromExcel\} \/>\n\s*<\/label>/;
code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/Customers.tsx', code);
