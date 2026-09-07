import { db } from '../db/db';
import type { AuthUser, UserRole } from '../types';

const SESSION_KEY = 'real-estate-auth-session';
const ATTEMPTS_KEY = 'real-estate-auth-attempts';
const ITERATIONS = 310_000;
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 60 * 1000;

type StoredSession = {
  userId: number;
  username: string;
  role: UserRole;
  createdAt: number;
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

function randomSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

async function derivePasswordHash(password: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromBase64(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

function isValidPassword(password: string): boolean {
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
    throw new Error(`تلاش‌های ورود بیش از حد مجاز است. ${seconds} ثانیه دیگر دوباره تلاش کنید.`);
  }
}

function clearFailedAttempts(): void {
  sessionStorage.removeItem(ATTEMPTS_KEY);
}

export function hasActiveSession(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as StoredSession;
    if (!session.createdAt || Date.now() - session.createdAt > SESSION_MAX_AGE_MS) {
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

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  clearFailedAttempts();
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
  const user: AuthUser = { username: normalizedUsername, passwordHash, salt, role: 'admin', createdAt: Date.now() };
  const userId = await db.users.add(user);
  return establishSession({ ...user, id: userId });
}

export async function login(username: string, password: string): Promise<StoredSession> {
  assertLoginNotThrottled();
  const normalizedUsername = username.trim().toLowerCase();
  const user = await db.users.where('username').equals(normalizedUsername).first();
  if (!user) {
    recordFailedAttempt();
    throw new Error('نام کاربری یا رمز عبور نادرست است.');
  }

  const passwordHash = await derivePasswordHash(password, user.salt);
  if (passwordHash !== user.passwordHash) {
    recordFailedAttempt();
    throw new Error('نام کاربری یا رمز عبور نادرست است.');
  }

  clearFailedAttempts();
  await db.users.update(user.id!, { lastLoginAt: Date.now() });
  return establishSession(user);
}

function establishSession(user: AuthUser): StoredSession {
  const session: StoredSession = { userId: user.id!, username: user.username, role: user.role, createdAt: Date.now() };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function canAccess(role: UserRole, permission: 'settings' | 'finance' | 'contracts' | 'customers' | 'dashboard'): boolean {
  if (role === 'admin') return true;
  if (permission === 'settings') return false;
  if (permission === 'finance') return role === 'manager' || role === 'accountant';
  if (permission === 'contracts' || permission === 'customers' || permission === 'dashboard') return true;
  return false;
}
