sed -i '/app.post('"'"'\/api\/bot\/clear-webhook'"'"'/i \
  app.post("/api/bot/set-webhook", async (req, res) => {\
    try {\
      const { token, platform, url } = req.body;\
      const cleanTok = cleanToken(token);\
      if (!cleanTok || !url) return res.json({ success: false, error: "Token and URL are required" });\
\
      let setRes: any = null;\
      if (platform === "telegram") {\
        const webhookUrl = `${url}/api/webhook/telegram/${cleanTok}`;\
        const response = await axios.post(`https://api.telegram.org/bot${cleanTok}/setWebhook`, { url: webhookUrl }, { timeout: 10000 });\
        setRes = response.data;\
        telegramPollingActive = false; // Stop polling if webhook is set\
      } else if (platform === "bale") {\
        const webhookUrl = `${url}/api/webhook/bale/${cleanTok}`;\
        const response = await axios.post(`https://tapi.bale.ai/bot${cleanTok}/setWebhook`, { url: webhookUrl }, { timeout: 10000 });\
        setRes = response.data;\
        balePollingActive = false;\
      } else if (platform === "rubika") {\
         // Rubika webhook logic is non-standard, but we can set a dummy endpoint or ignore\
         return res.json({ success: false, error: "روبیکا تنظیم مستقیم وبهوک را پشتیبانی نمی‌کند" });\
      }\
\
      res.json({ success: true, message: "وبهوک با موفقیت تنظیم شد.", response: setRes });\
    } catch (err: any) {\
      res.json({ success: false, error: "خطا در تنظیم وبهوک", details: err?.response?.data?.description || err.message });\
    }\
  });\
\
  app.post("/api/webhook/telegram/:token", async (req, res) => {\
    try {\
      await handleTelegramUpdate(req.params.token, req.body);\
      res.status(200).send("OK");\
    } catch (e) {\
      res.status(200).send("ERROR");\
    }\
  });\
\
  app.post("/api/webhook/bale/:token", async (req, res) => {\
    try {\
      await handleBaleUpdate(req.params.token, req.body);\
      res.status(200).send("OK");\
    } catch (e) {\
      res.status(200).send("ERROR");\
    }\
  });\
' server.ts
