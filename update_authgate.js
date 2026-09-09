const fs = require('fs');

const content = `
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, ShieldCheck, KeyRound, UserPlus, HelpCircle } from 'lucide-react';
import { accountCount, canAccess, createFirstAdmin, getSession, login, clearSession, registerUser, getUserSecurityQuestions, recoverPassword, recoverUsername } from '../services/auth';
import type { UserRole } from '../types';
import toast from 'react-hot-toast';

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
  if (!getSession()) return <AuthFlow />;

  return <Outlet />;
};

export const ProtectedRoute = ({ permission }: { permission: 'settings' | 'finance' | 'contracts' | 'customers' | 'dashboard' | 'users' }) => {
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

const AuthFlow = () => {
  const [mode, setMode] = useState<'login' | 'register' | 'recover-username' | 'recover-password'>('login');
  
  if (mode === 'register') return <Register onBack={() => setMode('login')} />;
  if (mode === 'recover-username') return <RecoverUsername onBack={() => setMode('login')} />;
  if (mode === 'recover-password') return <RecoverPassword onBack={() => setMode('login')} />;
  
  return <Login onSwitch={(newMode) => setMode(newMode as any)} />;
};

const Login = ({ onSwitch }: { onSwitch: (mode: string) => void }) => {
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
    <AuthShell title="ورود به سامانه" subtitle="برای دسترسی به سیستم وارد شوید.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="نام کاربری" value={username} onChange={setUsername} autoComplete="username" />
        <Field label="رمز عبور" value={password} onChange={setPassword} type="password" autoComplete="current-password" />
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 font-bold">{busy ? 'در حال ورود...' : 'ورود'}</button>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-sm text-slate-600">
        <button onClick={() => onSwitch('register')} className="text-emerald-600 hover:underline">ثبت‌نام کاربر جدید</button>
        <button onClick={() => onSwitch('recover-password')} className="text-emerald-600 hover:underline">رمز عبور خود را فراموش کرده‌ام</button>
        <button onClick={() => onSwitch('recover-username')} className="text-emerald-600 hover:underline">نام کاربری خود را فراموش کرده‌ام</button>
      </div>
    </AuthShell>
  );
};

const Register = ({ onBack }: { onBack: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [q1, setQ1] = useState('');
  const [a1, setA1] = useState('');
  const [q2, setQ2] = useState('');
  const [a2, setA2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await registerUser(username, password, email, phone, q1, a1, q2, a2);
      toast.success('ثبت‌نام با موفقیت انجام شد. پس از تایید مدیر، دسترسی شما باز خواهد شد.');
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ثبت‌نام ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="ثبت‌نام کاربر جدید" subtitle="پس از ثبت‌نام، نیاز به تایید مدیر سیستم دارید.">
      <form onSubmit={submit} className="space-y-4 max-h-[60vh] overflow-y-auto px-1 -mx-1">
        <Field label="نام کاربری" value={username} onChange={setUsername} required />
        <Field label="رمز عبور" value={password} onChange={setPassword} type="password" required />
        <Field label="ایمیل" value={email} onChange={setEmail} type="email" required />
        <Field label="شماره تماس" value={phone} onChange={setPhone} required />
        <div className="border-t pt-4 border-slate-200 mt-4">
          <p className="text-xs text-slate-500 mb-4">لطفاً سوالات امنیتی را به دقت پر کنید تا در صورت فراموشی رمز عبور بتوانید آن را بازیابی کنید.</p>
          <Field label="سوال امنیتی اول (مثلاً نام شهر تولد؟)" value={q1} onChange={setQ1} required />
          <Field label="پاسخ سوال اول" value={a1} onChange={setA1} required />
          <Field label="سوال امنیتی دوم (مثلاً غذای مورد علاقه؟)" value={q2} onChange={setQ2} required />
          <Field label="پاسخ سوال دوم" value={a2} onChange={setA2} required />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 font-bold">{busy ? 'در حال ثبت...' : 'ثبت‌نام'}</button>
      </form>
      <button onClick={onBack} className="mt-4 text-sm text-slate-500 hover:text-slate-800">بازگشت به صفحه ورود</button>
    </AuthShell>
  );
};

const RecoverUsername = ({ onBack }: { onBack: () => void }) => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [result, setResult] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const matches = await recoverUsername(emailOrPhone);
      setResult(matches);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بازیابی.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="بازیابی نام کاربری" subtitle="ایمیل یا شماره موبایل ثبت شده خود را وارد کنید.">
      {result.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-emerald-700 bg-emerald-50 p-4 rounded-xl">
            نام(های) کاربری شما: <br/>
            {result.map(r => <strong key={r} className="block mt-1">{r}</strong>)}
          </p>
          <button onClick={onBack} className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 py-3 font-bold">بازگشت به ورود</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="ایمیل یا موبایل" value={emailOrPhone} onChange={setEmailOrPhone} required />
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 font-bold">{busy ? 'در حال بررسی...' : 'بازیابی نام کاربری'}</button>
          <button type="button" onClick={onBack} className="w-full mt-2 text-sm text-slate-500 hover:text-slate-800">بازگشت</button>
        </form>
      )}
    </AuthShell>
  );
};

const RecoverPassword = ({ onBack }: { onBack: () => void }) => {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const qs = await getUserSecurityQuestions(username);
      setQ1(qs.q1);
      setQ2(qs.q2);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'نام کاربری یافت نشد.');
    } finally {
      setBusy(false);
    }
  };

  const submitRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await recoverPassword(username, a1, a2, newPassword);
      toast.success('رمز عبور شما با موفقیت تغییر کرد.');
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در تایید پاسخ‌ها.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="بازیابی رمز عبور" subtitle={step === 1 ? "نام کاربری خود را وارد کنید." : "به سوالات امنیتی پاسخ دهید."}>
      {step === 1 ? (
        <form onSubmit={fetchQuestions} className="space-y-4">
          <Field label="نام کاربری" value={username} onChange={setUsername} required />
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 font-bold">{busy ? 'در حال بررسی...' : 'ادامه'}</button>
          <button type="button" onClick={onBack} className="w-full mt-2 text-sm text-slate-500 hover:text-slate-800">بازگشت</button>
        </form>
      ) : (
        <form onSubmit={submitRecovery} className="space-y-4">
          <Field label={q1} value={a1} onChange={setA1} required />
          <Field label={q2} value={a2} onChange={setA2} required />
          <Field label="رمز عبور جدید" value={newPassword} onChange={setNewPassword} type="password" required />
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 font-bold">{busy ? 'در حال اعمال...' : 'تغییر رمز عبور'}</button>
          <button type="button" onClick={() => setStep(1)} className="w-full mt-2 text-sm text-slate-500 hover:text-slate-800">تغییر نام کاربری</button>
        </form>
      )}
    </AuthShell>
  );
};

const Field = ({ label, value, onChange, type = 'text', autoComplete, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; required?: boolean; }) => (
  <label className="block text-sm font-medium text-slate-700">
    <span className="block mb-1.5">{label}</span>
    <input dir="ltr" type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required={required} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500" />
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
`;

fs.writeFileSync('src/components/AuthGate.tsx', content);
