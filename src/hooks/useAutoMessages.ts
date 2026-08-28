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
          if (settings.telegramToken && customer.telegramId) activePlatforms.push({ name: 'telegram', token: settings.telegramToken, id: customer.telegramId });
          if (settings.baleToken && customer.baleId) activePlatforms.push({ name: 'bale', token: settings.baleToken, id: customer.baleId });
          if (settings.rubikaToken && customer.rubikaId) activePlatforms.push({ name: 'rubika', token: settings.rubikaToken, id: customer.rubikaId });

          for (const p of activePlatforms) {
            const cleanChatId = toEnglishDigits(p.id).trim();
            try {
              await axios.post('/api/send-message', {
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
                status: 'sent',
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


        // 1. Check Customer Dates (Birthday, Contract End, Rent Payment)
        for (const customer of customers) {
          if (!customer.autoSendMessages) continue;

          const intro = `جناب/سرکار ${customer.fullName}،\n\n`;

          if (customer.birthDate && customer.birthDate.substring(5) === todayDate.substring(5)) {
            if (settings.defaultMessages?.birthday) {
              await sendMultiPlatform(customer, intro + settings.defaultMessages.birthday, 'birthday');
            }
          }

          if (customer.contractEndDate === todayDate) {
            if (settings.defaultMessages?.contractExpiry) {
              await sendMultiPlatform(customer, intro + settings.defaultMessages.contractExpiry, 'contract');
            }
          }

          // بررسی موعد اجاره‌بها تنها در صورت فعال بودن در تنظیمات
          if (settings.autoSendRentReminder && customer.rentPaymentDate === todayDate) {
            if (settings.defaultMessages?.rentPayment) {
              await sendMultiPlatform(customer, intro + settings.defaultMessages.rentPayment, 'rent');
            }
          }
        }

        // 2. Check Cheque Reminders
        if (settings.autoSendChequeReminder) {
          for (const contract of contracts) {
            if (contract.status === 'cancelled') continue;
            
            const text = settings.defaultMessages?.chequeDue || 'یادآوری: فردا موعد چک شما می‌باشد.';
            
            if (contract.party1PaymentMethod === 'cheque' && contract.party1ChequeDate === tomorrowDate && contract.party1) {
              await sendMultiPlatform(contract.party1, `جناب/سرکار ${contract.party1.fullName}،\n\n${text}`, 'cheque');
            }
            if (contract.party2PaymentMethod === 'cheque' && contract.party2ChequeDate === tomorrowDate && contract.party2) {
              await sendMultiPlatform(contract.party2, `جناب/سرکار ${contract.party2.fullName}،\n\n${text}`, 'cheque');
            }
          }
        }

      } catch (err) {
        console.error('Automation error:', err);
      }
    };

    runAutomations();
  }, []);
};
