import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Phone, 
  Award, 
  Percent, 
  FileText, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  BookOpen,
  ArrowLeft,
  X,
  Send,
  MessageSquare
} from 'lucide-react';
import type { AgentProfile } from '../types';
import { toPersianDigits, toEnglishDigits, formatCurrency } from '../utils/format';

export default function Agents() {
  const navigate = useNavigate();
  const settings = useLiveQuery(() => db.settings.get(1));
  const contracts = useLiveQuery(() => db.contracts.toArray()) || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentProfile | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    guildCode: '',
    commissionPercent: 30,
    description: '',
    telegramId: '',
    baleId: '',
    rubikaId: '',
    status: 'active' as 'active' | 'inactive'
  });

  const agents: AgentProfile[] = useMemo(() => {
    return settings?.agents || [];
  }, [settings]);

  // Statistics calculation for each agent based on registered contracts
  const agentStatsMap = useMemo(() => {
    const map: Record<string, { dealsCount: number; totalVolume: number; totalCommission: number; totalShare: number }> = {};

    contracts.forEach(c => {
      if (c.agentName) {
        const key = c.agentName.trim().toLowerCase();
        if (!map[key]) {
          map[key] = { dealsCount: 0, totalVolume: 0, totalCommission: 0, totalShare: 0 };
        }
        map[key].dealsCount += 1;
        map[key].totalVolume += Number(c.price || 0);
        const comm = Number(c.commission || 0);
        map[key].totalCommission += comm;
        const share = Number(c.agentShareAmount) || (c.agentCommissionPercent ? Math.round((comm * c.agentCommissionPercent) / 100) : 0);
        map[key].totalShare += share;
      }
    });

    return map;
  }, [contracts]);

  // KPI Overview
  const totalAgentsCount = agents.length;
  const activeAgentsCount = agents.filter(a => a.status !== 'inactive').length;
  const totalDealsByAgents = contracts.filter(c => c.agentName).length;
  const totalAgentSharesAll = contracts.reduce((s, c) => s + (Number(c.agentShareAmount) || 0), 0);

  // Filtered agents
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;
    const q = searchQuery.toLowerCase().trim();
    return agents.filter(a => 
      a.fullName.toLowerCase().includes(q) ||
      (a.firstName && a.firstName.toLowerCase().includes(q)) ||
      (a.lastName && a.lastName.toLowerCase().includes(q)) ||
      (a.phone && a.phone.includes(q)) ||
      (a.guildCode && a.guildCode.includes(q)) ||
      (a.licenseCode && a.licenseCode.includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q))
    );
  }, [agents, searchQuery]);

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingAgent(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      guildCode: '',
      commissionPercent: 30,
      description: '',
      telegramId: '',
      baleId: '',
      rubikaId: '',
      status: 'active'
    });
    setShowModal(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (agent: AgentProfile) => {
    setEditingAgent(agent);
    
    // Split fullName into first and last if needed
    let fName = agent.firstName || '';
    let lName = agent.lastName || '';
    if (!fName && !lName && agent.fullName) {
      const parts = agent.fullName.trim().split(' ');
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }

    setFormData({
      firstName: fName,
      lastName: lName,
      phone: agent.phone || '',
      guildCode: agent.guildCode || agent.licenseCode || '',
      commissionPercent: agent.commissionPercent ?? 30,
      description: agent.description || '',
      telegramId: agent.telegramId || '',
      baleId: agent.baleId || '',
      rubikaId: agent.rubikaId || '',
      status: agent.status || 'active'
    });
    setShowModal(true);
  };

  // Save Agent (Add or Edit)
  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() && !formData.lastName.trim()) {
      toast.error('لطفاً نام یا نام خانوادگی مباشر را وارد کنید');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('شماره موبایل مباشر الزامی است');
      return;
    }

    const cleanPhone = toEnglishDigits(formData.phone.trim());
    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim() || formData.firstName.trim() || formData.lastName.trim();

    try {
      const currentAgents = [...(settings?.agents || [])];

      if (editingAgent) {
        // Update existing agent
        const index = currentAgents.findIndex(a => a.id === editingAgent.id);
        if (index !== -1) {
          currentAgents[index] = {
            ...currentAgents[index],
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            fullName,
            phone: cleanPhone,
            guildCode: formData.guildCode.trim(),
            licenseCode: formData.guildCode.trim(),
            commissionPercent: Number(formData.commissionPercent) || 30,
            description: formData.description.trim(),
            telegramId: formData.telegramId.trim(),
            baleId: formData.baleId.trim(),
            rubikaId: formData.rubikaId.trim(),
            status: formData.status,
            updatedAt: Date.now()
          };
        }
        toast.success(`مشخصات مباشر (${fullName}) با موفقیت به‌روزرسانی شد`);
      } else {
        // Create new agent
        const newAgent: AgentProfile = {
          id: 'agent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          fullName,
          phone: cleanPhone,
          guildCode: formData.guildCode.trim(),
          licenseCode: formData.guildCode.trim(),
          commissionPercent: Number(formData.commissionPercent) || 30,
          description: formData.description.trim(),
          telegramId: formData.telegramId.trim(),
          baleId: formData.baleId.trim(),
          rubikaId: formData.rubikaId.trim(),
          status: formData.status,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        currentAgents.push(newAgent);
        toast.success(`مباشر جدید (${fullName}) با موفقیت در سیستم ثبت گردید`);
      }

      await db.settings.update(1, { agents: currentAgents, updatedAt: Date.now() });
      setShowModal(false);
    } catch (err: any) {
      toast.error('خطا در ذخیره اطلاعات مباشر: ' + err.message);
    }
  };

  // Delete Agent
  const handleDeleteAgent = async (agent: AgentProfile) => {
    if (!window.confirm(`آیا از حذف مباشر «${agent.fullName}» اطمینان دارید؟`)) return;

    try {
      const currentAgents = (settings?.agents || []).filter(a => a.id !== agent.id);
      await db.settings.update(1, { agents: currentAgents, updatedAt: Date.now() });
      toast.success(`مباشر «${agent.fullName}» از سیستم حذف شد`);
    } catch (err: any) {
      toast.error('خطا در حذف مباشر: ' + err.message);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} کپی شد`);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80">
              <UserCheck size={24} />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900">مدیریت و تعریف مباشرین و مشاوران املاک</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                تعریف کادر مشاوران، تعیین درصد سهم کمیسیون، انتساب به فاکتورها و تسویه حساب‌های مالی
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/accounting')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <BookOpen size={16} className="text-amber-600" />
            <span>گزارشات و دفتر معین</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Plus size={16} />
            <span>تعریف مباشر جدید</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <UserCheck size={22} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">کل مباشران ثبت‌شده</span>
            <div className="text-lg font-bold font-mono text-slate-800">
              {toPersianDigits(totalAgentsCount)} نفر
            </div>
            <span className="text-[10px] text-emerald-600">{toPersianDigits(activeAgentsCount)} مباشر فعال</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FileText size={22} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">معاملات منتسب به مباشر</span>
            <div className="text-lg font-bold font-mono text-slate-800">
              {toPersianDigits(totalDealsByAgents)} قرارداد
            </div>
            <span className="text-[10px] text-purple-600">همراه با سهم درصدی مصوب</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">مجموع پورسانت مباشران</span>
            <div className="text-lg font-bold font-mono text-emerald-700">
              {formatCurrency(totalAgentSharesAll)}
            </div>
            <span className="text-[10px] text-slate-400">سهم تعهدشده دفتر به مشاوران</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Percent size={22} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">میانگین سهم مباشر در دفتر</span>
            <div className="text-lg font-bold font-mono text-blue-700">
              {toPersianDigits(30)}٪
            </div>
            <span className="text-[10px] text-slate-400">قابل تنظیم برای هر مباشر یا قرارداد</span>
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس نام، شماره موبایل یا کد صنفی..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>نمایش {toPersianDigits(filteredAgents.length)} از {toPersianDigits(agents.length)} مباشر</span>
        </div>
      </div>

      {/* Agents Grid / Table */}
      {filteredAgents.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
            <UserCheck size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm">هیچ مباشری یافت نشد</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery 
                ? 'با عبارت جستجوی فعلی مباشری پیدا نشد. لطفاً کلمات جستجو را تغییر دهید.' 
                : 'هنوز هیچ مباشری در سامانه ثبت نشده است. با کلیک بر روی دکمه «تعریف مباشر جدید» می‌توانید مشخصات و کد صنفی مباشران آژانس را ثبت کنید.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={handleOpenAdd}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={16} />
              <span>تعریف اولین مباشر</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map(agent => {
            const agentKey = agent.fullName.trim().toLowerCase();
            const stats = agentStatsMap[agentKey] || { dealsCount: 0, totalVolume: 0, totalCommission: 0, totalShare: 0 };

            return (
              <div
                key={agent.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 relative group"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                        {agent.fullName.charAt(0) || 'م'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-800 text-sm">{agent.fullName}</h3>
                          {agent.status === 'inactive' && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">غیرفعال</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1 font-mono" dir="ltr">
                            <Phone size={12} className="text-amber-600" />
                            {toPersianDigits(agent.phone)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(agent.phone, 'شماره موبایل')}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                            title="کپی شماره"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(agent)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        title="ویرایش مباشر"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteAgent(agent)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="حذف مباشر"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Guild & Commission Badge */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block mb-0.5">کد صنفی اتحادیه:</span>
                      <span className="font-mono font-bold text-slate-700">
                        {agent.guildCode || agent.licenseCode ? toPersianDigits(agent.guildCode || agent.licenseCode) : 'ثبت نشده'}
                      </span>
                    </div>
                    <div className="bg-amber-50/60 p-2 rounded-xl border border-amber-100">
                      <span className="text-[10px] text-amber-700/80 block mb-0.5">سهم کمیسیون پیش‌فرض:</span>
                      <span className="font-mono font-bold text-amber-800">
                        {toPersianDigits(agent.commissionPercent ?? 30)}٪
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {agent.description && (
                    <div className="mt-3 p-2.5 bg-slate-50/80 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                      <span className="font-bold text-slate-400 block mb-0.5 text-[10px]">توضیحات و سوابق:</span>
                      {agent.description}
                    </div>
                  )}

                  {/* Performance Summary */}
                  <div className="mt-3 p-3 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>قراردادهای منعقدشده:</span>
                      <span className="font-bold font-mono text-slate-800">{toPersianDigits(stats.dealsCount)} فقره</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>کل درآمد کمیسیون:</span>
                      <span className="font-bold font-mono text-slate-800">{formatCurrency(stats.totalCommission)}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700 font-bold pt-1 border-t border-slate-200/60">
                      <span>کل سهم / طلب مباشر:</span>
                      <span className="font-mono">{formatCurrency(stats.totalShare)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => navigate(`/accounting?tab=ledger&person=${encodeURIComponent(agent.fullName)}`)}
                    className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 text-[11px]"
                  >
                    <BookOpen size={13} />
                    <span>گردش حساب در دفتر معین</span>
                  </button>
                  <button
                    onClick={() => navigate(`/contracts`)}
                    className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[11px]"
                  >
                    <span>صدور فاکتور</span>
                    <ArrowLeft size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT AGENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <UserCheck size={20} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {editingAgent ? 'ویرایش اطلاعات مباشر' : 'تعریف مباشر / مشاور جدید'}
                  </h3>
                  <p className="text-xs text-slate-400">ثبت اطلاعات هویتی، کد صنفی، سهم پورسانت و پیام‌رسان‌ها</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAgent} className="space-y-4 text-xs">
              {/* نام و نام خانوادگی */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    نام <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: رضا"
                    value={formData.firstName}
                    onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    نام خانوادگی <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: حسینی"
                    value={formData.lastName}
                    onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                  />
                </div>
              </div>

              {/* موبایل و کد صنفی */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    شماره موبایل <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    placeholder="0912..."
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    کد صنفی / شماره پروانه اتحادیه:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="مثال: 987654"
                    value={formData.guildCode}
                    onChange={e => setFormData(prev => ({ ...prev, guildCode: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-mono text-right"
                  />
                </div>
              </div>

              {/* درصد سهم کمیسیون و وضعیت فعالیت */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    درصد سهم کمیسیون پیش‌فرض (پورسانت مباشر):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.commissionPercent}
                      onChange={e => setFormData(prev => ({ ...prev, commissionPercent: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-mono font-bold text-center"
                    />
                    <span className="font-bold text-slate-600">٪</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    این درصد هنگام صدور فاکتور یا ثبت قرارداد به صورت خودکار بارگذاری خواهد شد.
                  </span>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    وضعیت فعالیت مباشر:
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                  >
                    <option value="active">فعال (در حال فعالیت)</option>
                    <option value="inactive">غیرفعال / مرخصی</option>
                  </select>
                </div>
              </div>

              {/* شناسه‌های پیام‌رسان‌ها */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <span className="font-bold text-slate-700 block">
                  شناسه‌های ارتباطی پیام‌رسان‌ها (جهت ارسال خودکار فایل‌ها و فاکتور به مباشر):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-1">شناسه / چت آیدی بله:</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="شناسه بله یا شماره"
                      value={formData.baleId}
                      onChange={e => setFormData(prev => ({ ...prev, baleId: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-1">شناسه روبیکا:</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="شناسه یا شماره"
                      value={formData.rubikaId}
                      onChange={e => setFormData(prev => ({ ...prev, rubikaId: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-1">شناسه تلگرام:</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="Chat ID تلگرام"
                      value={formData.telegramId}
                      onChange={e => setFormData(prev => ({ ...prev, telegramId: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs font-mono text-right"
                    />
                  </div>
                </div>
              </div>

              {/* توضیحات */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  توضیحات، سوابق و یادداشت‌های اداری:
                </label>
                <textarea
                  rows={3}
                  placeholder="سوابق، منطقه تخصصی فعالیت مباشر (مثلاً سعادت‌آباد، آپارتمان‌های تجاری)، شماره شبا و حساب بانکی و ..."
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 size={16} />
                  <span>{editingAgent ? 'ذخیره تغییرات' : 'ثبت و فعال‌سازی مباشر'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
