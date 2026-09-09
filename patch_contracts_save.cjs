const fs = require('fs');
let code = fs.readFileSync('src/pages/Contracts.tsx', 'utf8');

const oldSaveCodeStr = `      const newId = await db.contracts.add({
        ...contractData,
        status: 'completed',
        createdAt: Date.now()
      } as Contract);

      // Create invoices for Finance page
      const invTotal = (contractData.totalPayable || 0) / 2;
      const t = Date.now();
      const p1InvoiceId = await db.invoices.add({
        invoiceNumber: \`INV-\${Date.now()}-1\`,
        contractId: newId,
        contractNumber: contractData.contractNumber,
        customerId: contractData.party1?.id,
        customerName: contractData.party1?.fullName || '',
        customerPhone: contractData.party1?.phone || '',
        partyRole: contractData.party1Role || '',
        subtotal: (contractData.commission || 0) / 2,
        tax: (contractData.tax || 0) / 2,
        total: invTotal,
        paidAmount: invTotal,
        status: 'paid',
        issuedAt: t,
        dueDate: contractData.date
      });
      await db.payments.add({
        invoiceId: p1InvoiceId,
        contractId: newId,
        amount: invTotal,
        method: contractData.party1PaymentMethod as any || 'cash',
        status: 'completed',
        chequeDate: contractData.party1ChequeDate,
        paidAt: t,
        createdAt: t
      });

      const p2InvoiceId = await db.invoices.add({
        invoiceNumber: \`INV-\${Date.now()}-2\`,
        contractId: newId,
        contractNumber: contractData.contractNumber,
        customerId: contractData.party2?.id,
        customerName: contractData.party2?.fullName || '',
        customerPhone: contractData.party2?.phone || '',
        partyRole: contractData.party2Role || '',
        subtotal: (contractData.commission || 0) / 2,
        tax: (contractData.tax || 0) / 2,
        total: invTotal,
        paidAmount: invTotal,
        status: 'paid',
        issuedAt: t,
        dueDate: contractData.date
      });
      await db.payments.add({
        invoiceId: p2InvoiceId,
        contractId: newId,
        amount: invTotal,
        method: contractData.party2PaymentMethod as any || 'cash',
        status: 'completed',
        chequeDate: contractData.party2ChequeDate,
        paidAt: t,
        createdAt: t
      });

      sendAutoSms(contractData as any);
      toast.success('قرارداد با موفقیت ثبت شد');
      setShowInvoice(false);
      resetForm();`;

const newSaveCodeStr = `      const t = Date.now();
      const contractObj = {
        ...contractData,
        status: 'completed',
        createdAt: t
      };
      
      const invTotal = (contractData.totalPayable || 0) / 2;
      const invoice1Obj = {
        invoiceNumber: \`INV-\${t}-1\`,
        contractNumber: contractData.contractNumber,
        customerId: contractData.party1?.id,
        customerName: contractData.party1?.fullName || '',
        customerPhone: contractData.party1?.phone || '',
        partyRole: contractData.party1Role || '',
        subtotal: (contractData.commission || 0) / 2,
        tax: (contractData.tax || 0) / 2,
        total: invTotal,
        paidAmount: invTotal,
        status: 'paid',
        issuedAt: t,
        dueDate: contractData.date
      };
      const payment1Obj = {
        amount: invTotal,
        method: contractData.party1PaymentMethod as any || 'cash',
        status: 'completed',
        chequeDate: contractData.party1ChequeDate,
        paidAt: t,
        createdAt: t
      };
      
      const invoice2Obj = {
        invoiceNumber: \`INV-\${t}-2\`,
        contractNumber: contractData.contractNumber,
        customerId: contractData.party2?.id,
        customerName: contractData.party2?.fullName || '',
        customerPhone: contractData.party2?.phone || '',
        partyRole: contractData.party2Role || '',
        subtotal: (contractData.commission || 0) / 2,
        tax: (contractData.tax || 0) / 2,
        total: invTotal,
        paidAmount: invTotal,
        status: 'paid',
        issuedAt: t,
        dueDate: contractData.date
      };
      const payment2Obj = {
        amount: invTotal,
        method: contractData.party2PaymentMethod as any || 'cash',
        status: 'completed',
        chequeDate: contractData.party2ChequeDate,
        paidAt: t,
        createdAt: t
      };
      
      if (db.completeContractTransaction) {
        await (db as any).completeContractTransaction({
          contract: contractObj,
          invoice1: invoice1Obj,
          payment1: payment1Obj,
          invoice2: invoice2Obj,
          payment2: payment2Obj
        });
      } else {
        throw new Error('Transaction API not ready');
      }

      sendAutoSms(contractData as any);
      toast.success('قرارداد با موفقیت ثبت شد');
      setShowInvoice(false);
      resetForm();`;

if (code.includes("      const newId = await db.contracts.add({")) {
  code = code.replace(oldSaveCodeStr, newSaveCodeStr);
  fs.writeFileSync('src/pages/Contracts.tsx', code);
  console.log("Success");
} else {
  console.log("Could not find the target code to replace.");
}
