import Num2persian from 'num2persian';
import { formatCurrency as formatCurrencyUtil, toPersianDigits } from './format';

export const validateNationalId = (code: string): boolean => {
  if (!/^\d{10}$/.test(code)) return false;
  const check = parseInt(code[9], 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(code[i], 10) * (10 - i);
  }
  const rem = sum % 11;
  return (rem < 2 && check === rem) || (rem >= 2 && check === 11 - rem);
};

export const validatePhone = (phone: string): boolean => {
  return /^09\d{9}$/.test(phone);
};

export const formatCurrency = (amount: number | string, currency: string = 'تومان'): string => {
  return formatCurrencyUtil(amount, currency);
};

export const numberToWords = (amount: number): string => {
  if (!amount) return '';
  return Num2persian(amount);
};

export const formatBankCard = (card: string): string => {
  const digitsOnly = card.replace(/\D/g, '');
  const formatted = digitsOnly.replace(/(\d{4})(?=\d)/g, '$1-');
  return toPersianDigits(formatted);
};

export const formatSheba = (sheba: string): string => {
  const alphanumericOnly = sheba.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const formatted = alphanumericOnly.replace(/(.{4})(?=.)/g, '$1-');
  return toPersianDigits(formatted);
};

