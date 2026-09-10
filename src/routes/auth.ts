import { Router, type Request, type Response } from 'express';
import { pbkdf2Sync, randomBytes, createHmac } from 'node:crypto';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const router = Router();
const ITERATIONS = 310_000;
const USERNAME_RE = /^[a-z0-9._-]{3,40}$/;
const PASSWORD_RE = /[A-Za-z]/;
const DIGIT_RE = /\d/;

function normalizeUsername(value: unknown) { return typeof value === 'string' ? value.trim().toLowerCase() : ''; }
function validPassword(value: unknown): value is string { return typeof value === 'string' && value.length >= 8 && PASSWORD_RE.test(value) && DIGIT_RE.test(value); }
function validUsername(value: unknown): value is string { return typeof value === 'string' && USERNAME_RE.test(value.trim().toLowerCase()); }
function hash(value: string, salt: string) { return pbkdf2Sync(value, Buffer.from(salt, 'base64'), ITERATIONS, 32, 'sha256').toString('base64'); }
function same(a: string, b: string) { return a.length === b.length && createHmac('sha256', 'compare').update(a).digest('hex') === createHmac('sha256', 'compare').update(b).digest('hex'); }
function safeError(error: unknown) { console.error(error); return { error: 'خطای داخلی سرور رخ داد.' }; }

router.post('/register', async (req: Request, res: Response) => {
  const username = normalizeUsername(req.body?.username);
  const password = req.body?.password;
  if (!validUsername(username) || !validPassword(password)) return res.status(400).json({ error: 'نام کاربری یا رمز عبور نامعتبر است.' });
  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
    if (existing.length) return res.status(409).json({ error: 'این نام کاربری قبلاً ثبت شده است.' });
    const salt = randomBytes(16).toString('base64');
    await db.insert(users).values({
      username,
      passwordHash: hash(password, salt),
      salt,
      role: 'agent',
      securityQuestion1: typeof req.body?.q1 === 'string' ? req.body.q1.trim() : undefined,
      securityAnswer1Hash: typeof req.body?.a1 === 'string' ? hash(req.body.a1.trim().toLowerCase(), salt) : undefined,
      securityQuestion2: typeof req.body?.q2 === 'string' ? req.body.q2.trim() : undefined,
      securityAnswer2Hash: typeof req.body?.a2 === 'string' ? hash(req.body.a2.trim().toLowerCase(), salt) : undefined,
      email: typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : undefined,
      phone: typeof req.body?.phone === 'string' ? req.body.phone.trim() : undefined,
    });
    return res.status(201).json({ success: true });
  } catch (error) { return res.status(500).json(safeError(error)); }
});

router.get('/security-questions/:username', async (req, res) => {
  const username = normalizeUsername(req.params.username);
  try {
    const result = await db.select({ q1: users.securityQuestion1, q2: users.securityQuestion2 }).from(users).where(eq(users.username, username));
    if (!result[0]?.q1 || !result[0]?.q2) return res.status(404).json({ error: 'اطلاعات امنیتی یافت نشد.' });
    return res.json(result[0]);
  } catch (error) { return res.status(500).json(safeError(error)); }
});

router.post('/recover-password', async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const a1 = typeof req.body?.a1 === 'string' ? req.body.a1.trim().toLowerCase() : '';
  const a2 = typeof req.body?.a2 === 'string' ? req.body.a2.trim().toLowerCase() : '';
  const newPassword = req.body?.newPassword;
  if (!username || !a1 || !a2 || !validPassword(newPassword)) return res.status(400).json({ error: 'اطلاعات بازیابی نامعتبر است.' });
  try {
    const result = await db.select().from(users).where(eq(users.username, username));
    const user = result[0];
    if (!user?.salt || !user.securityAnswer1Hash || !user.securityAnswer2Hash) return res.status(400).json({ error: 'اطلاعات بازیابی نامعتبر است.' });
    if (!same(hash(a1, user.salt), user.securityAnswer1Hash) || !same(hash(a2, user.salt), user.securityAnswer2Hash)) return res.status(400).json({ error: 'پاسخ‌های امنیتی نادرست است.' });
    const salt = randomBytes(16).toString('base64');
    await db.update(users).set({ passwordHash: hash(newPassword, salt), salt }).where(eq(users.id, user.id));
    return res.json({ success: true });
  } catch (error) { return res.status(500).json(safeError(error)); }
});

router.post('/recover-username', async (req, res) => {
  const value = typeof req.body?.emailOrPhone === 'string' ? req.body.emailOrPhone.trim().toLowerCase() : '';
  if (!value) return res.status(400).json({ error: 'ایمیل یا شماره تلفن الزامی است.' });
  try {
    const result = await db.select({ username: users.username, email: users.email, phone: users.phone }).from(users);
    const matches = result.filter(u => u.email?.toLowerCase() === value || u.phone === value).map(u => u.username);
    if (!matches.length) return res.status(404).json({ error: 'حسابی با این مشخصات یافت نشد.' });
    return res.json(matches);
  } catch (error) { return res.status(500).json(safeError(error)); }
});

export default router;
