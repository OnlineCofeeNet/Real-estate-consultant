import { Router, type NextFunction, type Request, type Response } from 'express';
import { createHmac, randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { db } from '../db/index.ts';
import { customers, contracts, invoices, payments, messageLogs, auditLogs, settings, users } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { apiRateLimit, securityHeaders } from '../server/security.ts';
import authRouter from './auth.ts';

const router = Router();
router.use(securityHeaders, apiRateLimit);

const AUTH_SECRET = process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('AUTH_SECRET must be configured in production'); })() : 'development-only-change-me');
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const PASSWORD_ITERATIONS = 310_000;
const USERNAME_RE = /^[a-z0-9._-]{3,40}$/;
const USER_ROLES = new Set(['admin', 'manager', 'agent', 'accountant']);

type UserRole = 'admin' | 'manager' | 'agent' | 'accountant';
type SessionPayload = { userId: number; username: string; role: UserRole; exp: number };
type TableSchema = typeof customers | typeof contracts | typeof invoices | typeof payments | typeof messageLogs | typeof auditLogs | typeof users;
type AuditInput = { action: string; entity: string; entityId?: string | number; description: string; before?: unknown; after?: unknown };
type AuthRequest = Request & { auth?: SessionPayload };

const safeError = (error: unknown) => { console.error(error); return { error: 'خطای داخلی سرور رخ داد.' }; };
const addAuditLog = async ({ action, entity, entityId, description, before, after }: AuditInput) => {
  try { await db.insert(auditLogs).values({ action, entity, entityId: entityId == null ? undefined : String(entityId), description, before, after }); }
  catch (error) { console.error('Audit Log Error:', error); }
};
const parseId = (raw: string): number | null => { if (!/^\d+$/.test(raw)) return null; const id = Number(raw); return Number.isSafeInteger(id) && id > 0 ? id : null; };
const toBase64Url = (value: string | Buffer) => Buffer.from(value).toString('base64url');
function signSession(payload: SessionPayload) { const encoded = toBase64Url(JSON.stringify(payload)); const signature = createHmac('sha256', AUTH_SECRET).update(encoded).digest('base64url'); return `${encoded}.${signature}`; }
function verifySession(token: string): SessionPayload | null {
  const [encoded, signature] = token.split('.'); if (!encoded || !signature) return null;
  const expected = createHmac('sha256', AUTH_SECRET).update(encoded).digest('base64url');
  try { if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; } catch { return null; }
  try { const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload; if (!payload.userId || !payload.username || !USER_ROLES.has(payload.role) || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null; return payload; } catch { return null; }
}
function passwordHash(password: string, salt: string) { return pbkdf2Sync(password, Buffer.from(salt, 'base64'), PASSWORD_ITERATIONS, 32, 'sha256').toString('base64'); }
function isValidPassword(password: unknown): password is string { return typeof password === 'string' && password.length >= 8 && password.length <= 256 && /[A-Za-z]/.test(password) && /\d/.test(password); }
function isValidUsername(username: unknown): username is string { return typeof username === 'string' && USERNAME_RE.test(username.trim().toLowerCase()); }
function issueSession(user: { id: number; username: string; role: string }) { const payload: SessionPayload = { userId: user.id, username: user.username, role: user.role as UserRole, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS }; return { token: signSession(payload), user: { id: user.id, username: user.username, role: user.role } }; }
function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization'); const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : ''; const auth = token ? verifySession(token) : null;
  if (!auth) return res.status(401).json({ error: 'نیاز به ورود به سامانه دارید.' }); req.auth = auth; return next();
}
function requireRole(...roles: UserRole[]) { return (req: AuthRequest, res: Response, next: NextFunction) => { if (!req.auth || !roles.includes(req.auth.role)) return res.status(403).json({ error: 'شما مجوز انجام این عملیات را ندارید.' }); return next(); }; }
const normalizeUsername = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';

