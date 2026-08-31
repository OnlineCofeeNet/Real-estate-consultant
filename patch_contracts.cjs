const fs = require('fs');
let code = fs.readFileSync('src/pages/Contracts.tsx', 'utf8');

// 1. Add States
const stateCode = `
  const [selectedContracts, setSelectedContracts] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
`;
code = code.replace("const [search1, setSearch1] = useState('');", stateCode + "\n  const [search1, setSearch1] = useState('');");

// 2. Add Bulk Delete and Pagination Logic
const bulkDeleteCode = `
  const handleBulkDeleteContracts = async () => {
    if (selectedContracts.size === 0) return;
    if (window.confirm(\`آیا از حذف \${selectedContracts.size} قرارداد اطمینان دارید؟ این عمل غیرقابل بازگشت است.\`)) {
      await db.transaction('rw', db.contracts, async () => {
        for (const id of selectedContracts) {
          await db.contracts.delete(id);
        }
      });
      toast.success('قراردادهای انتخاب شده با موفقیت حذف شدند');
      setSelectedContracts(new Set());
    }
  };

  const toggleSelectAll = (isAll: boolean, currentListIds: number[]) => {
    if (isAll) {
      const newSet = new Set(selectedContracts);
      currentListIds.forEach(id => newSet.add(id));
      setSelectedContracts(newSet);
    } else {
      const newSet = new Set(selectedContracts);
      currentListIds.forEach(id => newSet.delete(id));
      setSelectedContracts(newSet);
    }
  };

  const toggleSelectContract = (id: number) => {
    const newSet = new Set(selectedContracts);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedContracts(newSet);
  };
`;
code = code.replace("const handleDeleteContract = async (id: number) => {", bulkDeleteCode + "\n  const handleDeleteContract = async (id: number) => {");

// 3. Paginate filteredContracts
const paginateCode = `
  const totalPages = Math.ceil((filteredContracts.length || 1) / itemsPerPage);
  const paginatedContracts = filteredContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const currentListIds = paginatedContracts.map(c => c.id!).filter(Boolean);
  const isAllSelected = currentListIds.length > 0 && currentListIds.every(id => selectedContracts.has(id));
`;
code = code.replace("return (", paginateCode + "\n  return (");

// 4. Update the Table Head
const tableHead = `
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="p-4 w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        checked={isAllSelected}
                        onChange={(e) => toggleSelectAll(e.target.checked, currentListIds)}
                      />
                    </th>
                    <th className="p-4 font-bold">شماره قرارداد</th>
`;
code = code.replace(/<thead[^>]*>[\s\S]*?<th className="p-4 font-bold">شماره قرارداد<\/th>/, tableHead);

// 5. Update the Table Row map
const tableRowMap = `
                  {paginatedContracts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        هیچ قراردادی مطابق با جستجو یا فیلتر یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    paginatedContracts.map((c) => {
`;
code = code.replace(/\{filteredContracts\.length === 0 \? \([\s\S]*?filteredContracts\.map\(\(c\) => \{/, tableRowMap);

// 6. Update the Table Row to include checkbox
const tableRowTd = `
                        <tr key={c.id} className={\`transition-colors \${selectedContracts.has(c.id!) ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'}\`}>
                          <td className="p-4">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                              checked={selectedContracts.has(c.id!)}
                              onChange={() => toggleSelectContract(c.id!)}
                            />
                          </td>
                          {/* شماره قرارداد با فرمت فارسی */}
`;
code = code.replace(/<tr key=\{c\.id\} className="hover:bg-slate-50\/70 transition-colors">[\s\S]*?\{\/\* شماره قرارداد با فرمت فارسی \*\/\}/, tableRowTd);

// 7. Add Bulk Actions & Pagination UI
const bulkAndPaginationUI = `
            </div>
            
            {/* Pagination & Bulk Actions */}
            <div className="border-t border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-4">
                {selectedContracts.size > 0 && (
                  <button
                    onClick={handleBulkDeleteContracts}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Trash2 size={14} />
                    حذف موارد انتخاب شده ({selectedContracts.size})
                  </button>
                )}
                
                <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                  <span>نمایش در صفحه:</span>
                  <select 
                    value={itemsPerPage} 
                    onChange={e => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-slate-200 rounded-lg p-1 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={10}>۱۰</option>
                    <option value={20}>۲۰</option>
                    <option value={50}>۵۰</option>
                    <option value={100}>۱۰۰</option>
                  </select>
                </div>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-1" dir="ltr">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold font-mono"
                  >
                    Prev
                  </button>
                  
                  <span className="px-3 py-1 text-xs font-bold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>
                  
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold font-mono"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
`;
code = code.replace(/<\/table>\s*<\/div>\s*<\/div>/, `</table>\n            </div>` + bulkAndPaginationUI);

fs.writeFileSync('src/pages/Contracts.tsx', code);
