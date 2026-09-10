const fs = require('fs');
let code = fs.readFileSync('src/routes/api.ts', 'utf8');

const recoverSmsBlock = `
  router.post('/users/recover-sms', async (req, res) => {
    const { username, phone } = req.body;
    try {
      const result = await db.select().from(users).where(eq(users.username, username));
      const user = result[0];
      if (!user) {
        return res.status(404).json({ error: 'کاربری با این مشخصات یافت نشد' });
      }
      if (user.phone !== phone) {
        return res.status(400).json({ error: 'شماره موبایل وارد شده با اطلاعات حساب مطابقت ندارد' });
      }

      // Generate a new 8-digit random password
      const newPassword = Math.floor(10000000 + Math.random() * 90000000).toString();
      
      // We need to hash it. Since crypto is in auth.ts (client), we can do it via a simple crypto hack here, 
      // but wait, Drizzle is running on the server, we can just hash it here.
      const crypto = require('crypto');
      const keyMaterial = await crypto.webcrypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(newPassword),
        'PBKDF2',
        false,
        ['deriveBits']
      );
      const saltBuffer = Buffer.from(user.salt, 'base64');
      const bits = await crypto.webcrypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: saltBuffer, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        256
      );
      const newPasswordHash = Buffer.from(bits).toString('base64');

      await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, user.id));
      
      // Try to send via SMS / Bots
      const messageText = \`رمز عبور جدید شما برای سامانه املاک:\nنام کاربری: \${username}\nرمز عبور: \${newPassword}\`;
      
      // Let's call the internal sendSmsViaProvider if it was exported, or just fetch to our own endpoint.
      // But we are in the same node process! We can just use fetch to localhost:3000
      try {
        await fetch('http://localhost:3000/api/bot/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message: messageText, customerName: user.username })
        });
      } catch (e) {
         console.error('Failed to send SMS to bot API internally', e);
      }

      res.json({ success: true, message: 'رمز عبور جدید به شماره موبایل شما ارسال شد.' });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
`;

if (!code.includes('/users/recover-sms')) {
  code = code.replace("router.post('/users/login-fetch'", recoverSmsBlock + "\n  router.post('/users/login-fetch'");
  fs.writeFileSync('src/routes/api.ts', code);
  console.log("Patched API for recover-sms");
}
