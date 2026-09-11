import axios from 'axios';
import type { UserRole } from '../types';

const SESSION_KEY = 'real-estate-auth-session';
const TOKEN_KEY = 'real-estate-auth-token';
const ATTEMPTS_KEY = 'real-estate-auth-attempts';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 60 * 1000;

export type StoredSession = { userId: number; username: string; role: UserRole; createdAt: number; lastActivityAt: number; };
type AttemptState = { count: number; firstAttemptAt: number };

let interceptorInstalled = false;
function installApiInterceptor() {
  if (interceptorInstalled) return;
  interceptorInstalled = true;
  axios.interceptors.request.use((config) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token && !config.url?.includes('/api/auth/')) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  axios.interceptors.response.use((response) => response, (error) => {
    if (error?.response?.status === 401 && !error?.config?.url?.includes('/api/auth/')) clearSession(false);
    return Promise.reject(error);
  });
}
installApiInterceptor();

function readAttempts(): AttemptState { try { const raw = sessionStorage.getItem(ATTEMPTS_KEY); if (!raw) return { count: 0, firstAttemptAt: Date.now() }; const state = JSON.parse(raw) as AttemptState; if (Date.now() - state.firstAttemptAt >= ATTEMPT_WINDOW_MS) return { count: 0, firstAttemptAt: Date.now() }; return state; } catch { return { count: 0, firstAttemptAt: Date.now() }; } }
function recordFailedAttempt() { const state = readAttempts(); sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count: state.count + 1, firstAttemptAt: state.firstAttemptAt })); }
function assertLoginNotThrottled() { const state = readAttempts(); if (state.count >= MAX_ATTEMPTS && Date.now() - state.firstAttemptAt < ATTEMPT_WINDOW_MS) throw new Error(`تلاش‌های بیش از حد مجاز است. ${Math.ceil((ATTEMPT_WINDOW_MS - (Date.now() - state.firstAttemptAt)) / 1000)} ثانیه دیگر دوباره تلاش کنید.`); }
function clearFailedAttempts() { sessionStorage.removeItem(ATTEMPTS_KEY); }

export function isValidPassword(password: string) { return password.length >= 8 && password.length <= 128 && /[A-Za-z]/.test(password) && /\d/.test(password); }

export function hasActiveSession(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY); const session = raw ? JSON.parse(raw) as StoredSession : null; const now = Date.now();
    if (!session || !session.userId || !session.username || !session.role || now - session.createdAt > SESSION_MAX_AGE_MS || now - session.lastActivityAt > SESSION_IDLE_TIMEOUT_MS || !sessionStorage.getItem(TOKEN_KEY)) { clearSession(false); return false; }
    return true;
  } catch { clearSession(false); return false; }
}
export function getSession(): StoredSession | null { if (!hasActiveSession()) return null; try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as StoredSession; } catch { return null; } }
export function getAccessToken(): string | null { return sessionStorage.getItem(TOKEN_KEY); }
export function touchSession(): boolean { const session = getSession(); if (!session) return false; session.lastActivityAt = Date.now(); sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); return true; }
export function clearSession(writeAudit = true) { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(TOKEN_KEY); clearFailedAttempts(); void writeAudit; }

export async function accountCount(): Promise<number> {
  const res = await axios.get('/api/auth/account-count');
  return Number(res.data?.count || 0);
}

export async function createFirstAdmin(username: string, password: string): Promise<StoredSession> {
  if (!isValidPassword(password)) throw new Error('رمز عبور باید حداقل ۸ کاراکتر و شامل حداقل یک حرف و یک عدد باشد.');
  const res = await axios.post('/api/auth/bootstrap', { username, password });
  return establishServerSession(res.data);
}

export async function login(username: string, password: string): Promise<StoredSession> {
  assertLoginNotThrottled();
  try {
    const res = await axios.post('/api/auth/login', { username: username.trim().toLowerCase(), password });
    clearFailedAttempts();
    return establishServerSession(res.data);
  } catch (error) {
    recordFailedAttempt();
    throw error;
  }
}

function establishServerSession(data: any): StoredSession {
  if (!data?.token || !data?.user?.id) throw new Error('پاسخ احراز هویت سرور نامعتبر است.');
  const now = Date.now();
  const session: StoredSession = { userId: Number(data.user.id), username: String(data.user.username), role: data.user.role as UserRole, createdAt: now, lastActivityAt: now };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); sessionStorage.setItem(TOKEN_KEY, String(data.token));
  return session;
}

export function canAccess(role: UserRole, permission: 'settings' | 'finance' | 'contracts' | 'customers' | 'dashboard' | 'users' | 'properties'): boolean {
  if (role === 'admin') return true;
  if (permission === 'users' || permission === 'settings') return false;
  if (permission === 'finance') return role === 'manager' || role === 'accountant';
  return ['contracts','customers','properties','dashboard'].includes(permission);
}

export async function createUserByAdmin(username: string, password: string, email: string, phone: string, role: string, q1 = '', a1 = '', q2 = '', a2 = '') { const res = await axios.post('/api/users', { username, password, email, phone, role, q1, a1, q2, a2 }); return res.data; }
export async function registerUser(username: string, password: string, email: string, phone: string, q1: string, a1: string, q2: string, a2: string) { await axios.post('/api/auth/register', { username, password, email, phone, q1, a1, q2, a2 }); }
export async function getUserSecurityQuestions(username: string) { const res = await axios.get('/api/auth/security-questions', { params: { username: username.trim().toLowerCase() } }); return res.data as { q1: string; q2: string }; }
export async function recoverUsername(emailOrPhone: string): Promise<string[]> { const res = await axios.post('/api/auth/recover-username', { emailOrPhone }); return Array.isArray(res.data?.usernames) ? res.data.usernames : []; }
export async function recoverPassword(username: string, a1: string, a2: string, newPassword: string): Promise<void> { await axios.post('/api/auth/recover-password', { username, a1, a2, newPassword }); }
export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> { void userId; await axios.post('/api/users/change-password', { currentPassword, newPassword }); }
