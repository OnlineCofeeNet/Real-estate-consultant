import { useEffect, useRef } from 'react';
import { db } from '../db/db';
import axios from 'axios';
import moment from 'moment-jalaali';
import type { Customer } from '../types';
import { appendAgencySignature, formatTemplateMessage, toEnglishDigits } from '../utils/format';

export const useAutoMessages = () => {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const runAutomations = async () => {
      try {
        const settings = await db.settings.get(1);
        if (!settings) return;

        const todayDate = moment().format('jYYYY/jMM/jDD');
        const tomorrowDate = moment().add(1, 'days').format('jYYYY/jMM/jDD');
        const tomorrowDayOfMonth = parseInt(moment().add(1, 'days').format('jD'), 10);
        const todayMoment = moment(todayDate, 'jYYYY/jMM/jDD');
        
        const customers = await db.customers.toArray();
        const contracts = await db.contracts.toArray();

        const sendMultiPlatform = async (customer: Customer, rawText: string, type: string) => {
          // Format placeholders and append agency signature to message
          const formatted = formatTemplateMessage(rawText, settings, customer.fullName);
          const text = appendAgencySignature(formatted, settings);

          // Prevent spamming the same automated message on the same day
          const todayMs = new Date().setHours(0,0,0,0);
          const existingLogs = await db.messageLogs
            .where('customerName').equals(customer.fullName)
            .toArray();
            
          const alreadySentToday = existingLogs.some(log => 
            log.message === text && log.date >= todayMs
          );

          if (alreadySentToday) return;

          const activePlatforms = [];
          if (settings.telegramToken && (customer.phone)) activePlatforms.push({ name: 'telegram', token: settings.telegramToken, id: customer.phone });
          if (settings.baleToken && (customer.phone)) activePlatforms.push({ name: 'bale', token: settings.baleToken, id: customer.phone });
          if (settings.rubikaToken && (customer.phone)) activePlatforms.push({ name: 'rubika', token: settings.rubikaToken, id: customer.phone });

          for (const p of activePlatforms) {
            const cleanChatId = toEnglishDigits(p.id).trim();
            try {
              const res = await axios.post('/api/send-message', {
                platform: p.name,
                token: p.token,
                chatId: cleanChatId,
                message: text
              });
              await db.messageLogs.add({
                date: Date.now(),
                customerName: customer.fullName,
                phone: customer.phone,
                messenger: p.name,
                message: text,
                status: res.data?.success ? 'sent' : 'failed',
                chatId: cleanChatId
              } as any);
            } catch (err) {
              await db.messageLogs.add({
                date: Date.now(),
                customerName: customer.fullName,
                phone: customer.phone,
                messenger: p.name,
                message: text,
                status: 'failed',
                chatId: cleanChatId
              } as any);
            }
          }
        };


        // 1. Check Customer Dates (Birthday, Contract Expiry, Rent Payment)
        for (const customer of customers) {
          if (!customer.autoSendMessages) continue;

          const intro = `جناب/سرکار ${customer.fullName}،\n\n`;

          // زادروز
          if (customer.birthDate && customer.birthDate.substring(5) === todayDate.substring(5)) {
            if (settings.defaultMessages?.birthday) {
              await sendMultiPlatform(customer, intro + settings.defaultMessages.birthday, 'birthday');
            }
          }

          // اتمام قرارداد (اعتبار ۱ ساله - بعد از ۱ سال ارسال نمی‌شود)
          if (customer.contractEndDate) {
            const custEndM = moment(customer.contractEndDate, 'jYYYY/jMM/jDD');
            const isCustExpired = todayMoment.isAfter(custEndM, 'day');
            
            if (!isCustExpired && customer.contractEndDate === todayDate) {
              if (settings.defaultMessages?.contractExpiry) {
                await sendMultiPlatform(customer, intro + settings.defaultMessages.contractExpiry, 'contract');
              }
            }

            // بررسی موعد اجاره‌بها در صورت فعال بودن در تنظیمات
            // یک روز مانده به موعد پرداخت اجاره در ماه (تا مدت ۱ ساله اتمام قرارداد)
            if (settings.autoSendRentReminder && !isCustExpired) {
              const matchesRentDueDay = customer.rentDueDay && customer.rentDueDay === tomorrowDayOfMonth;
              const matchesLegacyDate = customer.rentPaymentDate === todayDate;

              if (matchesRentDueDay || matchesLegacyDate) {
                if (settings.defaultMessages?.rentPayment) {
                  await sendMultiPlatform(customer, intro + settings.defaultMessages.rentPayment, 'rent');
                }
              }
            }
          }
        }

        // 2. Check Rent Contracts (اتمام قرارداد ۱ ساله رهن و اجاره و یادآوری اجاره‌بها ۱ روز قبل از موعد)
        for (const contract of contracts) {
          if (contract.status === 'cancelled') continue;
          if (contract.type !== 'rent') continue; // فقط قراردادهای رهن و اجاره

          const activeStartDate = contract.renewalDate || contract.date;
          const activeEndDate = contract.endDate;
          if (!activeEndDate) continue;

          const startM = moment(activeStartDate, 'jYYYY/jMM/jDD');
          const endM = moment(activeEndDate, 'jYYYY/jMM/jDD');

          // اعتبار ۱ ساله پیام پرداخت اجاره و اتمام قرارداد: بعد از ۱ سال ارسال نمی‌گردد مگر اینکه تمدید شود
          const isExpired = todayMoment.isAfter(endM, 'day');
          if (isExpired) {
            continue; // بیش از یک سال سپری شده و تمدید نشده، عدم ارسال پیام به هیچ یک از طرفین
          }

          // الف) پیام اتمام قرارداد رهن و اجاره در روز موعد اتمام (۱ ساله) به هر دو طرف
          if (activeEndDate === todayDate) {
            const expiryText = settings.defaultMessages?.contractExpiry || 
              'مشتری گرامی، موعد ۱ ساله قرارداد رهن و اجاره شما به پایان رسیده است. در صورت تمایل به تمدید قرارداد، لطفاً با مشاور املاک تماس حاصل فرمایید.';
            
            if (contract.party1) {
              await sendMultiPlatform(contract.party1, `جناب/سرکار ${contract.party1.fullName} (${contract.party1Role})،\n\n${expiryText}`, 'contract');
            }
            if (contract.party2) {
              await sendMultiPlatform(contract.party2, `جناب/سرکار ${contract.party2.fullName} (${contract.party2Role})،\n\n${expiryText}`, 'contract');
            }
          }

          // ب) پیام پرداخت اجاره بها: در هر ماه دقیقاً ۱ روز مانده به موعد پرداخت اجاره تا پایان مدت ۱ ساله قرارداد
          if (settings.autoSendRentReminder && contract.rentDueDay && contract.rentDueDay === tomorrowDayOfMonth) {
            const rentText = settings.defaultMessages?.rentPayment || 
              'مشتری گرامی، یادآوری می‌گردد فردا موعد پرداخت اجاره‌بها ماهیانه می‌باشد. لطفاً نسبت به پرداخت به موقع اقدام فرمایید.';
            
            // ارسال به طرف مستأجر (یا طرف دوم در رهن و اجاره)
            const tenant = (contract.party1Role === 'مستأجر' ? contract.party1 : contract.party2) || contract.party2;
            if (tenant) {
              await sendMultiPlatform(tenant, `جناب/سرکار ${tenant.fullName}،\n\n${rentText}`, 'rent');
            }
          }
        }

        // 3. Check Cheque Reminders
        if (settings.autoSendChequeReminder) {
          for (const contract of contracts) {
            if (contract.status === 'cancelled') continue;
            
            const text = settings.defaultMessages?.chequeDue || 'یادآوری: فردا موعد سررسید چک شما می‌باشد.';
            
            if (contract.party1PaymentMethod === 'cheque' && contract.party1ChequeDate === tomorrowDate && contract.party1) {
              await sendMultiPlatform(contract.party1, `جناب/سرکار ${contract.party1.fullName}،\n\n${text}`, 'cheque');
            }
            if (contract.party2PaymentMethod === 'cheque' && contract.party2ChequeDate === tomorrowDate && contract.party2) {
              await sendMultiPlatform(contract.party2, `جناب/سرکار ${contract.party2.fullName}،\n\n${text}`, 'cheque');
            }
          }
        }

      } catch (err: any) {
        console.log('Notice: Automation routine skipped:', err?.message || 'unknown');
      }
    };

    runAutomations();
  }, []);
};
