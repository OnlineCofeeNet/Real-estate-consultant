import type { Settings } from '../types';

export const toPersianDigits = (num: string | number | undefined | null): string => {
  if (num === undefined || num === null || num === '') return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (x) => persianDigits[parseInt(x)]);
};

export const toEnglishDigits = (str: string | undefined | null): string => {
  if (!str) return '';
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let res = str.toString();
  for (let i = 0; i < 10; i++) {
    res = res.replace(persianDigits[i], i.toString()).replace(arabicDigits[i], i.toString());
  }
  return res;
};

export const normalizeSearchQuery = (str: string | undefined | null): string => {
  if (!str) return '';
  return toEnglishDigits(str)
    .trim()
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک');
};

export const formatCurrency = (num: number | string | undefined | null, currency: string = 'تومان'): string => {
  if (num === undefined || num === null || num === '') return `۰ ${currency}`;
  const str = toEnglishDigits(num.toString()).replace(/\D/g, '');
  if (!str) return `۰ ${currency}`;
  const formatted = Number(str).toLocaleString('en-US');
  return `${toPersianDigits(formatted)} ${currency}`;
};

export const IRANIAN_BANKS = [
  'بانک ملی ایران',
  'بانک ملت',
  'بانک صادرات ایران',
  'بانک تجارت',
  'بانک سپه',
  'بانک سامان',
  'بانک پاسارگاد',
  'بانک پارسیان',
  'بانک آینده',
  'بانک کشاورزی',
  'بانک مسکن',
  'بانک رفاه کارگران',
  'بانک شهر',
  'بانک اقتصاد نوین',
  'بانک کارآفرین',
  'بانک سینا',
  'بانک دی',
  'بانک گردشگری',
  'بانک خاورمیانه',
  'بانک سرمایه',
  'بانک قرض‌الحسنه مهر ایران',
  'بانک قرض‌الحسنه رسالت',
  'پست بانک ایران',
  'موسسه اعتباری ملل',
  'موسسه اعتباری نور'
];

export const getAgencySignature = (settings?: Settings | null): string => {
  if (!settings) return '';
  const lines: string[] = [];
  lines.push('────────────────────────');
  if (settings.agencyName) {
    lines.push(`🏢 ${settings.agencyName}${settings.slogan ? ` (${settings.slogan})` : ''}`);
  }
  
  const allPhones = [settings.phone1, ...(settings.additionalPhones || [])].filter(p => Boolean(p && p.trim()));
  if (allPhones.length > 0) {
    lines.push(`📞 تلفن تماس: ${allPhones.map(toPersianDigits).join(' - ')}`);
  }

  if (settings.address) {
    lines.push(`📍 آدرس: ${settings.address}`);
  }

  const socials: string[] = [];
  if (settings.telegramAgencyId) socials.push(`تلگرام: ${settings.telegramAgencyId}`);
  if (settings.baleAgencyId) socials.push(`بله: ${settings.baleAgencyId}`);
  if (settings.rubikaAgencyId) socials.push(`روبیکا: ${settings.rubikaAgencyId}`);
  if (settings.instagramAgencyId) socials.push(`اینستاگرام: ${settings.instagramAgencyId}`);
  
  if (socials.length > 0) {
    lines.push(`🌐 راه‌های ارتباطی:\n   ${socials.join('\n   ')}`);
  }

  return lines.join('\n');
};

export const appendAgencySignature = (message: string, settings?: Settings | null): string => {
  const sig = getAgencySignature(settings);
  if (!sig) return message;
  return `${message.trim()}\n\n${sig}`;
};

export const formatTemplateMessage = (
  template: string,
  settings?: Settings | null,
  customerName?: string
): string => {
  if (!template) return '';
  let res = template;
  if (settings?.agencyName) {
    res = res.replace(/{نام_املاک}/g, settings.agencyName);
  }
  if (customerName) {
    res = res.replace(/{نام_مشتری}/g, customerName);
  }
  if (settings?.phone1) {
    res = res.replace(/{تلفن_املاک}/g, settings.phone1);
    res = res.replace(/{phone1}/g, settings.phone1);
  }
  if (settings?.address) {
    res = res.replace(/{آدرس_املاک}/g, settings.address);
  }
  return res;
};

export const createInvoiceMessengerMessage = (
  contract: any,
  settings?: Settings | null,
  isReprint: boolean = false
): string => {
  const isRent = contract.type === 'rent';
  const contractTypeLabel = isRent ? 'رهن و اجاره (موجر و مستأجر)' : 'خرید و فروش';
  
  let msg = '';
  if (isReprint) {
    msg += `🔴 نسخه چاپ مجدد / فاکتور المثنی\n\n`;
  }
  
  msg += `📄 صورتحساب رسمی خدمات املاک ${isReprint ? '(چاپ مجدد)' : ''}\n`;
  if (settings?.agencyName) {
    msg += `🏢 ${settings.agencyName}\n`;
  }
  msg += `─────────────────────────\n`;
  msg += `🔢 شماره قرارداد: ${toPersianDigits(contract.contractNumber || '-')}\n`;
  msg += `📋 نوع معامله: ${contractTypeLabel}\n`;
  msg += `📅 تاریخ انجام قرارداد: ${toPersianDigits(contract.date || '-')}\n`;
  if (contract.endDate) {
    msg += `⏳ تاریخ اتمام قرارداد (۱ ساله): ${toPersianDigits(contract.endDate)}\n`;
  }
  if (contract.renewalDate) {
    msg += `🔄 تمدید شده در تاریخ: ${toPersianDigits(contract.renewalDate)} (دور ${toPersianDigits(contract.renewedCount || 1)})\n`;
  }
  msg += `\n`;
  msg += `👤 ${contract.party1Role || 'طرف اول'}: ${contract.party1?.fullName || '-'}\n`;
  msg += `👤 ${contract.party2Role || 'طرف دوم'}: ${contract.party2?.fullName || '-'}\n`;
  msg += `\n`;
  msg += `💰 ارقام و مبالغ معامله:\n`;
  if (isRent) {
    msg += `• ودیعه / رهن: ${formatCurrency(contract.price || 0)}\n`;
    if (contract.rent) {
      const dueInfo = contract.rentDueDay ? ` (موعد: روز ${toPersianDigits(contract.rentDueDay)} هر ماه)` : '';
      msg += `• اجاره بها ماهیانه: ${formatCurrency(contract.rent)}${dueInfo}\n`;
    }
  } else {
    msg += `• ثمن معامله: ${formatCurrency(contract.price || 0)}\n`;
  }
  msg += `• حق کمیسیون: ${formatCurrency(contract.commission || 0)}\n`;
  msg += `• مالیات بر ارزش افزوده: ${formatCurrency(contract.tax || 0)}\n`;
  msg += `• کل مبلغ قابل پرداخت: ${formatCurrency(contract.totalPayable || 0)}\n`;
  
  if (isReprint) {
    msg += `\n⚠️ توجه: این پیام به عنوان «نسخه چاپ مجدد / فاکتور المثنی» مجدداً از سامانه ارسال گردیده است.\n`;
  }

  return appendAgencySignature(msg, settings);
};

