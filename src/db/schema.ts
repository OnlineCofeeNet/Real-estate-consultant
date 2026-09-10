import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, bigint, boolean, jsonb, real } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(),
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
  createdAt: bigint('created_at', { mode: 'number' }),
  lastLoginAt: bigint('last_login_at', { mode: 'number' }),
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
  roles: jsonb('roles'),
  customerType: text('customer_type'),
  hasUncollectedCheque: boolean('has_uncollected_cheque'),
  hasDebt: boolean('has_debt'),
  debtAmount: integer('debt_amount'),
  messengerId: text('messenger_id'),
  telegramId: text('telegram_id'),
  rubikaId: text('rubika_id'),
  baleId: text('bale_id'),
  createdAt: bigint('created_at', { mode: 'number' }),
});

export const contracts = pgTable('contracts', {
  id: serial('id').primaryKey(),
  contractNumber: text('contract_number').notNull(),
  date: text('date').notNull(),
  endDate: text('end_date'),
  party1Role: text('party1_role'),
  party2Role: text('party2_role'),
  party1: jsonb('party1'),
  party2: jsonb('party2'),
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
  createdAt: bigint('created_at', { mode: 'number' }),
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
  issuedAt: bigint('issued_at', { mode: 'number' }),
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
  paidAt: bigint('paid_at', { mode: 'number' }),
  createdAt: bigint('created_at', { mode: 'number' }),
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  data: jsonb('data').notNull(),
});

export const messageLogs = pgTable('message_logs', {
  id: serial('id').primaryKey(),
  date: bigint('date', { mode: 'number' }),
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
  createdAt: bigint('created_at', { mode: 'number' }),
});

export const areas = pgTable('areas', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city'),
  parentId: integer('parent_id'),
  sortOrder: integer('sort_order').default(0),
  createdAt: bigint('created_at', { mode: 'number' }),
});

export const properties = pgTable('properties', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  propertyType: text('property_type').notNull(),
  transactionType: text('transaction_type').notNull(),
  status: text('status').notNull().default('available'),
  price: integer('price'),
  deposit: integer('deposit'),
  rent: integer('rent'),
  area: real('area'),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  floor: integer('floor'),
  totalFloors: integer('total_floors'),
  yearBuilt: integer('year_built'),
  parkingSpaces: integer('parking_spaces').default(0),
  address: text('address'),
  areaId: integer('area_id'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  features: jsonb('features').$type<string[]>(),
  description: text('description'),
  notes: text('notes'),
  ownerId: integer('owner_id'),
  assignedAgentId: integer('assigned_agent_id'),
  listedAt: bigint('listed_at', { mode: 'number' }),
  createdAt: bigint('created_at', { mode: 'number' }),
  updatedAt: bigint('updated_at', { mode: 'number' }),
});

/** سازگاری با نسخه قبلی */
export const propertyImages = pgTable('property_images', {
  id: serial('id').primaryKey(),
  propertyId: integer('property_id').notNull(),
  url: text('url').notNull(),
  caption: text('caption'),
  isPrimary: boolean('is_primary').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: bigint('created_at', { mode: 'number' }),
});

/** رسانه ملک: عکس و فیلم */
export const propertyMedia = pgTable('property_media', {
  id: serial('id').primaryKey(),
  propertyId: integer('property_id').notNull(),
  type: text('type').notNull(), // image | video
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  originalName: text('original_name'),
  width: integer('width'),
  height: integer('height'),
  duration: integer('duration'), // seconds for video
  caption: text('caption'),
  isPrimary: boolean('is_primary').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: bigint('created_at', { mode: 'number' }),
});

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(customers, {
    fields: [properties.ownerId],
    references: [customers.id],
  }),
  area: one(areas, {
    fields: [properties.areaId],
    references: [areas.id],
  }),
  images: many(propertyImages),
  media: many(propertyMedia),
}));

export const propertyImagesRelations = relations(propertyImages, ({ one }) => ({
  property: one(properties, {
    fields: [propertyImages.propertyId],
    references: [properties.id],
  }),
}));

export const propertyMediaRelations = relations(propertyMedia, ({ one }) => ({
  property: one(properties, {
    fields: [propertyMedia.propertyId],
    references: [properties.id],
  }),
}));
