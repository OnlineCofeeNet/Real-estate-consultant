import React, { useState } from 'react';
import { useLiveQuery } from '@/src/db/db';
import { db } from '../db/db';
import { Shield, ShieldAlert, Check, UserCheck, Search, ShieldCheck } from 'lucide-react';
import type { AuthUser, UserRole } from '../types';
import toast from 'react-hot-toast';

export default function Users() {
  const users = useLiveQuery(() => db.users.toArray()) || [];
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(u => u.username.includes(search.toLowerCase()) || (u.email && u.email.includes(search)) || (u.phone && u.phone.includes(search)));

  const changeRole = async (userId: number, newRole: UserRole) => {
    try {
      await db.users.update(userId, { role: newRole });
      toast.success('سطح دسترسی کاربر تغییر کرد.');
    } catch (e) {
      toast.error('تغییر سطح دسترسی ناموفق بود.');
    }
  };

  const roleLabels: Record<UserRole, string> = {
    admin: 'مدیر کل (تمام دسترسی‌ها)',
    manager: 'مدیر (مالی، قراردادها، مشتریان)',
    agent: 'مشاور (قراردادها، مشتریان)',
    accountant: 'حسابدار (مالی)'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck className="text-emerald-600" />
          مدیریت کاربران و دسترسی‌ها
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <input 
              type="text" 
              placeholder="جستجوی نام کاربری، ایمیل یا موبایل..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
            />
            <Search size={18} className="absolute right-3 top-3 text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="py-4 px-4 rounded-tr-xl">نام کاربری</th>
                <th className="py-4 px-4">موبایل</th>
                <th className="py-4 px-4">ایمیل</th>
                <th className="py-4 px-4">تاریخ ثبت‌نام</th>
                <th className="py-4 px-4">آخرین ورود</th>
                <th className="py-4 px-4 rounded-tl-xl w-64">سطح دسترسی (نقش)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-4 px-4 font-bold text-slate-900" dir="ltr">{user.username}</td>
                  <td className="py-4 px-4 text-slate-600">{user.phone || '-'}</td>
                  <td className="py-4 px-4 text-slate-600">{user.email || '-'}</td>
                  <td className="py-4 px-4 text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="py-4 px-4 text-slate-500">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('fa-IR') : 'هیچ‌وقت'}
                  </td>
                  <td className="py-4 px-4">
                    <select 
                      value={user.role} 
                      onChange={(e) => changeRole(user.id!, e.target.value as UserRole)}
                      className={`w-full bg-slate-100 border-none outline-none py-2 px-3 rounded-lg text-sm font-medium ${user.role === 'admin' ? 'text-red-700 bg-red-50' : 'text-slate-800'}`}
                    >
                      <option value="admin">{roleLabels.admin}</option>
                      <option value="manager">{roleLabels.manager}</option>
                      <option value="accountant">{roleLabels.accountant}</option>
                      <option value="agent">{roleLabels.agent}</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">هیچ کاربری یافت نشد.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
