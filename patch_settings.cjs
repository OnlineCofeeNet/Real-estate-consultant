const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// Add handleSetWebhook function
const setWebhookCode = `
  const handleSetWebhook = async (platform: 'telegram' | 'bale') => {
    const token = platform === 'telegram' ? formData.telegramToken : formData.baleToken;
    const platformLabel = platform === 'telegram' ? 'تلگرام' : 'بله';
    if (!token || !token.trim()) {
      toast.error(\`لطفاً ابتدا توکن ربات \${platformLabel} را وارد کنید\`);
      return;
    }
    const toastId = toast.loading(\`در حال تنظیم اتصال پایدار (وب‌هوک) برای \${platformLabel}...\`);
    try {
      const toSave = { ...formData };
      await db.settings.put(toSave, 1);
      
      // We send the current frontend origin as the base URL for the webhook
      const origin = window.location.origin;
      const res = await axios.post('/api/bot/set-webhook', {
        token,
        platform,
        url: origin
      });
      if (res.data?.success === false) {
        toast.error(res.data?.details || res.data?.error || 'خطا در تنظیم وبهوک', { id: toastId });
        return;
      }
      toast.success(res.data?.message || 'اتصال پایدار با موفقیت برقرار شد!', { id: toastId, duration: 4000 });
      if (platform === 'telegram') await checkTelegramBotStatus(token);
    } catch (err: any) {
      toast.error(err?.response?.data?.details || 'خطا در ارتباط با سرور برای تنظیم وبهوک', { id: toastId });
    }
  };
`;
code = code.replace("const handleClearWebhook = async () => {", setWebhookCode + "\n  const handleClearWebhook = async () => {");

// Add SMS panel to types
// First check if smsToken exists in types
fs.writeFileSync('src/pages/Settings.tsx', code);
