export interface Customer {
  id?: number;
  fullName: string;
  nationalId: string;
  phone: string;
  phone2?: string;
  birthDate?: string;
  contractEndDate?: string;
  contractStartDate?: string;
  rentPaymentDate?: string;
  rentDueDay?: number; // روز موعد پرداخت اجاره در ماه (۱ الی ۳۱)
  autoSendMessages?: boolean;
  description?: string;
  roles?: string[]; // Made optional, as it's no longer required in creation
  customerType?: 'landlord' | 'tenant' | 'buyer' | 'seller' | 'other';
  hasUncollectedCheque?: boolean; // دارای چک وصول نشده
  hasDebt?: boolean; // دارای بدهی
  debtAmount?: number; // مبلغ بدهی به تومان
  messengerId?: string;
  telegramId?: string;
  rubikaId?: string;
  baleId?: string;
  agencyId?: string; // Multi-tenancy support
  updatedAt?: number; // Timestamp-based sync support
  syncStatus?: 'synced' | 'pending' | 'conflict';
  createdAt: number;
}

export interface Contract {
  id?: number;
  agencyId?: string; // Multi-tenancy support
  updatedAt?: number; // Timestamp-based sync support
  syncStatus?: 'synced' | 'pending' | 'conflict';
  contractNumber: string;
  date: string;
  endDate?: string;
  party1Role: string;
  party2Role: string;
  party1: Customer | null;
  party2: Customer | null;
  type: 'sale' | 'rent';
  price: number;
  rent: number;
  commission: number;
  tax: number;
  totalPayable: number;
  
  // Dual payment fields
  party1PaymentMethod: 'cash' | 'transfer' | 'cheque' | 'pos' | 'credit' | '';
  party2PaymentMethod: 'cash' | 'transfer' | 'cheque' | 'pos' | 'credit' | '';
  party1SharePercent?: number;
  party1PosStatus?: 'pending' | 'success' | 'failed';
  party2PosStatus?: 'pending' | 'success' | 'failed';
  party1PosReceipt?: string;
  party2PosReceipt?: string;
  party1ChequeDate?: string;
  party2ChequeDate?: string;
  rentDueDay?: number; // روز موعد پرداخت اجاره در ماه (۱ الی ۳۱)
  renewalDate?: string; // تاریخ تمدید قرارداد
  renewedCount?: number; // تعداد دفعات تمدید

  // اطلاعات مباشر / مشاور معامله
  agentName?: string; // نام و نام خانوادگی مباشر / مشاور
  agentPhone?: string; // شماره تماس مباشر
  agentLicenseCode?: string; // کد صنفی / مجوز مباشر
  agentCommissionPercent?: number; // درصد سهم مباشر از کمیسیون (مثلاً ۳۰ درصد)
  agentShareAmount?: number; // مبلغ سهم مباشر به تومان
  showAgentOnInvoice?: boolean; // نمایش مشخصات و امضای مباشر در فاکتور نهایی

  status: 'draft' | 'party1_paid' | 'completed' | 'cancelled' | 'renewed';
  createdAt: number;
}

export interface Settings {
  id?: number;
  agencyId?: string; // Multi-tenancy support
  updatedAt?: number;
  agencyName: string;
  slogan: string;
  phone1: string;
  phone2: string;
  fax: string;
  email: string;
  address: string;
  currency: 'ریال' | 'تومان';
  commissionRate: number;
  taxRate: number;
  rentDepositConversionRate?: number;
  rentCommissionPercent?: number;
  defaultParty1SharePercent?: number;
  economicCode?: string;
  nationalId?: string;
  posIp: string;
  posPort: string;
  posTerminalId: string;
  psp: string;
  bankDetails: string;
  accountHolderName?: string;
  accountNumber?: string;
  cardNumber?: string;
  shebaNumber?: string;
  
  // Extended Agency Info
  additionalPhones?: string[];
  telegramAgencyId?: string;
  instagramAgencyId?: string;
  baleAgencyId?: string;
  rubikaAgencyId?: string;
  socialLinks?: { platform: string; id: string }[];
  logoBase64?: string;
  stampBase64?: string;
  
  // Customization
  theme: string;
  themeEffect?: string;
  font?: string;
  darkMode: boolean;
  invoiceLayout?: 'standard' | 'modern' | 'compact';
  paperSize?: '57mm' | '80mm' | 'a4' | 'a5';
  printOptions?: {
    showLogo?: boolean;
    showAddress?: boolean;
    showPhones?: boolean;
    showBank?: boolean;
    showNationalId?: boolean;
    showEconomicCode?: boolean;
  };
  
