export type EntityRole = 'landlord' | 'tenant' | 'buyer' | 'seller' | 'other';
export type PaymentMethod = 'cash' | 'transfer' | 'cheque' | 'pos' | 'credit';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export type UserRole = 'admin' | 'manager' | 'agent' | 'accountant';

export interface AuthUser {
  id?: number;
  username: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  securityQuestion1?: string;
  securityAnswer1Hash?: string;
  securityQuestion2?: string;
  securityAnswer2Hash?: string;
  phone?: string;
  email?: string;
  createdAt: number;
  lastLoginAt?: number;
}

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
  rentDueDay?: number;
  autoSendMessages?: boolean;
  description?: string;
  roles?: string[];
  customerType?: EntityRole;
  hasUncollectedCheque?: boolean;
  hasDebt?: boolean;
  debtAmount?: number;
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
  party1PaymentMethod: PaymentMethod | '';
  party2PaymentMethod: PaymentMethod | '';
  party1PosStatus?: 'pending' | 'success' | 'failed';
  party2PosStatus?: 'pending' | 'success' | 'failed';
  party1PosReceipt?: string;
  party2PosReceipt?: string;
  party1ChequeDate?: string;
  party2ChequeDate?: string;
  party1SharePercent?: number;
  rentDueDay?: number;
  renewalDate?: string;
  renewedCount?: number;
  status: 'draft' | 'party1_paid' | 'completed' | 'cancelled' | 'renewed';
  createdAt: number;
}

export interface Invoice {
  id?: number;
  invoiceNumber: string;
  contractId: number;
  contractNumber: string;
  customerId?: number;
  customerName: string;
  customerPhone: string;
  partyRole: string;
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  status: 'issued' | 'partial' | 'paid' | 'cancelled';
  issuedAt: number;
  dueDate?: string;
}

export interface Payment {
  id?: number;
  invoiceId: number;
  contractId: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  chequeDate?: string;
  note?: string;
  paidAt: number;
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
  additionalPhones?: string[];
  telegramAgencyId?: string;
  instagramAgencyId?: string;
  baleAgencyId?: string;
  rubikaAgencyId?: string;
  socialLinks?: { platform: string; id: string }[];
  logoBase64?: string;
  stampBase64?: string;
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
  invoiceMessageBuyer?: string;
  invoiceMessageSeller?: string;
  invoiceMessageTenant?: string;
  invoiceMessageLandlord?: string;
  invoiceDescription?: string;
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

export type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'export' | 'import' | 'payment';
export type AuditEntity = 'customer' | 'contract' | 'settings' | 'invoice' | 'payment' | 'backup' | 'system';

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
