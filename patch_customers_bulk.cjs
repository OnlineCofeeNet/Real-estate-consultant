const fs = require('fs');
let code = fs.readFileSync('src/pages/Customers.tsx', 'utf8');

const bulkDeleteCode = `
          {selectedCustomers.length > 0 && (
            <button
              onClick={async () => {
                if (window.confirm(\`آیا از حذف \${selectedCustomers.length} مشتری انتخاب شده اطمینان دارید؟\nتوجه: این عملیات غیرقابل بازگشت است.\`)) {
                  await db.transaction('rw', db.customers, async () => {
                    for (const id of selectedCustomers) {
                      await db.customers.delete(id);
                    }
                  });
                  toast.success('مشتریان انتخاب شده با موفقیت حذف شدند.');
                  setSelectedCustomers([]);
                }
              }}
              className="bg-red-100 hover:bg-red-200 text-red-700 px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm font-bold animate-in fade-in zoom-in text-sm"
            >
              <Trash2 size={18} /> حذف ({toPersianDigits(selectedCustomers.length)})
            </button>
          )}
          {selectedCustomers.length > 0 && (
`;
code = code.replace("{selectedCustomers.length > 0 && (", bulkDeleteCode);

// There's a problem with "selectedCustomers.length === customers.length" checking if all customers are selected.
// What if it's paginated? We should probably select all *filtered* customers instead.
// Let's modify the select-all logic as well if needed. But for now I'll just add the bulk delete button.

fs.writeFileSync('src/pages/Customers.tsx', code);
