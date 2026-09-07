# چک‌لیست استقرار امن

- برنامه را پشت HTTPS اجرا کنید.
- پورت API را مستقیماً روی اینترنت باز نگذارید؛ reverse proxy استفاده کنید.
- Tokenهای پیام‌رسان و کلیدهای سرویس را داخل repository یا IndexedDB قرار ندهید.
- فایل‌های `bot-settings.json` و `bot-users.json` را خارج از مسیر عمومی وب نگه دارید.
- برای backup دسترسی نوشتن/خواندن را محدود کنید و backup را رمزنگاری کنید.
- CORS را به originهای مورد اعتماد محدود کنید.
- endpointهای ورود، backup، sync و ارسال پیام را rate-limit و server-authorize کنید.
- خطاهای داخلی و پاسخ سرویس‌های ثالث را مستقیماً به کاربر نمایش ندهید.
- قبل از انتشار production، build و تست TypeScript را اجرا کنید.
