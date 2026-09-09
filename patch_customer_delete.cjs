const fs = require('fs');
let code = fs.readFileSync('src/pages/Customers.tsx', 'utf8');

const oldDelete = `  const confirmDelete = async () => {
    if (customerToDelete !== null) {
      await db.customers.delete(customerToDelete);
      toast.success("مشتری حذف شد");
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    }
  };`;

const newDelete = `  const confirmDelete = async () => {
    if (customerToDelete !== null) {
      try {
        const contracts = await db.contracts.toArray();
        const invoices = await db.invoices.toArray();
        const isUsedInContract = contracts.some(c => c.party1?.id === customerToDelete || c.party2?.id === customerToDelete);
        const isUsedInInvoice = invoices.some(i => i.customerId === customerToDelete);
        
        if (isUsedInContract || isUsedInInvoice) {
          toast.error("این مشتری دارای سابقه مالی یا قرارداد است و قابل حذف فیزیکی نیست. لطفاً وضعیت او را به 'غیرفعال' تغییر دهید.");
        } else {
          await db.customers.delete(customerToDelete);
          toast.success("مشتری حذف شد");
        }
      } catch (e) {
        toast.error("خطا در بررسی سوابق مشتری");
      }
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    }
  };`;

if(code.includes(oldDelete)) {
  code = code.replace(oldDelete, newDelete);
  fs.writeFileSync('src/pages/Customers.tsx', code);
  console.log("Success");
} else {
  console.log("Could not find old delete block");
}
