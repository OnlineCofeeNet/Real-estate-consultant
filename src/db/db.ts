import Dexie, { type Table } from 'dexie';
export { useLiveQuery } from 'dexie-react-hooks';
import type { 
  Customer, 
  Contract, 
  Settings, 
  MessageLog, 
  PropertyListing, 
  PropertyRequest, 
  ChartOfAccount, 
  JournalEntry, 
  ChequeRecord, 
  ExpenseRecord,
  AuthUser,
  Invoice,
  Payment,
  AuditLog
} from '../types';

export class AppDatabase extends Dexie {
  customers!: Table<Customer, number>;
  contracts!: Table<Contract, number>;
  settings!: Table<Settings, number>;
  messageLogs!: Table<MessageLog, number>;
  properties!: Table<PropertyListing, number>;
  propertyRequests!: Table<PropertyRequest, number>;
  accounts!: Table<ChartOfAccount, number>;
  journalEntries!: Table<JournalEntry, number>;
  cheques!: Table<ChequeRecord, number>;
  expenses!: Table<ExpenseRecord, number>;
  users!: Table<AuthUser, number>;
  invoices!: Table<Invoice, number>;
  payments!: Table<Payment, number>;
  auditLogs!: Table<AuditLog, number>;

  constructor() {
    super('RealEstateInvoiceDB');
    this.version(1).stores({
      customers: '++id, fullName, nationalId, phone, roles, createdAt',
      contracts: '++id, contractNumber, date, status, createdAt',
      settings: '++id',
      messageLogs: '++id, date, phone, status',
    });

    // Version 2: Multi-tenancy & Sync indexes
    this.version(2).stores({
      customers: '++id, fullName, nationalId, phone, roles, createdAt, agencyId, updatedAt, syncStatus',
      contracts: '++id, contractNumber, date, status, createdAt, agencyId, updatedAt, syncStatus',
      settings: '++id, agencyId, updatedAt',
      messageLogs: '++id, date, phone, status, agencyId, updatedAt, syncStatus',
    }).upgrade(tx => {
      const now = Date.now();
      const defaultAgencyId = 'default_agency';
      return Promise.all([
        tx.table('customers').toCollection().modify(c => {
          if (!c.agencyId) c.agencyId = defaultAgencyId;
          if (!c.updatedAt) c.updatedAt = c.createdAt || now;
          if (!c.syncStatus) c.syncStatus = 'synced';
        }),
        tx.table('contracts').toCollection().modify(c => {
          if (!c.agencyId) c.agencyId = defaultAgencyId;
          if (!c.updatedAt) c.updatedAt = c.createdAt || now;
          if (!c.syncStatus) c.syncStatus = 'synced';
        }),
        tx.table('settings').toCollection().modify(s => {
          if (!s.agencyId) s.agencyId = defaultAgencyId;
          if (!s.updatedAt) s.updatedAt = now;
        }),
        tx.table('messageLogs').toCollection().modify(m => {
          if (!m.agencyId) m.agencyId = defaultAgencyId;
          if (!m.updatedAt) m.updatedAt = m.date || now;
          if (!m.syncStatus) m.syncStatus = 'synced';
        })
      ]);
    });

    // Version 3: AI Matching properties & requests
    this.version(3).stores({
      customers: '++id, fullName, nationalId, phone, roles, createdAt, agencyId, updatedAt, syncStatus',
      contracts: '++id, contractNumber, date, status, createdAt, agencyId, updatedAt, syncStatus',
      settings: '++id, agencyId, updatedAt',
      messageLogs: '++id, date, phone, status, agencyId, updatedAt, syncStatus',
      properties: '++id, title, dealType, propertyType, area, rooms, neighborhood, price, deposit, monthlyRent, agencyId, createdAt',
      propertyRequests: '++id, customerName, customerPhone, dealType, propertyType, minArea, maxArea, maxPrice, agencyId, createdAt'
    });

    // Version 4: Comprehensive Real Estate Accounting System
    this.version(4).stores({
      customers: '++id, fullName, nationalId, phone, roles, createdAt, agencyId, updatedAt, syncStatus',
      contracts: '++id, contractNumber, date, status, createdAt, agencyId, updatedAt, syncStatus',
      settings: '++id, agencyId, updatedAt',
      messageLogs: '++id, date, phone, status, agencyId, updatedAt, syncStatus',
      properties: '++id, title, dealType, propertyType, area, rooms, neighborhood, price, deposit, monthlyRent, agencyId, createdAt',
      propertyRequests: '++id, customerName, customerPhone, dealType, propertyType, minArea, maxArea, maxPrice, agencyId, createdAt',
      accounts: '++id, code, title, nature, level, parentId, isTrustAccount, agencyId',
      journalEntries: '++id, voucherNumber, date, status, referenceType, referenceId, agencyId, createdAt',
      cheques: '++id, chequeNumber, sayadNumber, type, dueDate, status, customerId, contractId, agencyId',
      expenses: '++id, title, category, amount, date, paidFromAccountId, agencyId, createdAt'
    });

    // Version 5: Users, Invoices & Payments
    this.version(5).stores({
      customers: '++id, fullName, nationalId, phone, roles, createdAt, agencyId, updatedAt, syncStatus',
      contracts: '++id, contractNumber, date, status, createdAt, agencyId, updatedAt, syncStatus',
      settings: '++id, agencyId, updatedAt',
      messageLogs: '++id, date, phone, status, agencyId, updatedAt, syncStatus',
      properties: '++id, title, dealType, propertyType, area, rooms, neighborhood, price, deposit, monthlyRent, agencyId, createdAt',
      propertyRequests: '++id, customerName, customerPhone, dealType, propertyType, minArea, maxArea, maxPrice, agencyId, createdAt',
      accounts: '++id, code, title, nature, level, parentId, isTrustAccount, agencyId',
      journalEntries: '++id, voucherNumber, date, status, referenceType, referenceId, agencyId, createdAt',
      cheques: '++id, chequeNumber, sayadNumber, type, dueDate, status, customerId, contractId, agencyId',
      expenses: '++id, title, category, amount, date, paidFromAccountId, agencyId, createdAt',
      users: '++id, username, role, phone, createdAt',
      invoices: '++id, invoiceNumber, contractNumber, customerId, issuedAt, status',
      payments: '++id, invoiceId, paymentMethod, status, paidAt',
      auditLogs: '++id, action, entity, entityId, createdAt'
    });
  }
}

