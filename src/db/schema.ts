import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(), // Firebase Auth UID
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash'),
  salt: text('salt'),
  role: text('role').notNull(),
  securityQuestion1: text('security_question1'),
  securityAnswer1Hash: text('security_answer1_hash'),
  securityQuestion2: text('security_question2'),
  securityAnswer2Hash: text('security_answer2_hash'),
  phone: text('phone'),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  nationalId: text('national_id'),
  phone: text('phone').notNull(),
  phone2: text('phone2'),
  birthDate: text('birth_date'),
  contractEndDate: text('contract_end_date'),
  contractStartDate: text('contract_start_date'),
  rentPaymentDate: text('rent_payment_date'),
  rentDueDay: integer('rent_due_day'),
  autoSendMessages: boolean('auto_send_messages'),
  description: text('description'),
  roles: jsonb('roles'), // array of strings
  customerType: text('customer_type'),
  hasUncollectedCheque: boolean('has_uncollected_cheque'),
  hasDebt: boolean('has_debt'),
  debtAmount: integer('debt_amount'),
  messengerId: text('messenger_id'),
  telegramId: text('telegram_id'),
  rubikaId: text('rubika_id'),
  baleId: text('bale_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const contracts = pgTable('contracts', {
  id: serial('id').primaryKey(),
  contractNumber: text('contract_number').notNull(),
  date: text('date').notNull(),
  endDate: text('end_date'),
  party1Role: text('party1_role'),
  party2Role: text('party2_role'),
  party1: jsonb('party1'), // Customer data
  party2: jsonb('party2'), // Customer data
  type: text('type').notNull(),
  price: integer('price').notNull(),
  rent: integer('rent').notNull(),
  commission: integer('commission').notNull(),
  tax: integer('tax').notNull(),
  totalPayable: integer('total_payable').notNull(),
  party1PaymentMethod: text('party1_payment_method'),
  party2PaymentMethod: text('party2_payment_method'),
  party1PosStatus: text('party1_pos_status'),
  party2PosStatus: text('party2_pos_status'),
  party1PosReceipt: text('party1_pos_receipt'),
  party2PosReceipt: text('party2_pos_receipt'),
  party1ChequeDate: text('party1_cheque_date'),
  party2ChequeDate: text('party2_cheque_date'),
  party1SharePercent: integer('party1_share_percent'),
  rentDueDay: integer('rent_due_day'),
  renewalDate: text('renewal_date'),
  renewedCount: integer('renewed_count'),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull(),
  contractId: integer('contract_id').notNull(),
  contractNumber: text('contract_number').notNull(),
  customerId: integer('customer_id'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  partyRole: text('party_role').notNull(),
  subtotal: integer('subtotal').notNull(),
  tax: integer('tax').notNull(),
  total: integer('total').notNull(),
  paidAmount: integer('paid_amount').notNull(),
  status: text('status').notNull(),
  issuedAt: timestamp('issued_at').defaultNow(),
  dueDate: text('due_date'),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull(),
  contractId: integer('contract_id').notNull(),
  amount: integer('amount').notNull(),
  method: text('method').notNull(),
  status: text('status').notNull(),
  reference: text('reference'),
  chequeDate: text('cheque_date'),
  note: text('note'),
  paidAt: timestamp('paid_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(), // just id=1
  data: jsonb('data').notNull(),
});

export const messageLogs = pgTable('message_logs', {
  id: serial('id').primaryKey(),
  date: timestamp('date').defaultNow(),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  messenger: text('messenger').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull(),
  chatId: text('chat_id'),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  description: text('description').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  createdAt: timestamp('created_at').defaultNow(),
});
