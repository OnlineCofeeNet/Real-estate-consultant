import axios from 'axios';
import type { UserRole } from '../types';

const SESSION_KEY = 'real-estate-auth-session';
const ATTEMPTS_KEY = 'real-estate-auth-attempts';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 60 * 1000;

export type StoredSession = { userId: number; username: string; role: UserRole; token: string; createdAt: number; lastActivityAt: number };
type AttemptState = { count: number; firstAttemptAt: number };

axios.interceptors.request.use((config) => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw) as StoredSession;
      if (session.token) config.headers.Authorization = `Bearer ${session.token}`;
    }
  } catch {}
  return config;
});

function readAttempts(): AttemptState { try { const raw = sessionStorage.getItem(ATTEMPTS_KEY); if (!raw) return { count: 0, firstAttemptAt: Date.now() }; const state = JSON.parse(raw) as AttemptState; if (Date.now() - state.firstAttemptAt >= ATTEMPT_WINDOW_MS) return { count: 0, firstAttemptAt: Date.now() }; return state; } catch { return { count: 0, firstAttemptAt: Date.now() }; } }
function recordFailedAttempt() { const state = readAttempts(); sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count: state.count + 1, firstAttemptAt: state.firstAttemptAt })); }
function assertLoginNotThrottled() { const state = readAttempts(); if (state.count >= MAX_ATTEMPTS && Date.now() - state.firstAttemptAt < ATTEMPT_WINDOW_MS) { const seconds = Math.ceil((ATTEMPT_WINDOW_MS - (Date.now() - state.firstAttemptAt)) / 1000); throw new Error(`تلاش‌های بیش از حد مجاز است. ${seconds} ثانیه دیگر دوباره تلاش کنید.`); } }
function clearFailedAttempts() { sessionStorage.removeItem(ATTEMPTS_KEY); }
export function isValidPassword(password: string) { return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password); }

export function hasActiveSession(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY); if (!raw) return false;
    const session = JSON.parse(raw) as StoredSession; const now = Date.now();
    if (!session.token || !session.userId || !session.username || !session.role || !session.createdAt || !session.lastActivityAt || now - session.createdAt > SESSION_MAX_AGE_MS || now - session.lastActivityAt > SESSION_IDLE_TIMEOUT_MS) { clearSession(); return false; }
    return true;
  } catch { clearSession(); return false; }
}
export function getSession(): StoredSession | null { if (!hasActiveSession()) return null; try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as StoredSession | null; } catch { return null; } }
export function touchSession(): boolean { const session = getSession(); if (!session) return false; session.lastActivityAt = Date.now(); sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); return true; }
export function clearSession(): void { sessionStorage.removeItem(SESSION_KEY); clearFailedAttempts(); }

function establishSession(data: { token: string; user: { id: number; username: string; role: UserRole } }): StoredSession {
  const now = Date.now(); const session: StoredSession = { userId: data.user.id, username: data.user.username, role: data.user.role, token: data.token, createdAt: now, lastActivityAt: now }; sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); return session;
}

export async function accountCount(): Promise<number> { const res = await axios.get('/api/auth/account-count'); return Number(res.data ?? 0); }

export async function createFirstAdmin(username: string, password: string): Promise<StoredSession> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(normalizedUsername)) throw new Error('نام کاربری باید ۳ تا ۴۰ کاراکتر و فقط شامل حروف انگلیسی، عدد، نقطه، خط تیره یا زیرخط باشد.');
  if (!isValidPassword(password)) throw new Error('رمز عبور باید حداقل ۸ کاراکتر و شامل حداقل یک حرف و یک عدد باشد.');
  try { const res = await axios.post('/api/auth/first-admin', { username: normalizedUsername, password }); return establishSession(res.data); } catch (error: any) { throw new Error(error?.response?.data?.error || 'ایجاد حساب مدیر انجام نشد.'); }
}

export async function login(username: string, password: string): Promise<StoredSession> {
  assertLoginNotThrottled();
  try { const res = await axios.post('/api/auth/login', { username: username.trim().toLowerCase(), password }); clearFailedAttempts(); return establishSession(res.data); }
  catch (error: any) { recordFailedAttempt(); throw new Error(error?.response?.data?.error || 'نام کاربری یا رمز عبور نادرست است.'); }
}

export function canAccess(role: UserRole, permission: 'settings' | 'finance' | 'contracts' | 'customers' | 'dashboard' | 'users'): boolean {
  if (role === 'admin') return true;
  if (permission === 'users' || permission === 'settings') return false;
  if (permission === 'finance') return role === 'manager' || role === 'accountant';
  return true;
}

export async function registerUser(username: string, password: string, email: string, phone: string, q1: string, a1: string, q2: string, a2: string): Promise<void> {
  if (!isValidPassword(password)) throw new Error('رمز عبور ضعیف است.');
  try { await axios.post('/api/auth/register', { username: username.trim().toLowerCase(), password, email, phone, q1, a1, q2, a2 }); } catch (error: any) { throw new Error(error?.response?.data?.error || 'ثبت‌نام انجام نشد.'); }
}

export async function getUserSecurityQuestions(username: string) {
  try { const res = await axios.get(`/api/auth/security-questions/${encodeURIComponent(username.trim().toLowerCase())}`); return res.data; } catch (error: any) { throw new Error(error?.response?.data?.error || 'اطلاعات امنیتی یافت نشد.'); }
}
export async function recoverUsername(emailOrPhone: string): Promise<string[]> {
  try { const res = await axios.post('/api/auth/recover-username', { emailOrPhone: emailOrPhone.trim() }); return Array.isArray(res.data) ? res.data : []; } catch (error: any) { throw new Error(error?.response?.data?.error || 'حسابی با این مشخصات یافت نشد.'); }
}
export async function recoverPassword(username: string, a1: string, a2: string, newPassword: string): Promise<void> {
  if (!isValidPassword(newPassword)) throw new Error('رمز عبور جدید ضعیف است.');
  try { await axios.post('/api/auth/recover-password', { username: username.trim().toLowerCase(), a1, a2, newPassword }); } catch (error: any) { throw new Error(error?.response?.data?.error || 'بازیابی رمز عبور انجام نشد.'); }
}
export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
  if (!isValidPassword(newPassword)) throw new Error('رمز عبور جدید ضعیف است.');
  try { await axios.post('/api/auth/change-password', { userId, currentPassword, newPassword }); } catch (error: any) { throw new Error(error?.response?.data?.error || 'تغییر رمز عبور انجام نشد.'); }
}
