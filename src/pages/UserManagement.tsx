import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, KeyRound, Trash2, RefreshCw } from 'lucide-react';
import { db } from '../db/db';
import type { AuthUser, UserRole } from '../types';
import { createUser, deleteUser, changePassword, listUsers, updateUserRole, getSession } from '../services/auth';
import toast from 'react-hot-toast';

const roleLabels: Record<UserRole, string> = {
  admin: 'مدیر سیستم', manager: 'مدیر', agent: 'مشاور', accountant: 'حسابدار'
};

export default function UserManagement() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('agent');
  const session = getSession();

  const load = async () => { setLoading(true); setUsers(await listUsers()); setLoading(false); };
  useEffect(() => { void load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createUser(username, password, role); setUsername(''); setPassword(''); setRole('agent'); toast.success('کاربر با موفقیت ایجاد شد'); await load(); }
    catch (err: any) { toast.error(err.message || 'ایجاد کاربر ناموفق بود'); }
  };

  const resetPassword = async (u: AuthUser) => {
    const next = window.prompt(`رمز جدید برای ${u.username} را وارد کنید:`) || '';
    if (!next) return;
    try { await changePassword(u.id!, next, u.id === session?.userId); toast.success('رمز عبور تغییر کرد'); }
    catch (err: any) { toast.error(err.message || 'تغییر رمز ناموفق بود'); }
  };

  const remove = async (u: AuthUser) => {
    if (u.id === session?.userId) return toast.error('حساب کاربری فعال را نمی‌توان حذف کرد.');
    if (!window.confirm(`کاربر «${u.username}» حذف شود؟`)) return;
    try { await deleteUser(u.id!); toast.success('کاربر حذف شد'); await load(); }
    catch (err: any) { toast.error(err.message || 'حذف کاربر ناموفق بود'); }
  };

  return <div className="space-y-6" dir="rtl">
    <div><h2 className="text-2xl font-black">مدیریت کاربران</h2><p className="text-sm text-slate-500 mt-1">مدیریت حساب‌ها، نقش‌ها و دسترسی کارکنان</p></div>
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={add} className="bg-white rounded-2xl border p-5 shadow-sm space-y-4 h-fit">
        <h3 className="font-bold flex items-center gap-2"><UserPlus size={19}/> ایجاد کاربر</h3>
        <input className="w-full border rounded-xl px-3 py-2" placeholder="نام کاربری" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="w-full border rounded-xl px-3 py-2" type="password" placeholder="رمز عبور" value={password} onChange={e => setPassword(e.target.value)} />
        <select className="w-full border rounded-xl px-3 py-2" value={role} onChange={e => setRole(e.target.value as UserRole)}>
          {(Object.keys(roleLabels) as UserRole[]).filter(r => r !== 'admin').map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
        </select>
        <button className="w-full bg-emerald-600 text-white rounded-xl py-2.5 font-bold">ایجاد حساب</button>
      </form>
      <section className="lg:col-span-2 bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between"><h3 className="font-bold flex items-center gap-2"><ShieldCheck size={19}/> حساب‌های سیستم</h3><button onClick={() => void load()} className="p-2 rounded-lg hover:bg-slate-100"><RefreshCw size={18}/></button></div>
        {loading ? <div className="p-8 text-center text-slate-500">در حال بارگذاری...</div> : <div className="divide-y">{users.map(u => <div key={u.id} className="p-4 flex items-center justify-between gap-4">
          <div><div className="font-bold">{u.username}</div><div className="text-xs text-slate-500">{roleLabels[u.role]} · آخرین ورود: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('fa-IR') : 'هنوز وارد نشده'}</div></div>
          <div className="flex items-center gap-2"><select disabled={u.id === session?.userId || u.role === 'admin'} className="border rounded-lg px-2 py-1 text-sm" value={u.role} onChange={async e => { try { await updateUserRole(u.id!, e.target.value as UserRole); toast.success('نقش تغییر کرد'); await load(); } catch (err: any) { toast.error(err.message); } }}>
            {(Object.keys(roleLabels) as UserRole[]).map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
          </select><button onClick={() => void resetPassword(u)} title="تغییر رمز" className="p-2 rounded-lg hover:bg-amber-50 text-amber-600"><KeyRound size={17}/></button><button onClick={() => void remove(u)} title="حذف" className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={17}/></button></div>
        </div>)}</div>}
      </section>
    </div>
  </div>;
}
