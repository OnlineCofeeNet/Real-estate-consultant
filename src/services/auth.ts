import axios from 'axios';
import { db } from '../db/db';
import type { AuthUser, UserRole } from '../types';

const SESSION_KEY = 'real-estate-auth-session';
const ATTEMPTS_KEY = 'real-estate-auth-attempts';
const ITERATIONS = 310_000;
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 60 * 1000;

export type StoredSession = {
  userId: number;
  username: string;
  role: UserRole;
  createdAt: number;
  lastActivityAt: number;
};

type AttemptState = { count: number; firstAttemptAt: number };

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function randomSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function derivePasswordHash(password: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromBase64(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function readAttempts(): AttemptState {
  try {
    const raw = sessionStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return { count: 0, firstAttemptAt: Date.now() };
    const state = JSON.parse(raw) as AttemptState;
    if (Date.now() - state.firstAttemptAt >= ATTEMPT_WINDOW_MS) return { count: 0, firstAttemptAt: Date.now() };
    return state;
  } catch {
    return { count: 0, firstAttemptAt: Date.now() };
  }
}

function recordFailedAttempt(): void {
  const state = readAttempts();
  sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count: state.count + 1, firstAttemptAt: state.firstAttemptAt }));
}

function assertLoginNotThrottled(): void {
  const state = readAttempts();
  if (state.count >= MAX_ATTEMPTS && Date.now() - state.firstAttemptAt < ATTEMPT_WINDOW_MS) {
    const seconds = Math.ceil((ATTEMPT_WINDOW_MS - (Date.now() - state.firstAttemptAt)) / 1000);
    throw new Error(`تلاش‌های بیش از حد مجاز است. ${seconds} ثانیه دیگر دوباره تلاش کنید.`);
  }
}

function clearFailedAttempts(): void {
  sessionStorage.removeItem(ATTEMPTS_KEY);
}

async function writeAuthAudit(description: string, entityId?: string): Promise<void> {
  try {
    await db.auditLogs.add({
      action: 'update',
      entity: 'system',
      entityId,
      description,
      createdAt: Date.now(),
    });
  } catch {}
}

export function hasActiveSession(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as StoredSession;
    const now = Date.now();
    const expired = !session.createdAt || !session.lastActivityAt ||
      now - session.createdAt > SESSION_MAX_AGE_MS ||
      now - session.lastActivityAt > SESSION_IDLE_TIMEOUT_MS;
    if (expired) {
      clearSession();
      return false;
    }
    return Boolean(session.userId && session.username && session.role);
  } catch {
    clearSession();
    return false;
  }
}

export function getSession(): StoredSession | null {
  if (!hasActiveSession()) return null;
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as StoredSession | null;
  } catch {
    return null;
  }
}

export function touchSession(): boolean {
  const session = getSession();
  if (!session) return false;
  session.lastActivityAt = Date.now();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return true;
}

export function clearSession(): void {
  const session = getSession();
  sessionStorage.removeItem(SESSION_KEY);
  clearFailedAttempts();
  if (session) void writeAuthAudit(`خروج کاربر ${session.username}`, String(session.userId));
}

export async function accountCount(): Promise<number> {
  return db.users.count();
}

export async function createFirstAdmin(username: string, password: string): Promise<StoredSession> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(normalizedUsername)) {
    throw new Error('نام کاربری باید ۳ تا ۴۰ کاراکتر و فقط شامل حروف انگلیسی، عدد، نقطه، خط تیره یا زیرخط باشد.');
  }
  if (!isValidPassword(password)) {
    throw new Error('رمز عبور باید حداقل ۸ کاراکتر و شامل حداقل یک حرف و یک عدد باشد.');
  }
  if (await accountCount() > 0) throw new Error('حساب اولیه قبلاً ایجاد شده است.');

  const salt = randomSalt();
  const passwordHash = await derivePasswordHash(password, salt);

  const user: AuthUser = { 
    username: normalizedUsername, 
    passwordHash, 
    salt, 
    role: 'admin', 
    createdAt: Date.now() 
  };
  const userId = await db.users.add(user);
  const session = establishSession({ ...user, id: userId });
  await writeAuthAudit(`ایجاد حساب مدیر اولیه: ${normalizedUsername}`, String(userId));
  return session;
}

export async function login(username: string, password: string): Promise<StoredSession> {
  assertLoginNotThrottled();
  const normalizedUsername = username.trim().toLowerCase();
  const { data: user } = await axios.post('/api/users/login-fetch', { username: normalizedUsername });
  if (!user) {
    recordFailedAttempt();
    await writeAuthAudit(`ورود ناموفق برای نام کاربری: ${normalizedUsername}`);
    throw new Error('نام کاربری یا رمز عبور نادرست است.');
  }
  const passwordHash = await derivePasswordHash(password, user.salt);

  if (!constantTimeEqual(passwordHash, user.passwordHash)) {
    recordFailedAttempt();
    await writeAuthAudit(`ورود ناموفق برای کاربر: ${normalizedUsername}`, String(user.id));
    throw new Error('نام کاربری یا رمز عبور نادرست است.');
  }
  
  if (user.role === 'pending') {
    throw new Error('حساب کاربری شما در انتظار تایید مدیر سیستم می‌باشد.');
  }

  clearFailedAttempts();
  await db.users.update(user.id!, { lastLoginAt: Date.now() });
  const session = establishSession(user);
  await writeAuthAudit(`ورود موفق کاربر: ${user.username}`, String(user.id));
  return session;
}

