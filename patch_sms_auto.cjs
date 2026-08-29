const fs = require('fs');
let code = fs.readFileSync('src/pages/Contracts.tsx', 'utf8');

const sendAutoSmsFn = `
  const sendAutoSms = async (contract: Partial<Contract>) => {
    if (!settings?.autoSendSmsInvoice || !settings?.smsProvider || settings.smsProvider === 'none') return;
    try {
      const amount = contract.totalPayable || 0;
      const tpl = settings.smsTemplateText || 'فاکتور شماره {contract} صادر شد. مبلغ قابل پرداخت: {amount} تومان.';
      
      if (contract.party1?.phone) {
        const msg1 = tpl
          .replace('{name}', contract.party1.fullName || '')
          .replace('{contract}', contract.contractNumber || '')
          .replace('{amount}', toPersianDigits(amount.toString()));
        axios.post('/api/bot/send-sms', { phone: contract.party1.phone, message: msg1 }).catch(()=>console.log('sms fail'));
      }
      if (contract.party2?.phone) {
        const msg2 = tpl
          .replace('{name}', contract.party2.fullName || '')
          .replace('{contract}', contract.contractNumber || '')
          .replace('{amount}', toPersianDigits(amount.toString()));
        axios.post('/api/bot/send-sms', { phone: contract.party2.phone, message: msg2 }).catch(()=>console.log('sms fail'));
      }
    } catch(e) {}
  };
`;

code = code.replace(/const handleSaveContract = async \(\) => \{/g, sendAutoSmsFn + "\\n  const handleSaveContract = async () => {");

// Inject into save
code = code.replace(/toast\.success\('قرارداد با موفقیت ثبت شد'\);/g, "toast.success('قرارداد با موفقیت ثبت شد');\n      sendAutoSms({ ...contractData, totalPayable: (contractData.commission || 0) + (contractData.tax || 0) });");

// Inject into renew
code = code.replace(/toast\.success\('تمدید قرارداد با موفقیت ثبت شد'\);/g, "toast.success('تمدید قرارداد با موفقیت ثبت شد');\n      sendAutoSms({ ...renewalContract, totalPayable: (renewalContract.commission || 0) + (renewalContract.tax || 0) });");

fs.writeFileSync('src/pages/Contracts.tsx', code);
