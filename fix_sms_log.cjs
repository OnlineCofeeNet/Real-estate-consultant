const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const importStatement = "import { db } from './src/db/index.ts';\nimport { messageLogs } from './src/db/schema.ts';\n";
code = code.replace("import dbApiRouter from './src/routes/api.ts';", "import dbApiRouter from './src/routes/api.ts';\n" + importStatement);

const sendSmsBlock = `
  app.post('/api/bot/send-sms', async (req, res) => {
    const { phone, message, customerName } = req.body;
    if (!phone || !message) return res.json({ success: false, error: 'Phone and message required' });
    
    // Check settings for SMS provider
    const provider = cachedSettings?.smsProvider;
    const token = cachedSettings?.smsToken;
    const line = cachedSettings?.smsLineNumber;
    
    let isSimulated = false;
    let status = 'pending';
    
    if (provider === 'none' || !provider || !token) {
      console.log(\`Simulated SMS to \${phone}:\`, message);
      isSimulated = true;
    }

    try {
      if (!isSimulated) {
        if (provider === 'sms.ir') {
          // SMS.ir V2 API
          await axios.post('https://api.sms.ir/v1/send/bulk', {
            lineNumber: line,
            MessageTexts: [message],
            Mobiles: [phone]
          }, {
            headers: { 'X-API-KEY': token, 'Accept': 'text/plain', 'Content-Type': 'application/json' }
          });
        } else if (provider === 'farazsms') {
          // FarazSMS
          await axios.post('https://ippanel.com/services.jspd', {
            op: 'send',
            uname: token.split(':')[0] || '', // token typically uname:pass
            pass: token.split(':')[1] || '',
            message: message,
            from: line,
            to: [phone]
          });
        } else {
          console.log(\`Unsupported SMS provider \${provider} to \${phone}:\`, message);
        }
      }
      status = 'sent';
      
      // Save log
      try {
        await db.insert(messageLogs).values({
          date: Date.now(),
          customerName: customerName || 'کاربر',
          phone: phone,
          messenger: isSimulated ? 'sms (simulated)' : 'sms',
          message: message,
          status: status,
          chatId: ''
        });
      } catch (err) {
        console.error('Failed to log SMS', err);
      }

      return res.json({ success: true, message: isSimulated ? 'پیامک شبیه‌سازی شد' : 'پیامک با موفقیت ارسال شد' });
    } catch (err: any) {
      console.error('SMS Send Error:', err.message);
      
      // Save failure log
      try {
        await db.insert(messageLogs).values({
          date: Date.now(),
          customerName: customerName || 'کاربر',
          phone: phone,
          messenger: 'sms',
          message: message,
          status: 'failed',
          chatId: ''
        });
      } catch (logErr) {
        console.error('Failed to log SMS failure', logErr);
      }
      
      return res.json({ success: false, error: 'خطا در ارسال پیامک', details: err.message });
    }
  });
`;

// Replace the old block
const oldBlockStart = "  app.post('/api/bot/send-sms', async (req, res) => {";
const oldBlockEndStr = "app.get('/api/bot/status'";
const startIndex = code.indexOf(oldBlockStart);
const endIndex = code.indexOf(oldBlockEndStr);

if(startIndex !== -1 && endIndex !== -1) {
  const newCode = code.substring(0, startIndex) + sendSmsBlock + "\n  " + code.substring(endIndex);
  fs.writeFileSync('server.ts', newCode);
  console.log("Success");
} else {
  console.log("Failed to find block");
}