function establishSession(user: AuthUser): StoredSession {
  const now = Date.now();
  const session: StoredSession = {
    userId: user.id!,
    username: user.username,
    role: user.role,
    createdAt: now,
    lastActivityAt: now,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function canAccess(
  role: UserRole,
  permission: 'settings' | 'finance' | 'contracts' | 'customers' | 'dashboard' | 'users' | 'properties'
): boolean {
  if (role === 'admin') return true;
  if (permission === 'users') return false;
  if (permission === 'settings') return false;
  if (permission === 'finance') return role === 'manager' || role === 'accountant';
  if (
    permission === 'contracts' ||
    permission === 'customers' ||
    permission === 'properties' ||
    permission === 'dashboard'
  ) {
    return true;
  }
  return false;
}

export async function createUserByAdmin(username: string, password: string, email: string, phone: string, role: string, q1: string = '', a1: string = '', q2: string = '', a2: string = ''): Promise<void> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(normalizedUsername)) throw new Error('نام کاربری نامعتبر است.');
  if (password && !isValidPassword(password)) throw new Error('رمز عبور ضعیف است.');
  
  const existing = await db.users.where('username').equals(normalizedUsername).first();
  if (existing) throw new Error('این نام کاربری قبلاً ثبت شده است.');
  
  const salt = randomSalt();
  const passwordHash = password ? await derivePasswordHash(password, salt) : '';
  const securityAnswer1Hash = a1 ? await derivePasswordHash(a1.trim().toLowerCase(), salt) : '';
  const securityAnswer2Hash = a2 ? await derivePasswordHash(a2.trim().toLowerCase(), salt) : '';
  
  const user: AuthUser = {
    username: normalizedUsername,
    passwordHash,
    salt,
    role: role as any,
    phone,
    email,
    securityQuestion1: q1,
    securityAnswer1Hash,
    securityQuestion2: q2,
    securityAnswer2Hash,
    createdAt: Date.now()
  };
  
  await db.users.add(user);
}

export async function registerUser(username: string, password: string, email: string, phone: string, q1: string, a1: string, q2: string, a2: string): Promise<void> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(normalizedUsername)) throw new Error('نام کاربری نامعتبر است.');
  if (!isValidPassword(password)) throw new Error('رمز عبور ضعیف است.');
  
  const existing = await db.users.where('username').equals(normalizedUsername).first();
  if (existing) throw new Error('این نام کاربری قبلاً ثبت شده است.');
  
  const salt = randomSalt();
  const passwordHash = await derivePasswordHash(password, salt);
  const securityAnswer1Hash = await derivePasswordHash(a1.trim().toLowerCase(), salt);
  const securityAnswer2Hash = await derivePasswordHash(a2.trim().toLowerCase(), salt);
  
  const user: AuthUser = {
    username: normalizedUsername,
    passwordHash,
    salt,
    role: 'pending',
    securityQuestion1: q1,
    securityAnswer1Hash,
    securityQuestion2: q2,
    securityAnswer2Hash,
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    createdAt: Date.now()
  };
  await db.users.add(user);
}

export async function getUserSecurityQuestions(username: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const { data: user } = await axios.post('/api/users/login-fetch', { username: normalizedUsername });
  if (!user || !user.securityQuestion1 || !user.securityQuestion2) {
    throw new Error('نام کاربری یافت نشد یا سوالات امنیتی تنظیم نشده‌اند.');
  }
  return { q1: user.securityQuestion1, q2: user.securityQuestion2 };
}

export async function recoverUsername(emailOrPhone: string): Promise<string[]> {
  const query = emailOrPhone.trim().toLowerCase();
  const allUsers = await db.users.toArray();
  const matches = allUsers.filter(u => u.email === query || u.phone === query).map(u => u.username);
  if (matches.length === 0) throw new Error('حسابی با این مشخصات یافت نشد.');
  return matches;
}
export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
  const user = await db.users.get(userId);
  if (!user) throw new Error('کاربر یافت نشد.');
  
  const currentHash = await derivePasswordHash(currentPassword, user.salt);
  if (!constantTimeEqual(currentHash, user.passwordHash)) {
    throw new Error('رمز عبور فعلی نادرست است.');
  }
  
  if (!isValidPassword(newPassword)) throw new Error('رمز عبور جدید ضعیف است.');
  const newPasswordHash = await derivePasswordHash(newPassword, user.salt);
  
  await db.users.update(userId, {
    passwordHash: newPasswordHash,
  });
}

export async function recoverPassword(username: string, a1: string, a2: string, newPassword: string): Promise<void> {
  const normalizedUsername = username.trim().toLowerCase();
  const { data: user } = await axios.post('/api/users/login-fetch', { username: normalizedUsername });
  if (!user || !user.securityAnswer1Hash || !user.securityAnswer2Hash) {
    throw new Error('اطلاعات نامعتبر است.');
  }
  
  const testHash1 = await derivePasswordHash(a1.trim().toLowerCase(), user.salt);
  const testHash2 = await derivePasswordHash(a2.trim().toLowerCase(), user.salt);
  
  if (!constantTimeEqual(testHash1, user.securityAnswer1Hash) || !constantTimeEqual(testHash2, user.securityAnswer2Hash)) {
    throw new Error('پاسخ‌های امنیتی نادرست است.');
  }
  
  if (!isValidPassword(newPassword)) throw new Error('رمز عبور جدید ضعیف است.');
  
  const newPasswordHash = await derivePasswordHash(newPassword, user.salt);
  await db.users.update(user.id!, { passwordHash: newPasswordHash });
}
