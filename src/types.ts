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
  createdAt: number;
}

export interface Contract {
  id?: number;
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
  party1PosStatus?: 'pending' | 'success' | 'failed';
  party2PosStatus?: 'pending' | 'success' | 'failed';
  party1PosReceipt?: string;
  party2PosReceipt?: string;
  party1ChequeDate?: string;
  party2ChequeDate?: string;
  rentDueDay?: number; // روز موعد پرداخت اجاره در ماه (۱ الی ۳۱)
  renewalDate?: string; // تاریخ تمدید قرارداد
  renewedCount?: number; // تعداد دفعات تمدید

  status: 'draft' | 'party1_paid' | 'completed' | 'cancelled' | 'renewed';
  createdAt: number;
}

export interface Settings {
  id?: number;
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
  date: number;
  customerName: string;
  phone: string;
  messenger: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  chatId?: string;
}
