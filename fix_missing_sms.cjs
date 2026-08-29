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

code = code.replace(/const handleCompleteContract = async \(\) => \{/g, sendAutoSmsFn + "\\n  const handleCompleteContract = async () => {");

fs.writeFileSync('src/pages/Contracts.tsx', code);