export const db = new AppDatabase();

// Initialize default settings if empty
db.on('populate', async () => {
  await db.settings.add({
    agencyName: 'مشاورین املاک من',
    slogan: 'بهترین انتخاب برای شما',
    phone1: '',
    phone2: '',
    fax: '',
    email: '',
    address: '',
    currency: 'تومان',
    commissionRate: 1,
    taxRate: 9,
    posIp: '192.168.1.100',
    posPort: '8888',
    posTerminalId: '',
    psp: 'سامان کیش',
    bankDetails: 'بانک ملت - شماره حساب: 123456 - شبا: IR00000000000 - به نام: موسی مریدی',
    accountHolderName: 'موسی مریدی',
    accountNumber: '123456',
    cardNumber: '6104-3377-0000-0000',
    shebaNumber: '0000-0000-0000-0000-0000-0000',
    theme: 'blue',
    themeEffect: 'none',
    font: 'vazirmatn',
    invoiceLayout: 'standard',
    paperSize: 'a4',
    darkMode: false,
    autoSendInvoices: false,
    autoSendChequeReminder: false,
    autoSendRentReminder: false,
    baleToken: '',
    rubikaToken: '',
    telegramToken: '',
    additionalPhones: [],
    socialLinks: [],
    defaultMessages: {
      welcome: 'سلام 🌹\nبه سامانه هوشمند اطلاع‌رسانی {نام_املاک} خوش آمدید.\n\nجهت استفاده از خدمات ربات، دریافت صورتحساب‌ها، فاکتورها و دسترسی به اطلاعات قراردادها در خدمت شما هستیم.',
      birthday: 'زادروزتان خجسته باد! با بهترین آرزوها، مشاور املاک شما.',
      contractExpiry: 'مشتری گرامی، موعد قرارداد شما به زودی به پایان می‌رسد. جهت تمدید با ما در تماس باشید.',
      rentPayment: 'مشتری گرامی، یادآوری می‌گردد موعد پرداخت اجاره بها نزدیک است.',
      chequeDue: 'مشتری گرامی، یادآوری می‌گردد سررسید چک شما به زودی می‌باشد.',
      businessCard: 'املاک ما - بهترین مشاور شما در منطقه. تلفن: {phone1}'
    }
  });
});
