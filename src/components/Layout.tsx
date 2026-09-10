import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Settings, HelpCircle, WalletCards, ShieldCheck, Building2 } from 'lucide-react';
import { useLiveQuery } from '@/src/db/db';
import { db } from '../db/db';
import { UserMenu } from './AuthGate';
import { canAccess, getSession } from '../services/auth';

const Layout = () => {
  const settings = useLiveQuery(() => db.settings.get(1));
  const agencyName = settings?.agencyName || 'سامانه املاک';
  const session = getSession();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden" dir="rtl">
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-lg z-20">
        <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-xl text-white">{agencyName.charAt(0)}</div>
          <div><h1 className="text-lg font-bold leading-none text-white truncate w-40">{agencyName}</h1><p className="text-[10px] text-slate-400 mt-1 truncate">سامانه جامع صدور فاکتور هوشمند</p></div>
        </div>
        <nav className="flex-1 flex flex-col py-4 gap-1 px-3">
          <NavItem to="/" icon={<LayoutDashboard size={20} />} label="داشبورد" />
          {session && canAccess(session.role, 'properties') && <NavItem to="/properties" icon={<Building2 size={20} />} label="املاک" />}
          {session && canAccess(session.role, 'contracts') && <NavItem to="/contracts" icon={<FileText size={20} />} label="قرارداد" />}
          {session && canAccess(session.role, 'finance') && <NavItem to="/finance" icon={<WalletCards size={20} />} label="مدیریت مالی" />}
          {session && canAccess(session.role, 'customers') && <NavItem to="/customers" icon={<Users size={20} />} label="مشتریان" />}
          {canAccess(session?.role || 'agent', 'users') && (
            <NavLink to="/users" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <ShieldCheck size={20} /> مدیریت کاربران
            </NavLink>
          )}
          {session && canAccess(session.role, 'settings') && <NavItem to="/settings" icon={<Settings size={20} />} label="تنظیمات" />}
          <NavItem to="/help" icon={<HelpCircle size={20} />} label="راهنما" />
        </nav>
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col gap-3">
          <UserMenu />
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/><span>POS: متصل</span></div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-400 rounded-full"/><span>چاپگر: آماده</span></div>
        </div>
      </aside>
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden bg-slate-900 text-white shadow-md px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3"><div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-sm text-white">{agencyName.charAt(0)}</div><h1 className="text-lg font-bold truncate max-w-[200px]">{agencyName}</h1></div>
          <UserMenu />
        </header>
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4"><div className="max-w-7xl mx-auto h-full"><Outlet /></div></main>
        <nav className="md:hidden fixed bottom-0 w-full bg-slate-900 shadow-[0_-1px_3px_rgba(0,0,0,0.3)] flex justify-around z-20">
          <NavItem to="/" icon={<LayoutDashboard size={24} />} label="داشبورد" />
          {session && canAccess(session.role, 'properties') && <NavItem to="/properties" icon={<Building2 size={24} />} label="املاک" />}
          {session && canAccess(session.role, 'contracts') && <NavItem to="/contracts" icon={<FileText size={24} />} label="قرارداد" />}
          {session && canAccess(session.role, 'customers') && <NavItem to="/customers" icon={<Users size={24} />} label="مشتریان" />}
          {session && canAccess(session.role, 'settings') && <NavItem to="/settings" icon={<Settings size={24} />} label="تنظیمات" />}
        </nav>
      </div>
    </div>
  );
};

const NavItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <NavLink to={to} className={({ isActive }) => `flex md:flex-row flex-col items-center justify-center md:justify-start w-full py-2 md:py-3 md:px-4 md:rounded-lg ${isActive ? 'text-emerald-400 font-bold md:bg-emerald-600 md:text-white' : 'text-slate-400 hover:text-slate-200 md:hover:bg-slate-800'} transition-colors`}>
    {icon}<span className="text-xs md:text-sm mt-1 md:mt-0 md:mr-3 font-medium">{label}</span>
  </NavLink>
);

export default Layout;
