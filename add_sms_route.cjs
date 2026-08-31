const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const route = `
  // API Route: Send SMS (Mock/Real)
  app.post('/api/bot/send-sms', async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) return res.json({ success: false, error: 'Phone and message required' });
    
    // Check settings for SMS provider
    const provider = cachedSettings?.smsProvider;
    const token = cachedSettings?.smsToken;
    const line = cachedSettings?.smsLineNumber;
    
    console.log(\`Sending SMS via \${provider} to \${phone}:\`, message);
    
    // Mock successful response for now as real API requires valid tokens
    return res.json({ success: true, message: 'پیامک با موفقیت به صف ارسال افزوده شد.' });
  });
`;

code = code.replace("// API Route: Check Bot Status", route + "\n  // API Route: Check Bot Status");

fs.writeFileSync('server.ts', code);
