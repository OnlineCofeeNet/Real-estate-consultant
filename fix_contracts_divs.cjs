const fs = require('fs');
let code = fs.readFileSync('src/pages/Contracts.tsx', 'utf8');

const brokenSection = `
              </table>
            </div>
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
        </div>
      )}
`;

const fixedSection = `
              </table>
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
        </div>
      )}
`;

code = code.replace(brokenSection, fixedSection);
fs.writeFileSync('src/pages/Contracts.tsx', code);