router.get('/auth/account-count', async (_req, res) => { try { const result = await db.select({ count: sql<number>`count(*)` }).from(users); return res.json(Number(result[0]?.count ?? 0)); } catch (error) { return res.status(500).json(safeError(error)); } });
router.post('/auth/first-admin', async (req, res) => {
  const username = normalizeUsername(req.body?.username); const password = req.body?.password;
  if (!isValidUsername(username) || !isValidPassword(password)) return res.status(400).json({ error: 'نام کاربری یا رمز عبور نامعتبر است.' });
  try {
    const count = await db.select({ count: sql<number>`count(*)` }).from(users); if (Number(count[0]?.count ?? 0) !== 0) return res.status(409).json({ error: 'حساب اولیه قبلاً ایجاد شده است.' });
    const salt = randomBytes(16).toString('base64'); const result = await db.insert(users).values({ username, passwordHash: passwordHash(password, salt), salt, role: 'admin' }).returning({ id: users.id, username: users.username, role: users.role });
    const session = issueSession(result[0]); await addAuditLog({ action: 'create', entity: 'users', entityId: result[0].id, description: `ایجاد حساب مدیر اولیه: ${username}` }); return res.status(201).json(session);
  } catch (error) { return res.status(500).json(safeError(error)); }
});
router.post('/auth/login', async (req, res) => {
  const username = normalizeUsername(req.body?.username); const password = req.body?.password;
  if (!isValidUsername(username) || typeof password !== 'string' || password.length > 256) return res.status(400).json({ error: 'نام کاربری یا رمز عبور نامعتبر است.' });
  try {
    const result = await db.select().from(users).where(eq(users.username, username)); const user = result[0];
    if (!user || !user.passwordHash || !user.salt || !USER_ROLES.has(user.role)) { await addAuditLog({ action: 'login_failed', entity: 'system', description: 'ورود ناموفق' }); return res.status(401).json({ error: 'نام کاربری یا رمز عبور نادرست است.' }); }
    const computed = passwordHash(password, user.salt);
    if (computed !== user.passwordHash) { await addAuditLog({ action: 'login_failed', entity: 'users', entityId: user.id, description: `ورود ناموفق برای کاربر: ${username}` }); return res.status(401).json({ error: 'نام کاربری یا رمز عبور نادرست است.' }); }
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id)); const session = issueSession({ id: user.id, username: user.username, role: user.role });
    await addAuditLog({ action: 'login', entity: 'users', entityId: user.id, description: `ورود موفق کاربر: ${user.username}` }); return res.json(session);
  } catch (error) { return res.status(500).json(safeError(error)); }
});
router.get('/auth/session', requireAuth, (req: AuthRequest, res) => res.json({ authenticated: true, user: req.auth }));
router.use('/auth', authRouter);
router.use(requireAuth);

const roleForTable: Record<string, UserRole[]> = {
  customers: ['admin', 'manager', 'agent', 'accountant'], contracts: ['admin', 'manager', 'agent', 'accountant'], messageLogs: ['admin', 'manager', 'agent', 'accountant'],
  invoices: ['admin', 'manager', 'accountant'], payments: ['admin', 'manager', 'accountant'], auditLogs: ['admin', 'manager'], users: ['admin'],
};
const createCrudRoutes = (tableName: string, tableSchema: TableSchema) => {
  const roles = roleForTable[tableName] || ['admin'];
  router.get(`/${tableName}`, requireRole(...roles), async (_req, res) => { try { res.json(await db.select().from(tableSchema)); } catch (error) { res.status(500).json(safeError(error)); } });
  router.post(`/${tableName}`, requireRole(...roles), async (req, res) => {
    try { if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error: 'بدنه درخواست نامعتبر است.' }); const result = await db.insert(tableSchema).values(req.body).returning(); const created = result[0]; await addAuditLog({ action: 'create', entity: tableName, entityId: created?.id, description: `Created record ID: ${created?.id ?? 'unknown'}`, after: created }); return res.status(201).json(created?.id); }
    catch (error) { return res.status(500).json(safeError(error)); }
  });
  router.put(`/${tableName}/:id`, requireRole(...roles), async (req, res) => {
    const id = parseId(req.params.id); if (!id) return res.status(400).json({ error: 'شناسه نامعتبر است.' }); if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error: 'بدنه درخواست نامعتبر است.' });
    try { const beforeResult = await db.select().from(tableSchema).where(eq(tableSchema.id, id)); if (!beforeResult[0]) return res.status(404).json({ error: 'رکورد پیدا نشد.' }); const result = await db.update(tableSchema).set(req.body).where(eq(tableSchema.id, id)).returning(); await addAuditLog({ action: 'update', entity: tableName, entityId: id, description: `Updated record ID: ${id}`, before: beforeResult[0], after: result[0] }); return res.json({ success: true }); }
    catch (error) { return res.status(500).json(safeError(error)); }
  });
  router.delete(`/${tableName}/:id`, requireRole('admin'), async (req, res) => {
    const id = parseId(req.params.id); if (!id) return res.status(400).json({ error: 'شناسه نامعتبر است.' });
    try { const beforeResult = await db.select().from(tableSchema).where(eq(tableSchema.id, id)); if (!beforeResult[0]) return res.status(404).json({ error: 'رکورد پیدا نشد.' }); await db.delete(tableSchema).where(eq(tableSchema.id, id)); await addAuditLog({ action: 'delete', entity: tableName, entityId: id, description: `Deleted record ID: ${id}`, before: beforeResult[0] }); return res.json({ success: true }); }
    catch (error) { return res.status(500).json(safeError(error)); }
  });
};
createCrudRoutes('customers', customers); createCrudRoutes('contracts', contracts); createCrudRoutes('invoices', invoices); createCrudRoutes('payments', payments); createCrudRoutes('messageLogs', messageLogs); createCrudRoutes('auditLogs', auditLogs); createCrudRoutes('users', users);

