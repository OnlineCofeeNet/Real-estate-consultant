import Dexie, { type Table } from 'dexie';
import type { Customer, Contract, Settings, MessageLog, AuditLog, Invoice, Payment, AuthUser } from '../types';
import type { Property, PropertyImage, PropertyRequest } from '../types';

export class AppDatabase extends Dexie {
  customers!: Table<Customer, number>;
  contracts!: Table<Contract, number>;
  settings!: Table<Settings, number>;
  messageLogs!: Table<MessageLog, number>;
  auditLogs!: Table<AuditLog, number>;
  invoices!: Table<Invoice, number>;
  payments!: Table<Payment, number>;
  users!: Table<AuthUser, number>;
  properties!: Table<Property, number>;
  propertyImages!: Table<PropertyImage, number>;
  propertyRequests!: Table<PropertyRequest, number>;

  constructor() {
    super('RealEstateInvoiceDB');
    const stores = {
      customers: '++id, fullName, nationalId, phone, roles, createdAt',
      contracts: '++id, contractNumber, date, status, createdAt',
      settings: '++id',
      messageLogs: '++id, date, phone, status',
      auditLogs: '++id, action, entity, entityId, createdAt',
      invoices: '++id, invoiceNumber, contractId, customerId, status, issuedAt',
      payments: '++id, invoiceId, contractId, status, method, paidAt, createdAt',
      users: '++id, &username, role, createdAt',
      properties: '++id, &code, title, type, transaction, status, areaName, ownerId, agentId, createdAt, updatedAt',
      propertyImages: '++id, propertyId, sortOrder, createdAt',
      propertyRequests: '++id, customerId, transaction, propertyType, status, areaName, createdAt, updatedAt',
    };
    this.version(1).stores({ customers: stores.customers, contracts: stores.contracts, settings: stores.settings, messageLogs: stores.messageLogs });
    this.version(2).stores({ ...stores, auditLogs: stores.auditLogs });
    this.version(3).stores({ ...stores, invoices: stores.invoices, payments: stores.payments });
    this.version(4).stores(stores);
    this.version(5).stores(stores);
  }
}

export const db = new AppDatabase();

db.on('populate', async () => {
  await db.settings.add({
    agencyName: 'مشاورین املاک من', slogan: 'بهترین انتخاب برای شما', phone1: '', phone2: '', fax: '', email: '', address: '',
    currency: 'تومان', commissionRate: 1, taxRate: 9, posIp: '192.168.1.100', posPort: '8888', posTerminalId: '', psp: 'سامان کیش', bankDetails: '',
    accountHolderName: '', accountNumber: '', cardNumber: '', shebaNumber: '', theme: 'blue', themeEffect: 'none', font: 'vazirmatn', invoiceLayout: 'standard',
    paperSize: 'a4', darkMode: false, autoSendInvoices: false, autoSendChequeReminder: false, autoSendRentReminder: false,
    baleToken: '', rubikaToken: '', telegramToken: '', additionalPhones: [], socialLinks: [],
    defaultMessages: {
      welcome: 'سلام 🌹\nبه سامانه هوشمند اطلاع‌رسانی {نام_املاک} خوش آمدید.',
      birthday: 'زادروزتان خجسته باد! با بهترین آرزوها، مشاور املاک شما.',
      contractExpiry: 'مشتری گرامی، موعد قرارداد شما به زودی به پایان می‌رسد.',
      rentPayment: 'مشتری گرامی، موعد پرداخت اجاره بها نزدیک است.',
      chequeDue: 'مشتری گرامی، موعد سررسید چک شما نزدیک است.',
      businessCard: 'املاک ما - بهترین مشاور شما در منطقه. تلفن: {phone1}',
    },
  });
});