  // Custom Messages
  invoiceMessageBuyer?: string;
  invoiceMessageSeller?: string;
  invoiceMessageTenant?: string;
  invoiceMessageLandlord?: string;
  invoiceDescription?: string;

  // Automation & Defaults
  autoSendInvoices: boolean;
  smsProvider?: 'none' | 'farazsms' | 'smsir';
  smsToken?: string;
  smsLineNumber?: string;
  autoSendSmsInvoice?: boolean;
  smsTemplateText?: string;
  autoSendChequeReminder?: boolean;
  autoSendRentReminder?: boolean;
  baleToken: string;
  rubikaToken: string;
  telegramToken: string;
  adminTelegramId?: string;
  adminBaleId?: string;
  adminRubikaId?: string;
  agents?: AgentProfile[]; // فهرست مباشرین املاک (تنظیم شده در تنظیمات)
  defaultMessages?: {
    welcome?: string;
    birthday: string;
    contractExpiry: string;
    rentPayment: string;
    chequeDue: string;
    businessCard: string;
  };
}

export interface MessageLog {
  id?: number;
  agencyId?: string; // Multi-tenancy support
  updatedAt?: number;
  syncStatus?: 'synced' | 'pending' | 'conflict';
  date: number;
  customerName: string;
  phone: string;
  messenger: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  chatId?: string;
}

export interface AgentProfile {
  id: string; // شناسه یکتا
  firstName?: string; // نام
  lastName?: string; // نام خانوادگی
  fullName: string; // نام و نام خانوادگی کامل
  phone: string; // تلفن همراه / موبایل
  guildCode?: string; // کد صنفی
  licenseCode?: string; // کد صنفی / مجوز فعالیت اتحادیه
  description?: string; // توضیحات و یادداشت‌ها
  commissionPercent?: number; // درصد سهم کمیسیون پیش‌فرض (مثلاً ۳۰٪)
  telegramId?: string; // Chat ID تلگرام (اختیاری)
  baleId?: string; // Chat ID بله (اختیاری)
  rubikaId?: string; // شناسه روبیکا (اختیاری)
  status?: 'active' | 'inactive'; // وضعیت فعالیت
  createdAt: number;
  updatedAt?: number;
}

export type PropertyType = 'apartment' | 'villa' | 'shop' | 'land' | 'office' | 'warehouse' | 'commercial' | 'other';
export type TransactionType = 'sale' | 'rent' | 'mortgage' | 'rent_mortgage' | 'exchange' | 'pre_sale' | 'partnership';
export type PropertyStatus = 'available' | 'reserved' | 'sold' | 'rented' | 'archived';
export type PropertyFeature = string;
export type RequestStatus = 'open' | 'matched' | 'closed' | 'archived';
export type ListingSource = 'agency' | 'website' | 'bot' | 'user';

export interface Property {
  id?: number;
  code?: string;
  title: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  status: PropertyStatus;
  price?: number;
  deposit?: number;
  rent?: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  totalFloors?: number;
  yearBuilt?: number;
  parkingSpaces?: number;
  address?: string;
  features?: PropertyFeature[];
  description?: string;
  notes?: string;
  ownerId?: number;
  source?: ListingSource | string;
  listedAt?: number;
  createdAt: number;
  updatedAt?: number;
  agencyId?: string;
}

export interface PropertyListing {
  id?: number;
  agencyId?: string;
  title: string;
  dealType: 'sale' | 'rent' | 'presale';
  propertyType: 'apartment' | 'villa' | 'office' | 'commercial' | 'land';
  area: number; // متراژ متر مربع
  rooms: number;
  floor?: number;
  totalFloors?: number;
  neighborhood: string;
  price?: number; // قیمت کل به تومان
  deposit?: number; // ودیعه (رهن)
  monthlyRent?: number; // اجاره ماهانه
  features: string[]; // ['پارکینگ', 'آسانسور', 'انباری', 'بالکن', ...]
  
  // اطلاعات خصوصی تماس - فقط برای مشاور املاک قابل نمایش است و به مشتریان ارسال نمی‌شود
  ownerName?: string; // نام صاحب ملک
  ownerPhone?: string; // شماره تلفن صاحب ملک (محرمانه)
  residentName?: string; // نام ساکن / مستأجر فعلی
  residentPhone?: string; // شماره تلفن ساکن فعلی (محرمانه)
  
