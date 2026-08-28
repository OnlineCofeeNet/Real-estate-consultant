import Dexie, { type Table } from 'dexie';
import type { Customer, Contract, Settings, MessageLog } from '../types';

export class AppDatabase extends Dexie {
  customers!: Table<Customer, number>;
  contracts!: Table<Contract, number>;
  settings!: Table<Settings, number>;
  messageLogs!: Table<MessageLog, number>;

  constructor() {
    super('RealEstateInvoiceDB');
    this.version(1).stores({
      customers: '++id, fullName, nationalId, phone, roles, createdAt',
      contracts: '++id, contractNumber, date, status, createdAt',
      settings: '++id',
      messageLogs: '++id, date, phone, status',
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
