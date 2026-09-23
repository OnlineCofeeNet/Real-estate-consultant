import { ChartOfAccount } from '../types';

/**
 * Standard Default Chart of Accounts for Iranian Real Estate Agencies
 * ساختار درختی استاندارد کدینگ حسابداری مشاورین املاک ایران
 */
export const DEFAULT_REAL_ESTATE_ACCOUNTS: Omit<ChartOfAccount, 'id'>[] = [
  // ۱. دارایی‌های جاری (کد ۱)
  { code: '1', title: 'دارایی‌های جاری', nature: 'debtor', level: 'group', createdAt: Date.now(), isSystem: true },
  { code: '101', title: 'موجودی نقد و بانک', nature: 'debtor', level: 'general', parentId: 1, createdAt: Date.now(), isSystem: true },
  { code: '10101', title: 'صندوق اصلی دفتر املاک', nature: 'debtor', level: 'subsidiary', parentId: 2, createdAt: Date.now(), isSystem: true },
  { code: '10102', title: 'تنخواه گردان مدیریت', nature: 'debtor', level: 'subsidiary', parentId: 2, createdAt: Date.now(), isSystem: true },
  { code: '10103', title: 'بانک ملت (حساب متصل به کارتخوان POS)', nature: 'debtor', level: 'subsidiary', parentId: 2, createdAt: Date.now(), isSystem: true },
  { code: '10104', title: 'بانک ملی (حساب پشتیبان)', nature: 'debtor', level: 'subsidiary', parentId: 2, createdAt: Date.now(), isSystem: true },

  // اسناد دریافتنی تجاری و چک‌ها
  { code: '102', title: 'اسناد دریافتنی (چک‌های صیادی مشتریان)', nature: 'debtor', level: 'general', parentId: 1, createdAt: Date.now(), isSystem: true },
  { code: '10201', title: 'اسناد دریافتنی نزد صندوق (در جریان وصول)', nature: 'debtor', level: 'subsidiary', parentId: 7, createdAt: Date.now(), isSystem: true },
  { code: '10202', title: 'اسناد دریافتنی واگذار شده به بانک', nature: 'debtor', level: 'subsidiary', parentId: 7, createdAt: Date.now(), isSystem: true },
  { code: '10203', title: 'اسناد دریافتنی واخواست شده (چک‌های برگشتی)', nature: 'debtor', level: 'subsidiary', parentId: 7, createdAt: Date.now(), isSystem: true },

  // بدهکاران تجاری و مشتریان
  { code: '103', title: 'حساب‌های دریافتنی (بدهکاران کمیسیون)', nature: 'debtor', level: 'general', parentId: 1, createdAt: Date.now(), isSystem: true },
  { code: '10301', title: 'طرفین قراردادها (کمیسیون‌های نسیه/معوق)', nature: 'debtor', level: 'subsidiary', parentId: 11, createdAt: Date.now(), isSystem: true },

  // ۲. بدهی‌های جاری (کد ۲)
  { code: '2', title: 'بدهی‌های جاری و تعهدات', nature: 'creditor', level: 'group', createdAt: Date.now(), isSystem: true },
  { code: '201', title: 'اسناد و حساب‌های پرداختنی', nature: 'creditor', level: 'general', parentId: 13, createdAt: Date.now(), isSystem: true },
  { code: '20101', title: 'پورسانت پرداختنی مشاوران و همکاران', nature: 'creditor', level: 'subsidiary', parentId: 14, createdAt: Date.now(), isSystem: true },
  
  // وجوه امانی مشتریان (Trust Accounting) - تفکیک ۱۰۰٪ از دارایی و سود آژانس
  { code: '203', title: 'وجوه امانی مشتریان (حساب امانی ودیعه)', nature: 'creditor', level: 'general', parentId: 13, isTrustAccount: true, createdAt: Date.now(), isSystem: true },
  { code: '20301', title: 'ودیعه و پیش‌پرداخت امانی قراردادهای رهن و اجاره', nature: 'creditor', level: 'subsidiary', parentId: 16, isTrustAccount: true, createdAt: Date.now(), isSystem: true },
  { code: '20302', title: 'بیعانه امانی مبایعه‌نامه‌ها و قراردادهای فروش', nature: 'creditor', level: 'subsidiary', parentId: 16, isTrustAccount: true, createdAt: Date.now(), isSystem: true },

  // مالیات بر ارزش افزوده
  { code: '204', title: 'سایر بدهی‌های مالیاتی و عوارض', nature: 'creditor', level: 'general', parentId: 13, createdAt: Date.now(), isSystem: true },
  { code: '20401', title: 'مالیات بر ارزش افزوده پرداختنی (VAT)', nature: 'creditor', level: 'subsidiary', parentId: 19, createdAt: Date.now(), isSystem: true },

  // ۳. درآمدها (کد ۳)
  { code: '3', title: 'درآمدهای عملیاتی و خدمات املاک', nature: 'creditor', level: 'group', createdAt: Date.now(), isSystem: true },
  { code: '301', title: 'درآمد حق کمیسیون و کارمزد معاملات', nature: 'creditor', level: 'general', parentId: 21, createdAt: Date.now(), isSystem: true },
  { code: '30101', title: 'درآمد کمیسیون قراردادهای خرید و فروش', nature: 'creditor', level: 'subsidiary', parentId: 22, createdAt: Date.now(), isSystem: true },
  { code: '30102', title: 'درآمد کمیسیون قراردادهای رهن و اجاره', nature: 'creditor', level: 'subsidiary', parentId: 22, createdAt: Date.now(), isSystem: true },
  { code: '30103', title: 'درآمد تمدید قراردادهای اجاره', nature: 'creditor', level: 'subsidiary', parentId: 22, createdAt: Date.now(), isSystem: true },
  { code: '30104', title: 'درآمد کارشناسی قیمت و مشاوره ملکی', nature: 'creditor', level: 'subsidiary', parentId: 22, createdAt: Date.now(), isSystem: true },

  // ۴. هزینه‌های جاری دفتر املاک (کد ۴)
  { code: '4', title: 'هزینه‌های اداری، عمومی و توزیع', nature: 'debtor', level: 'group', createdAt: Date.now(), isSystem: true },
  { code: '401', title: 'هزینه‌های جاری دفتر', nature: 'debtor', level: 'general', parentId: 27, createdAt: Date.now(), isSystem: true },
  { code: '40101', title: 'هزینه اجاره دفتر املاک', nature: 'debtor', level: 'subsidiary', parentId: 28, createdAt: Date.now(), isSystem: true },
  { code: '40102', title: 'هزینه حقوق و دستمزد پرسنل دفتری', nature: 'debtor', level: 'subsidiary', parentId: 28, createdAt: Date.now(), isSystem: true },
  { code: '40103', title: 'هزینه تبلیغات (دیوار، شیپور، پیامک، بنر)', nature: 'debtor', level: 'subsidiary', parentId: 28, createdAt: Date.now(), isSystem: true },
  { code: '40104', title: 'هزینه قبوض (آب، برق، گاز، اینترنت)', nature: 'debtor', level: 'subsidiary', parentId: 28, createdAt: Date.now(), isSystem: true },
  { code: '40105', title: 'هزینه ملزومات اداری و کاغذ چاپگر فاکتور', nature: 'debtor', level: 'subsidiary', parentId: 28, createdAt: Date.now(), isSystem: true },
  { code: '40106', title: 'هزینه پذیرایی، تنقلات و چای', nature: 'debtor', level: 'subsidiary', parentId: 28, createdAt: Date.now(), isSystem: true },
  { code: '40107', title: 'هزینه پورسانت و سهم مشاوران و مباشران', nature: 'debtor', level: 'subsidiary', parentId: 28, createdAt: Date.now(), isSystem: true }
];
