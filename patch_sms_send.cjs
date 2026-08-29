const fs = require('fs');
let code = fs.readFileSync('src/pages/Customers.tsx', 'utf8');

// Add handleSendSms function
const sendSmsCode = `
  const handleSendSms = async () => {
    if (!messageText) {
      toast.error('متن پیام را وارد کنید');
      return;
    }
    if (selectedCustomers.length === 0) {
      toast.error('هیچ مشتری انتخاب نشده است');
      return;
    }
    toast.loading('در حال ارسال پیامک...', { id: 'sendSms' });
    let successCount = 0;
    
    for (const cid of selectedCustomers) {
      const customer = customers?.find(c => c.id === cid);
      if (!customer || !customer.phone) continue;
      
      try {
        const res = await axios.post('/api/bot/send-sms', {
          phone: customer.phone,
          message: \`سلام \${customer.fullName}\\n\${messageText}\`
        });
        if (res.data.success) {
          successCount++;
        }
      } catch (err) {
        console.error('SMS error:', err);
      }
    }
    
    toast.dismiss('sendSms');
    if (successCount > 0) {
      toast.success(\`ارسال پیامک پایان یافت. موفق: \${toPersianDigits(successCount)} شماره\`);
    } else {
      toast.error('هیچ پیامکی ارسال نشد. تنظیمات پیامک را بررسی کنید.');
    }
    setIsMessageModalOpen(false);
    setMessageText('');
  };
`;

// Insert it before handleSendMessage
code = code.replace('const handleSendMessage = async () => {', sendSmsCode + '\n  const handleSendMessage = async () => {');

// Update buttons in modal
const btnRegex = /<button onClick=\{handleSendMessage\}[\s\S]*?<\/button>/;
const newBtns = `<button onClick={handleSendMessage} className="flex-1 bg-blue-600 text-white rounded-xl py-3 hover:bg-blue-700 font-bold shadow-sm shadow-blue-600/20 transition-colors flex justify-center items-center gap-2 text-sm">
                  <Send size={18} /> پیام‌رسان‌ها
                </button>
                <button onClick={handleSendSms} className="flex-1 bg-emerald-600 text-white rounded-xl py-3 hover:bg-emerald-700 font-bold shadow-sm shadow-emerald-600/20 transition-colors flex justify-center items-center gap-2 text-sm">
                  <Smartphone size={18} /> پیامک (SMS)
                </button>`;

code = code.replace(btnRegex, newBtns);
fs.writeFileSync('src/pages/Customers.tsx', code);