router.get('/settings', requireRole('admin'), async (_req, res) => { try { const result = await db.select().from(settings).where(eq(settings.id, 1)); return res.json(result[0]?.data ?? null); } catch (error) { return res.status(500).json(safeError(error)); } });
router.post('/settings', requireRole('admin'), async (req, res) => { try { if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error: 'تنظیمات نامعتبر است.' }); const result = await db.insert(settings).values({ id: 1, data: req.body }).onConflictDoUpdate({ target: settings.id, set: { data: req.body } }).returning(); await addAuditLog({ action: 'create/update', entity: 'settings', entityId: 1, description: 'Updated global settings', after: req.body }); return res.json(result[0]?.id); } catch (error) { return res.status(500).json(safeError(error)); } });
router.put('/settings/1', requireRole('admin'), async (req, res) => { try { if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error: 'تنظیمات نامعتبر است.' }); const before = await db.select().from(settings).where(eq(settings.id, 1)); const result = await db.update(settings).set({ data: req.body }).where(eq(settings.id, 1)).returning(); if (!result[0]) return res.status(404).json({ error: 'تنظیمات پیدا نشد.' }); await addAuditLog({ action: 'update', entity: 'settings', entityId: 1, description: 'Updated global settings', before: before[0]?.data, after: req.body }); return res.json({ success: true }); } catch (error) { return res.status(500).json(safeError(error)); } });

router.post('/contracts/complete', requireRole('admin', 'manager', 'agent', 'accountant'), async (req, res) => {
  const { contract, invoice1, payment1, invoice2, payment2 } = req.body ?? {};
  if (!contract || typeof contract !== 'object') return res.status(400).json({ error: 'اطلاعات قرارداد الزامی است.' }); if (!contract.contractNumber || typeof contract.contractNumber !== 'string' || !contract.contractNumber.trim()) return res.status(400).json({ error: 'شماره قرارداد الزامی است.' });
  try {
    const result = await db.transaction(async (tx) => {
      const existing = await tx.select({ id: contracts.id }).from(contracts).where(eq(contracts.contractNumber, contract.contractNumber.trim())); if (existing.length > 0) throw new Error('DUPLICATE_CONTRACT_NUMBER');
      const contractToInsert = { ...contract, contractNumber: contract.contractNumber.trim() }; const contractResult = await tx.insert(contracts).values(contractToInsert).returning(); const createdContract = contractResult[0]; if (!createdContract?.id) throw new Error('Contract was not created'); const contractId = createdContract.id;
      const resultData: { contractId: number; invoice1Id?: number; payment1Id?: number; invoice2Id?: number; payment2Id?: number } = { contractId };
      const insertInvoiceAndPayment = async (invoice: any, payment: any, key: '1' | '2') => { if (!invoice) return; const invoiceToInsert = { ...invoice, contractId, contractNumber: contractToInsert.contractNumber }; const invoiceResult = await tx.insert(invoices).values(invoiceToInsert).returning(); const createdInvoice = invoiceResult[0]; if (!createdInvoice?.id) throw new Error(`Invoice ${key} was not created`); resultData[`invoice${key}Id`] = createdInvoice.id; if (payment) { const paymentToInsert = { ...payment, invoiceId: createdInvoice.id, contractId }; const paymentResult = await tx.insert(payments).values(paymentToInsert).returning(); const createdPayment = paymentResult[0]; if (!createdPayment?.id) throw new Error(`Payment ${key} was not created`); resultData[`payment${key}Id`] = createdPayment.id; } };
      await insertInvoiceAndPayment(invoice1, payment1, '1'); await insertInvoiceAndPayment(invoice2, payment2, '2'); return resultData;
    });
    await addAuditLog({ action: 'create/complete', entity: 'contracts', entityId: result.contractId, description: `Completed contract ${contract.contractNumber}`, after: result }); return res.status(201).json(result);
  } catch (error: any) { if (error?.message === 'DUPLICATE_CONTRACT_NUMBER') return res.status(409).json({ error: 'شماره قرارداد قبلاً ثبت شده است.' }); return res.status(500).json(safeError(error)); }
});

export default router;