  generatedDescription?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface PropertyRequest {
  id?: number;
  agencyId?: string;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  title?: string;
  dealType?: 'sale' | 'rent';
  transactionType?: TransactionType;
  propertyType?: PropertyType;
  status?: RequestStatus;
  minPrice?: number;
  maxPrice?: number;
  minDeposit?: number;
  maxDeposit?: number;
  minRent?: number;
  maxRent?: number;
  minArea?: number;
  maxArea?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minRooms?: number;
  areaId?: string;
  preferredAreas?: string[];
  preferredNeighborhoods?: string[];
  features?: string[];
  description?: string;
  notes?: string;
  source?: ListingSource | string;
  assignedAgentId?: string;
  expiresAt?: number;
  createdAt: number;
  updatedAt?: number;
}

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'backup';
export type AuditEntity = 'customer' | 'contract' | 'settings' | 'user' | 'system' | 'property' | 'finance';

export interface AuditLog {
  id?: number;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  description: string;
  before?: unknown;
  after?: unknown;
  createdAt: number;
}

export interface SmartMatchResult {
  property: PropertyListing;
  request: PropertyRequest;
  matchScore: number; // 0 to 100
  matchReasons: string[];
  suggestedMessage: string;
}

// =======================
// ACCOUNTING SYSTEM TYPES
// =======================

export type AccountNature = 'debtor' | 'creditor' | 'dual';
export type AccountLevel = 'group' | 'general' | 'subsidiary' | 'detail';
export type ChequeType = 'receivable' | 'payable';
export type ChequeStatus = 'in_collection' | 'collected' | 'bounced' | 'transferred' | 'returned';

export interface ChartOfAccount {
  id?: number;
  agencyId?: string;
  code: string;
  title: string;
  nature: AccountNature;
  level: AccountLevel;
  parentId?: number;
  isSystem?: boolean;
  isTrustAccount?: boolean; // وجوه امانی (پول پیش رهن و ودیعه مشتریان)
  balance?: number; // مانده حساب به تومان
  createdAt: number;
}

export interface JournalItem {
  id?: number;
  entryId?: number;
  accountId: number;
  accountTitle?: string;
  accountCode?: string;
  description: string;
  debit: number; // بدهکار (تومان)
  credit: number; // بستانکار (تومان)
  detailPersonName?: string;
}

export interface JournalEntry {
  id?: number;
  agencyId?: string;
  voucherNumber: number;
  date: string; // تاریخ شمسی ۱۴۰۴/۰۱/۱۵
  description: string;
  status: 'approved' | 'draft';
  referenceType?: 'contract' | 'cheque' | 'expense' | 'manual';
  referenceId?: string;
  items: JournalItem[];
  totalDebit: number;
  totalCredit: number;
  createdAt: number;
}

export interface ChequeRecord {
  id?: number;
  agencyId?: string;
  chequeNumber: string;
  sayadNumber: string; // شناسه ۱۶ رقمی صیادی
  type: ChequeType; // دریافتی / پرداختی
  bankName: string;
  bankBranch?: string;
  amount: number; // به تومان
  dueDate: string; // تاریخ سررسید شمسی
  issuerName: string;
  issuerNationalCode?: string;
  recipientName: string;
  status: ChequeStatus;
  contractId?: number;
  customerId?: number;
  description?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface ExpenseRecord {
  id?: number;
  agencyId?: string;
  title: string;
  category: 'rent_office' | 'utilities' | 'marketing' | 'salary' | 'stationery' | 'other';
  amount: number; // تومان
  date: string; // تاریخ شمسی
  paidFromAccountId: number; // حساب پرداخت‌کننده (بانک/صندوق)
  paidTo?: string;
  receiptNumber?: string;
  description?: string;
  createdAt: number;
}

// =======================
// AUTH & USER TYPES
// =======================

export type UserRole = 'admin' | 'manager' | 'agent' | 'accountant' | 'read_only' | 'pending';

export interface AuthUser {
  id?: number;
  username: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  email?: string;
  phone?: string;
  securityQuestion1?: string;
  securityAnswer1Hash?: string;
  securityQuestion2?: string;
  securityAnswer2Hash?: string;
  lastLoginAt?: number;
  createdAt: number;
}

// =======================
// INVOICE & PAYMENT TYPES
// =======================

export type PaymentMethod = 'cash' | 'transfer' | 'cheque' | 'pos' | 'credit';

export interface Invoice {
  id?: number;
  invoiceNumber: string;
  contractNumber: string;
  customerId?: number;
  customerName: string;
  total: number;
  paidAmount?: number;
  issuedAt: number;
  dueDate?: string;
  status?: 'unpaid' | 'partial' | 'paid' | 'overpaid';
  agencyId?: string;
}

export interface Payment {
  id?: number;
  invoiceId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  status: 'completed' | 'pending' | 'failed';
  paidAt: number;
  receiptNumber?: string;
  notes?: string;
  agencyId?: string;
}

