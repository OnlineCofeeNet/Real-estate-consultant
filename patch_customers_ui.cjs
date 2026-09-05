const fs = require('fs');
let code = fs.readFileSync('src/pages/Customers.tsx', 'utf8');

const regexUI = /<Search size=\{22\} className="text-slate-400 shrink-0" \/>\s*<input\s*type="text"\s*placeholder="جستجوی هوشمند بر اساس نام، شماره موبایل یا کد ملی..."\s*className="flex-1 bg-transparent border-none focus:outline-none text-slate-700 placeholder:text-slate-400 text-sm font-medium"\s*value=\{search\}\s*onChange=\{\(e\) => setSearch\(e\.target\.value\)\}\s*\/>\s*\{search && \(\s*<button\s*onClick=\{\(\) => setSearch\(""\)\}\s*className="text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md"\s*>\s*پاک کردن\s*<\/button>\s*\)\}\s*<\/div>/m;

const replacementUI = `<Search size={22} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="جستجوی هوشمند بر اساس نام، شماره موبایل یا کد ملی..."
            className="flex-1 bg-transparent border-none focus:outline-none text-slate-700 placeholder:text-slate-400 text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md"
            >
              پاک کردن
            </button>
          )}
          <button 
            onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
            className={\`text-xs px-3 py-1.5 rounded-md border font-bold flex items-center gap-1 transition-colors \${isAdvancedSearchOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}\`}
          >
            <Filter size={14} /> جستجوی پیشرفته
          </button>
        </div>

        {isAdvancedSearchOpen && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">مبلغ تراکنش (از)</label>
              <input type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} placeholder="مثلا 1000000" className="w-full text-sm border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none border bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">مبلغ تراکنش (تا)</label>
              <input type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} placeholder="مثلا 50000000" className="w-full text-sm border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none border bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">آخرین قرارداد (از تاریخ)</label>
              <DatePicker 
                calendar={persian} 
                locale={persian_fa} 
                format="YYYY/MM/DD" 
                value={fromDate} 
                onChange={(dateObject) => setFromDate(dateObject ? dateObject.format() : '')} 
                inputClass="w-full border border-slate-200 rounded-lg p-2 text-left font-mono text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="1404/01/01" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">آخرین قرارداد (تا تاریخ)</label>
              <DatePicker 
                calendar={persian} 
                locale={persian_fa} 
                format="YYYY/MM/DD" 
                value={toDate} 
                onChange={(dateObject) => setToDate(dateObject ? dateObject.format() : '')} 
                inputClass="w-full border border-slate-200 rounded-lg p-2 text-left font-mono text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="1404/12/29" 
              />
            </div>
          </div>
        )}`;

code = code.replace(regexUI, replacementUI);
fs.writeFileSync('src/pages/Customers.tsx', code);
