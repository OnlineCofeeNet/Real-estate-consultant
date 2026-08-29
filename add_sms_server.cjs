const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Insert SMS handling endpoint
const smsEndpoint = `
// SMS Sending Endpoint
app.post('/api/bot/send-sms', async (req, res) => {
  try {
    const { phone, message } = req.body;
    const settings = await getSettings();
    if (!settings || !settings.smsProvider || settings.smsProvider === 'none') {
      return res.status(400).json({ success: false, error: 'SMS not configured' });
    }
    
    let success = false;
    if (settings.smsProvider === 'farazsms') {
      // https://ippanel.com/services.jspd
      const response = await axios.post('https://api2.ippanel.com/api/v1/sms/send/panel/single', {
        sender: settings.smsLineNumber || '3000505',
        recipient: [phone],
        message: message
      }, {
        headers: {
          'apikey': settings.smsToken
        }
      });
      success = response.data?.code === 0 || response.data?.status === 'OK';
    } else if (settings.smsProvider === 'smsir') {
      const response = await axios.post('https://api.sms.ir/v1/send/bulk', {
        lineNumber: settings.smsLineNumber || '300077329090',
        messageText: message,
        mobiles: [phone]
      }, {
        headers: {
          'X-API-KEY': settings.smsToken
        }
      });
      success = response.data?.status === 1;
    }
    
    res.json({ success: true, details: 'sms_sent' });
  } catch (error) {
    console.error('SMS send error:', error?.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to send SMS' });
  }
});
`;

code = code.replace(/app\.post\('\/api\/bot\/send'/g, smsEndpoint + "\\napp.post('/api/bot/send'");
fs.writeFileSync('server.ts', code);
