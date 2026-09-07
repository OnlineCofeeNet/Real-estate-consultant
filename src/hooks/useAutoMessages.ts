import { useEffect, useRef } from 'react';
import { db } from '../db/db';
import axios from 'axios';
import moment from 'moment-jalaali';
import type { Customer } from '../types';
import { appendAgencySignature, formatTemplateMessage, toEnglishDigits } from '../utils/format';
import { hasActiveSession } from '../services/auth';

export const useAutoMessages = () => {
  const hasRun = useRef(false);

  useEffect(() => {
    // Background automations must never read customer data or bot credentials before login.
    if (!hasActiveSession()) return;
    if (hasRun.current) return;
    hasRun.current = true;

    const runAutomations = async () => {
      try {
        const settings = await db.settings.get(1);
        if (!settings || !hasActiveSession()) return;

        const todayDate = moment().format('jYYYY/jMM/jDD');
        const tomorrowDate = moment().add(1, 'days').format('jYYYY/jMM/jDD');
        const tomorrowDayOfMonth = parseInt(moment().add(1, 'days').format('jD'), 10);
        const todayMoment = moment(todayDate, 'jYYYY/jMM/jDD');
        
        const customers = await db.customers.toArray();
        const contracts = await db.contracts.toArray();

        const sendMultiPlatform = async (customer: Customer, rawText: string, type: string) => {
          if (!hasActiveSession()) return;
          const formatted = formatTemplateMessage(rawText, settings, customer.fullName);
          const text = appendAgencySignature(formatted, settings);

          const todayMs = new Date().setHours(0,0,0,0);
          const existingLogs = await db.messageLogs
            .where('customerName').equals(customer.fullName)
            .toArray();
            
          const alreadySentToday = existingLogs.some(log => 
            log.message === text && log.date >= todayMs
          );

          if (alreadySentToday) return;

          const activePlatforms = [];
          if (settings.telegramToken && customer.phone) activePlatforms.push({ name: 'telegram', token: settings.telegramToken, id: customer.phone });
          if (settings.baleToken && customer.phone) activePlatforms.push({ name: 'bale', token: settings.baleToken, id: customer.phone });
          if (settings.rubikaToken && customer.phone) activePlatforms.push({ name: 'rubika', token: settings.rubikaToken, id: customer.phone });

          for (const p of activePlatforms) {
            if (!hasActiveSession()) return;
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

        for (const customer of customers) {
          if (!customer.autoSendMessages) continue;
          const intro = `جناب/سرکار ${customer.fullName}،\n\n`;

          if (customer.birthDate && customer.birthDate.substring(5) === todayDate.substring(5) && settings.defaultMessages?.birthday) {
            await sendMultiPlatform(customer, intro + settings.defaultMessages.birthday, 'birthday');
          }

          if (customer.contractEndDate) {
            const custEndM = moment(customer.contractEndDate, 'jYYYY/jMM/jDD');
            const isCustExpired = todayMoment.isAfter(custEndM, 'day');
            if (!isCustExpired && customer.contractEndDate === todayDate && settings.defaultMessages?.contractExpiry) {
              await sendMultiPlatform(customer, intro + settings.defaultMessages.contractExpiry, 'contract');
            }

            if (settings.autoSendRentReminder && !isCustExpired) {
              const matchesRentDueDay = customer.rentDueDay && customer.rentDueDay === tomorrowDayOfMonth;
              const matchesLegacyDate = customer.rentPaymentDate === todayDate;
              if ((matchesRentDueDay || matchesLegacyDate) && settings.defaultMessages?.rentPayment) {
                await sendMultiPlatform(customer, intro + settings.defaultMessages.rentPayment, 'rent');
              }
            }
          }
        }

        for (const contract of contracts) {
          if (contract.status === 'cancelled' || contract.type !== 'rent') continue;
          const activeStartDate = contract.renewalDate || contract.date;
          const activeEndDate = contract.endDate;
          if (!activeEndDate) continue;

          const startM = moment(activeStartDate, 'jYYYY/jMM/jDD');
          const endM = moment(activeEndDate, 'jYYYY/jMM/jDD');
          const isExpired = todayMoment.isAfter(endM, 'day');
          if (isExpired) continue;

          if (activeEndDate === todayDate) {
            const expiryText = settings.defaultMessages?.contractExpiry || 'مشتری گرامی، موعد قرارداد شما به پایان رسیده است.';
            if (contract.party1) await sendMultiPlatform(contract.party1, `جناب/سرکار ${contract.party1.fullName} (${contract.party1Role})،\n\n${expiryText}`, 'contract');
            if (contract.party2) await sendMultiPlatform(contract.party2, `جناب/سرکار ${contract.party2.fullName} (${contract.party2Role})،\n\n${expiryText}`, 'contract');
          }

          if (settings.autoSendRentReminder && contract.rentDueDay && contract.rentDueDay === tomorrowDayOfMonth) {
            const rentText = settings.defaultMessages?.rentPayment || 'مشتری گرامی، فردا موعد پرداخت اجاره‌بها می‌باشد.';
            const tenant = (contract.party1Role === 'مستأجر' ? contract.party1 : contract.party2) || contract.party2;
            if (tenant) await sendMultiPlatform(tenant, `جناب/سرکار ${tenant.fullName}،\n\n${rentText}`, 'rent');
          }
        }

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
