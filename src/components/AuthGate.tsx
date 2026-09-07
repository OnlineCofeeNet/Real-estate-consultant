import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { accountCount, canAccess, createFirstAdmin, getSession, login, clearSession } from '../services/auth';
import type { UserRole } from '../types';

export const AuthGate = () => {
  const [ready, setReady] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);

  useEffect(() => {
    accountCount().then((count) => {
      setHasAccount(count > 0);
      setReady(true);
    });
  }, []);

  if (!ready) return <AuthShell title="در حال بررسی امنیت سامانه..." />;
  if (!hasAccount) return <FirstRunSetup onCreated={() => setHasAccount(true)} />;
  if (!getSession()) return <Login />;
  return <Outlet />;
};

export const ProtectedRoute = ({ permission }: { permission: 'settings' | 'finance' | 'contracts' | 'customers' | 'dashboard' }) => {
  const session = getSession();
  const location = useLocation();
  if (!session) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  return canAccess(session.role, permission) ? <Outlet /> : <Navigate to="/" replace />;
};

export const UserMenu = () => {
  const session = getSession();
  const navigate = useNavigate();
  if (!session) return null;

  const roleLabel: Record<UserRole, string> = {
    admin: 'مدیر سیستم',
    manager: 'مدیر',
    agent: 'مشاور',
    accountant: 'حسابدار',
  };

  const logout = () => {
    clearSession();
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-400">{session.username} · {roleLabel[session.role]}</span>
      <button onClick={logout} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white">خروج</button>
    </div>
  );
};

const FirstRunSetup = ({ onCreated }: { onCreated: () => void }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirm) return setError('تکرار رمز عبور مطابقت ندارد.');
    setBusy(true);
    try {
      await createFirstAdmin(username, password);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ایجاد حساب انجام نشد.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="راه‌اندازی امنیت سامانه" subtitle="این مرحله فقط یک‌بار انجام می‌شود و رمز عبور به‌صورت متن ساده ذخیره نمی‌شود.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="نام کاربری" value={username} onChange={setUsername} autoComplete="username" />
        <Field label="رمز عبور مدیر" value={password} onChange={setPassword} type="password" autoComplete="new-password" />
        <Field label="تکرار رمز عبور" value={confirm} onChange={setConfirm} type="password" autoComplete="new-password" />
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 font-bold">{busy ? 'در حال ایجاد...' : 'ایجاد حساب مدیر'}</button>
      </form>
    </AuthShell>
  );
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ورود انجام نشد.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="ورود به سامانه" subtitle="برای دسترسی به قراردادها، مشتریان و امور مالی وارد شوید.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="نام کاربری" value={username} onChange={setUsername} autoComplete="username" />
        <Field label="رمز عبور" value={password} onChange={setPassword} type="password" autoComplete="current-password" />
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 font-bold">{busy ? 'در حال ورود...' : 'ورود'}</button>
      </form>
    </AuthShell>
  );
};

const Field = ({ label, value, onChange, type = 'text', autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string }) => (
  <label className="block text-sm font-medium text-slate-700">
    <span className="block mb-1.5">{label}</span>
    <input dir="ltr" type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500" />
  </label>
);

const AuthShell = ({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) => (
  <div dir="rtl" className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><ShieldCheck size={26} /></div>
        <div><h1 className="text-xl font-black text-slate-900">{title}</h1>{subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}</div>
      </div>
      {!children && <div className="flex items-center gap-2 text-slate-500 text-sm"><LockKeyhole size={18} /> لطفاً چند لحظه صبر کنید.</div>}
      {children}
    </div>
  </div>
);
