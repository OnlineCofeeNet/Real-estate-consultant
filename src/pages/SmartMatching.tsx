import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import axios from 'axios';
import { db } from '../db/db';
import { PropertyListing, PropertyRequest, AgentProfile } from '../types';
import { findMatchesForProperty, findMatchesForRequest, buildAgentPropertyMessage } from '../utils/smartMatching';
import { appendAgencySignature, toEnglishDigits } from '../utils/format';
import { 
  Building2, Sparkles, Send, Plus, Search, CheckCircle2,
  AlertCircle, Copy, Share2, MessageSquare, ArrowUpDown, Filter, ChevronDown, ChevronUp,
  UserCheck, ShieldAlert, Phone, User, Check, EyeOff, Bot
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SendPropertyToCustomerModal } from '../components/SendPropertyToCustomerModal';

export default function SmartMatching() {
  const [activeTab, setActiveTab] = useState<'listings' | 'requests' | 'matching'>('matching');
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  // Modals
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showAddRequestModal, setShowAddRequestModal] = useState(false);

  // AI Description Generator state
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiTone, setAiTone] = useState<'luxury' | 'friendly' | 'formal' | 'short'>('luxury');

  // Form State - Property Listing
  const [propForm, setPropForm] = useState<Partial<PropertyListing>>({
    title: '',
    dealType: 'sale',
    propertyType: 'apartment',
    area: 100,
    rooms: 2,
    floor: 3,
    neighborhood: '',
    price: 0,
    deposit: 0,
    monthlyRent: 0,
    features: ['آسانسور', 'پارکینگ', 'انباری'],
    ownerName: '',
    ownerPhone: '',
    residentName: '',
    residentPhone: ''
  });

  // Modal State for Dispatching Property to Agents / Customers
  const [agentDispatchModal, setAgentDispatchModal] = useState<{
    isOpen: boolean;
    property: PropertyListing | null;
    selectedAgentId: string;
    customMessage: string;
    includePrivateContacts: boolean;
  }>({
    isOpen: false,
    property: null,
    selectedAgentId: '',
    customMessage: '',
    includePrivateContacts: true
  });

  const [customerDispatchModal, setCustomerDispatchModal] = useState<{
    isOpen: boolean;
    property: PropertyListing | null;
    request: PropertyRequest | null;
    customMessage: string;
  }>({
    isOpen: false,
    property: null,
    request: null,
    customMessage: ''
  });

  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [botModalProperty, setBotModalProperty] = useState<any | null>(null);

  // Form State - Request
  const [reqForm, setReqForm] = useState<Partial<PropertyRequest>>({
    customerName: '',
    customerPhone: '',
    dealType: 'sale',
    propertyType: 'apartment',
    minArea: 80,
    maxArea: 120,
    minRooms: 2,
    preferredNeighborhoods: [],
    maxPrice: 0,
    maxDeposit: 0,
    maxMonthlyRent: 0
  });
  const [neighborhoodInput, setNeighborhoodInput] = useState('');

  // Live queries from Dexie
  const properties = useLiveQuery(() => db.properties.toArray()) || [];
  const propertyRequests = useLiveQuery(() => db.propertyRequests.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get(1));

  // Current Selected Matching
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const selectedRequest = propertyRequests.find(r => r.id === selectedRequestId);

  const matchesForSelectedProperty = selectedProperty 
    ? findMatchesForProperty(selectedProperty, propertyRequests) 
    : [];

  const matchesForSelectedRequest = selectedRequest 
    ? findMatchesForRequest(selectedRequest, properties) 
    : [];

  // Generate AI Description
  const handleGenerateAiDescription = async () => {
    if (!propForm.neighborhood || !propForm.area) {
      toast.error('لطفاً محله و متراژ ملک را وارد کنید');
      return;
    }

    setGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/generate-property-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: propForm.title,
          dealType: propForm.dealType,
          propertyType: propForm.propertyType,
          area: Number(propForm.area),
          rooms: Number(propForm.rooms || 0),
          floor: Number(propForm.floor || 0),
          neighborhood: propForm.neighborhood,
          price: Number(propForm.price || 0),
          deposit: Number(propForm.deposit || 0),
          monthlyRent: Number(propForm.monthlyRent || 0),
          features: propForm.features || [],
          tone: aiTone
        })
      });

      const data = await res.json();
      if (data.success && data.description) {
        setPropForm(prev => ({ ...prev, generatedDescription: data.description }));
        toast.success(data.source === 'gemini' ? 'توضیحات با هوش مصنوعی تولید شد ✨' : 'توضیحات پیش‌فرض با موفقیت اعمال شد');
      } else {
        toast.error(data.error || 'خطا در تولید توضیحات');
      }
    } catch (e: any) {
      toast.error('خطا در ارتباط با سرور هوش مصنوعی');
    } finally {
      setGeneratingAi(false);
    }
  };

  // Save Property
  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propForm.title || !propForm.neighborhood || !propForm.area) {
      toast.error('لطفاً فیلدهای الزامی ملک را تکمیل کنید');
      return;
    }

    try {
      await db.properties.add({
        title: propForm.title,
        dealType: propForm.dealType || 'sale',
        propertyType: propForm.propertyType || 'apartment',
        area: Number(propForm.area),
        rooms: Number(propForm.rooms || 0),
        floor: Number(propForm.floor || 0),
        neighborhood: propForm.neighborhood,
        price: Number(propForm.price || 0),
        deposit: Number(propForm.deposit || 0),
        monthlyRent: Number(propForm.monthlyRent || 0),
        features: propForm.features || [],
        ownerName: propForm.ownerName || '',
        ownerPhone: propForm.ownerPhone || '',
        residentName: propForm.residentName || '',
        residentPhone: propForm.residentPhone || '',
        generatedDescription: propForm.generatedDescription || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        agencyId: 'default_agency'
      });

      toast.success('ملک جدید با موفقیت ثبت گردید');
      setShowAddPropertyModal(false);
      setPropForm({
        title: '',
        dealType: 'sale',
        propertyType: 'apartment',
        area: 100,
        rooms: 2,
        features: ['آسانسور', 'پارکینگ', 'انباری'],
        ownerName: '',
        ownerPhone: '',
        residentName: '',
        residentPhone: ''
      });
    } catch (err: any) {
      toast.error('خطا در ذخیره ملک: ' + err.message);
    }
  };

  // Helper: Open Send to Customer Modal
  const openSendToCustomerModal = (property: PropertyListing, request: PropertyRequest, suggestedMsg?: string) => {
    // Note: NEVER include ownerPhone or residentPhone in the message to the customer
    const initialText = suggestedMsg || `سلام ${request.customerName} گرامی 🌹\n` +
      `ملک جدیدی در ${property.neighborhood} متناسب با درخواست شما ثبت گردید:\n` +
      `🏢 ${property.title}\n` +
      `📐 متراژ: ${property.area} متر ${property.rooms ? `| ${property.rooms} خواب` : ''}\n` +
      (property.price ? `💰 قیمت: ${Number(property.price).toLocaleString('fa-IR')} تومان\n` : '') +
      (property.deposit || property.monthlyRent ? `💰 ودیعه: ${Number(property.deposit || 0).toLocaleString('fa-IR')} | اجاره: ${Number(property.monthlyRent || 0).toLocaleString('fa-IR')} تومان\n` : '') +
      (property.features && property.features.length > 0 ? `🔹 امکانات: ${property.features.join(' | ')}\n` : '') +
      `جهت هماهنگی زمان بازدید با دفتر املاک تماس حاصل فرمایید.`;

    setCustomerDispatchModal({
      isOpen: true,
      property,
      request,
      customMessage: initialText
    });
  };

  // Helper: Open Send to Agent Modal
  const openSendToAgentModal = (property: PropertyListing) => {
    const agentsList = settings?.agents || [];
    const firstAgent = agentsList[0];
    const initialAgentId = firstAgent?.id || '';
    const initialMsg = firstAgent 
      ? buildAgentPropertyMessage(property, firstAgent.fullName, true)
      : buildAgentPropertyMessage(property, 'همکار گرامی', true);

    setAgentDispatchModal({
      isOpen: true,
      property,
      selectedAgentId: initialAgentId,
      customMessage: initialMsg,
      includePrivateContacts: true
    });
  };

  // Dispatch message to customer via Bot
  const handleDispatchToCustomer = async () => {
    const { property, request, customMessage } = customerDispatchModal;
    if (!property || !request || !customMessage.trim()) {
      toast.error('متن پیام یا اطلاعات متقاضی مشخص نیست');
      return;
    }

    setIsSendingMessage(true);
    const toastId = toast.loading('در حال ارسال مشخصات ملک به پیام‌رسان متقاضی...');
    try {
      const cleanCustomerPhone = toEnglishDigits(request.customerPhone).trim();
      const finalMessageText = appendAgencySignature(customMessage, settings);

      const activePlatforms = [];
      if (settings?.telegramToken && cleanCustomerPhone) {
        activePlatforms.push({ name: 'telegram', token: settings.telegramToken, id: cleanCustomerPhone });
      }
      if (settings?.baleToken && cleanCustomerPhone) {
        activePlatforms.push({ name: 'bale', token: settings.baleToken, id: cleanCustomerPhone });
      }
      if (settings?.rubikaToken && cleanCustomerPhone) {
        activePlatforms.push({ name: 'rubika', token: settings.rubikaToken, id: cleanCustomerPhone });
      }

      if (activePlatforms.length === 0) {
        toast.error('هیچ توکن فعالی در پیام‌رسان‌های بله، روبیکا یا تلگرام در بخش تنظیمات ثبت نشده است.', { id: toastId, duration: 6000 });
        setIsSendingMessage(false);
        return;
      }

      let successCount = 0;
      for (const p of activePlatforms) {
        try {
          const res = await axios.post('/api/send-message', {
            platform: p.name,
            token: p.token,
            chatId: p.id,
            message: finalMessageText
          });
          if (res.data?.success) {
            successCount++;
          }
        } catch (postErr) {
          console.error('Send message error:', postErr);
        }
      }

      if (successCount > 0) {
        toast.success(`فایل ملک با موفقیت از طریق ربات برای متقاضی (${request.customerName}) ارسال گردید!`, { id: toastId });
        setCustomerDispatchModal(prev => ({ ...prev, isOpen: false }));
      } else {
        toast.error('ارسال ناموفق بود. توجه: طبق قوانین پیام‌رسان‌ها، کاربر باید حداقل یک‌بار در ربات /start زده باشد.', { id: toastId, duration: 7000 });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.details || 'خطا در ارتباط با وب‌سرور ارسال پیام', { id: toastId });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Dispatch message to real estate agent/representative via Bot
  const handleDispatchToAgent = async () => {
    const { property, selectedAgentId, customMessage } = agentDispatchModal;
    if (!property || !selectedAgentId || !customMessage.trim()) {
      toast.error('لطفاً مباشر و متن پیام را انتخاب کنید');
      return;
    }

    const agent = (settings?.agents || []).find(a => a.id === selectedAgentId);
    if (!agent) {
      toast.error('مباشر انتخابی یافت نشد');
      return;
    }

    setIsSendingMessage(true);
    const toastId = toast.loading(`در حال ارسال فایل ملکی برای مباشر (${agent.fullName})...`);
    try {
      const finalMessageText = appendAgencySignature(customMessage, settings);
      const activePlatforms = [];

      const cleanPhone = toEnglishDigits(agent.phone || '').trim();
      const cleanBale = toEnglishDigits(agent.baleId || '').trim();
      const cleanTg = toEnglishDigits(agent.telegramId || '').trim();
      const cleanRubika = toEnglishDigits(agent.rubikaId || '').trim();

      if (settings?.baleToken && (cleanBale || cleanPhone)) {
        activePlatforms.push({ name: 'bale', token: settings.baleToken, id: cleanBale || cleanPhone });
      }
      if (settings?.telegramToken && (cleanTg || cleanPhone)) {
        activePlatforms.push({ name: 'telegram', token: settings.telegramToken, id: cleanTg || cleanPhone });
      }
      if (settings?.rubikaToken && (cleanRubika || cleanPhone)) {
        activePlatforms.push({ name: 'rubika', token: settings.rubikaToken, id: cleanRubika || cleanPhone });
      }

      if (activePlatforms.length === 0) {
        toast.error('توکن‌های پیام‌رسان در تنظیمات تعریف نشده یا شناسه کاربری مباشر خالی است.', { id: toastId, duration: 6000 });
        setIsSendingMessage(false);
        return;
      }

      let successCount = 0;
      for (const p of activePlatforms) {
        try {
          const res = await axios.post('/api/send-message', {
            platform: p.name,
            token: p.token,
            chatId: p.id,
            message: finalMessageText
          });
          if (res.data?.success) {
            successCount++;
          }
        } catch (e) {
          console.error('Agent message error:', e);
        }
      }

      if (successCount > 0) {
        toast.success(`فایل ملک با موفقیت برای مباشر (${agent.fullName}) ارسال گردید!`, { id: toastId });
        setAgentDispatchModal(prev => ({ ...prev, isOpen: false }));
      } else {
        toast.error('ارسال پیام به مباشر با خطا مواجه شد. لطفاً بررسی کنید که مباشر در ربات عضو و استارت زده باشد.', { id: toastId, duration: 7000 });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.details || 'خطا در ارسال پیام به مباشر', { id: toastId });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Save Request
  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqForm.customerName || !reqForm.customerPhone) {
      toast.error('نام مشتری و شماره تماس الزامی است');
      return;
    }

    try {
      await db.propertyRequests.add({
        customerName: reqForm.customerName,
        customerPhone: reqForm.customerPhone,
        dealType: reqForm.dealType || 'sale',
        propertyType: reqForm.propertyType || 'apartment',
        minArea: Number(reqForm.minArea || 0),
        maxArea: Number(reqForm.maxArea || 0),
        minRooms: Number(reqForm.minRooms || 0),
        preferredNeighborhoods: reqForm.preferredNeighborhoods || [],
        maxPrice: Number(reqForm.maxPrice || 0),
        maxDeposit: Number(reqForm.maxDeposit || 0),
        maxMonthlyRent: Number(reqForm.maxMonthlyRent || 0),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        agencyId: 'default_agency'
      });

      toast.success('درخواست مشتری با موفقیت ذخیره شد');
      setShowAddRequestModal(false);
      setReqForm({
        customerName: '',
        customerPhone: '',
        dealType: 'sale',
        propertyType: 'apartment',
        preferredNeighborhoods: []
      });
    } catch (err: any) {
      toast.error('خطا در ذخیره درخواست: ' + err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('متن در کلیپ‌بورد کپی شد');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-600">
              <Sparkles size={24} />
            </span>
            <h1 className="text-xl font-bold text-slate-800">تطبیق هوشمند املاک و متقاضیان (Smart Matching)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            الگوریتم خودکار مقایسه فایل‌های ملکی با تقاضای مشتریان و تولید توضیحات تبلیغاتی با هوش مصنوعی
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddPropertyModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <Plus size={16} />
            ثبت ملک جدید
          </button>
          <button
            onClick={() => setShowAddRequestModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <Plus size={16} />
            ثبت تقاضای مشتری
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('matching')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'matching' 
              ? 'bg-purple-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles size={16} />
          اتاق تطبیق هوشمند ({properties.length} فایل / {propertyRequests.length} تقاضا)
        </button>
        <button
          onClick={() => setActiveTab('listings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'listings' 
              ? 'bg-emerald-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 size={16} />
          فهرست املاک ثبت‌شده ({properties.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'requests' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Filter size={16} />
          تقاضاهای ثبت‌شده ({propertyRequests.length})
        </button>
      </div>

      {/* TAB 1: SMART MATCHING VIEW */}
      {activeTab === 'matching' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Properties Selector Panel */}
          <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Building2 size={18} className="text-emerald-600" />
              یک ملک را برای تطبیق انتخاب کنید:
            </h3>

            {properties.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                هنوز ملکی ثبت نشده است. ابتدا روی «ثبت ملک جدید» کلیک کنید.
              </div>
            ) : (
              <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                {properties.map(p => {
                  const isSelected = selectedPropertyId === p.id;
                  const matchesCount = findMatchesForProperty(p, propertyRequests).length;

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPropertyId(p.id || null);
                        setSelectedRequestId(null);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-50/50 shadow-xs' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-bold text-xs text-slate-800 truncate max-w-[190px]">{p.title}</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          p.dealType === 'rent' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {p.dealType === 'rent' ? 'اجاره' : 'فروش'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                        <span>📍 {p.neighborhood} - {p.area} متر</span>
                        {matchesCount > 0 && (
                          <span className="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-md text-[10px]">
                            {matchesCount} مشتری مناسب
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Matches Output Panel */}
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            {selectedProperty ? (
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] text-purple-600 font-bold">نتایج تطبیق هوشمند برای:</span>
                    <h2 className="text-base font-bold text-slate-800">{selectedProperty.title}</h2>
                  </div>
                  <div className="text-xs text-slate-500">
                    {matchesForSelectedProperty.length} متقاضی واجد شرایط
                  </div>
                </div>

                {matchesForSelectedProperty.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    هیچ درخواست ثبت‌شده‌ای با مشخصات این ملک (نوع معامله، متراژ، بودجه) تطابق کافی (حداقل ۵۰٪) نداشت.
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    {matchesForSelectedProperty.map((match, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-sm transition-all space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-800">{match.request.customerName}</span>
                              <span className="text-xs text-slate-500 font-mono" dir="ltr">{match.request.customerPhone}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {match.matchReasons.map((r, ri) => (
                                <span key={ri} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <CheckCircle2 size={12} />
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="text-xs text-slate-400">امتیاز تطابق:</span>
                            <span className="text-lg font-black text-purple-600">{match.matchScore}%</span>
                          </div>
                        </div>

                        {/* Suggested Message for instant dispatch */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700 relative group space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                            <span className="flex items-center gap-1 text-slate-600">
                              <MessageSquare size={13} className="text-purple-600" />
                              پیش‌نویس پیام معرفی به مشتری (با حفظ حریم خصوصی):
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyToClipboard(match.suggestedMessage)}
                                className="text-slate-500 hover:text-slate-700 flex items-center gap-1"
                              >
                                <Copy size={12} />
                                کپی متن
                              </button>
                              <button
                                onClick={() => selectedProperty && openSendToCustomerModal(selectedProperty, match.request, match.suggestedMessage)}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all"
                              >
                                <Send size={12} />
                                ارسال مشخصات به مشتری
                              </button>
                            </div>
                          </div>
                          <p className="whitespace-pre-line leading-relaxed text-[11px] text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                            {match.suggestedMessage}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                            <CheckCircle2 size={12} />
                            <span>تضمین حریم خصوصی: شماره تماس مالک و ساکن در پیام ارسالی به متقاضی گنجانده نمی‌شود.</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400 text-xs">
                جهت مشاهده لیست متقاضیان منطبق و امتیازهای تطابق، یک ملک را از لیست سمت راست انتخاب نمایید.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PROPERTIES LIST VIEW */}
      {activeTab === 'listings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    p.dealType === 'rent' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {p.dealType === 'rent' ? 'رهن و اجاره' : 'فروش'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(p.createdAt).toLocaleDateString('fa-IR')}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-800 mt-2">{p.title}</h4>
                <div className="text-xs text-slate-500 mt-1 space-y-1">
                  <div>📍 محله: <span className="font-medium text-slate-700">{p.neighborhood}</span></div>
                  <div>📐 متراژ: <span className="font-medium text-slate-700">{p.area} متر ({p.rooms} خواب)</span></div>
                  {p.price ? (
                    <div>💰 قیمت کل: <span className="font-bold text-emerald-600">{Number(p.price).toLocaleString('fa-IR')} تومان</span></div>
                  ) : null}
                  {(p.deposit || p.monthlyRent) ? (
                    <div>💰 ودیعه: {Number(p.deposit || 0).toLocaleString('fa-IR')} | اجاره: {Number(p.monthlyRent || 0).toLocaleString('fa-IR')}</div>
                  ) : null}
                </div>

                {/* Private Owner & Resident Info for Agent Display */}
                {(p.ownerPhone || p.residentPhone) && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1 text-[10px] text-amber-700">
                      <ShieldAlert size={12} />
                      <span>اطلاعات تماس محرمانه (ویژه مشاور املاک):</span>
                    </div>
                    {p.ownerPhone && (
                      <div className="flex items-center justify-between">
                        <span>مالک {p.ownerName ? `(${p.ownerName})` : ''}:</span>
                        <span className="font-mono text-slate-700" dir="ltr">{p.ownerPhone}</span>
                      </div>
                    )}
                    {p.residentPhone && (
                      <div className="flex items-center justify-between">
                        <span>ساکن {p.residentName ? `(${p.residentName})` : ''}:</span>
                        <span className="font-mono text-slate-700" dir="ltr">{p.residentPhone}</span>
                      </div>
                    )}
                  </div>
                )}

                {p.generatedDescription && (
                  <div className="mt-3 p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px] text-slate-700">
                    <span className="text-[9px] font-bold text-purple-600 block mb-1">متن آگهی تولید شده با هوش مصنوعی:</span>
                    <p className="line-clamp-3 whitespace-pre-line">{p.generatedDescription}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => {
                    setSelectedPropertyId(p.id || null);
                    setActiveTab('matching');
                  }}
                  className="text-purple-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Sparkles size={14} />
                  متقاضیان منطبق
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBotModalProperty(p)}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all"
                    title="ارسال مشخصات این ملک به مشتریان از طریق ربات‌های پیام‌رسان یا پیامک"
                  >
                    <Bot size={13} />
                    ارسال با بات
                  </button>

                  <button
                    onClick={() => openSendToAgentModal(p)}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all"
                    title="ارسال این فایل ملکی به مباشران و همکاران"
                  >
                    <UserCheck size={13} />
                    ارسال به مباشر
                  </button>

                  {p.generatedDescription && (
                    <button
                      onClick={() => copyToClipboard(p.generatedDescription || '')}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                      title="کپی متن آگهی"
                    >
                      <Copy size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: REQUESTS LIST VIEW */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {propertyRequests.map(r => (
            <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800">{r.customerName}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  r.dealType === 'rent' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {r.dealType === 'rent' ? 'متقاضی اجاره' : 'متقاضی خرید'}
                </span>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <div>📞 تلفن: <span className="font-mono text-slate-700" dir="ltr">{r.customerPhone}</span></div>
                <div>📐 متراژ مدنظر: <span className="text-slate-700">{r.minArea || 0} الی {r.maxArea || 'نامحدود'} متر</span></div>
                <div>📍 محله‌های دلخواه: <span className="text-slate-700">{r.preferredNeighborhoods.join('، ') || 'همه محله‌ها'}</span></div>
                {r.maxPrice ? (
                  <div>💰 سقف بودجه خرید: <span className="font-bold text-emerald-600">{Number(r.maxPrice).toLocaleString('fa-IR')} تومان</span></div>
                ) : null}
              </div>
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedRequestId(r.id || null);
                    setActiveTab('matching');
                  }}
                  className="text-blue-600 font-bold hover:underline flex items-center gap-1 text-xs"
                >
                  <Search size={14} />
                  یافتن املاک موجود برای این مشتری
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD PROPERTY WITH AI AD WRITER */}
      {showAddPropertyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Building2 size={20} className="text-emerald-600" />
                ثبت فایل ملکی جدید و تولید خودکار آگهی
              </h3>
              <button onClick={() => setShowAddPropertyModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveProperty} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">عنوان فایل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: آپارتمان ۱۲۰ متری تک‌واحدی نیاوران"
                    value={propForm.title || ''}
                    onChange={e => setPropForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">محله / منطقه *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: نیاوران، فرمانیه"
                    value={propForm.neighborhood || ''}
                    onChange={e => setPropForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">نوع معامله</label>
                  <select
                    value={propForm.dealType || 'sale'}
                    onChange={e => setPropForm(prev => ({ ...prev, dealType: e.target.value as any }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  >
                    <option value="sale">فروش</option>
                    <option value="rent">رهن و اجاره</option>
                    <option value="presale">پیش‌فروش</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">متراژ (مترمربع) *</label>
                  <input
                    type="number"
                    required
                    value={propForm.area || ''}
                    onChange={e => setPropForm(prev => ({ ...prev, area: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">تعداد خواب</label>
                  <input
                    type="number"
                    value={propForm.rooms || ''}
                    onChange={e => setPropForm(prev => ({ ...prev, rooms: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">طبقه</label>
                  <input
                    type="number"
                    value={propForm.floor || ''}
                    onChange={e => setPropForm(prev => ({ ...prev, floor: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {propForm.dealType === 'sale' ? (
                <div>
                  <label className="block text-slate-600 font-bold mb-1">قیمت کل (تومان)</label>
                  <input
                    type="number"
                    placeholder="مثال: 5500000000"
                    value={propForm.price || ''}
                    onChange={e => setPropForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">مبلغ ودیعه (تومان)</label>
                    <input
                      type="number"
                      placeholder="مثال: 500000000"
                      value={propForm.deposit || ''}
                      onChange={e => setPropForm(prev => ({ ...prev, deposit: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">اجاره ماهانه (تومان)</label>
                    <input
                      type="number"
                      placeholder="مثال: 15000000"
                      value={propForm.monthlyRent || ''}
                      onChange={e => setPropForm(prev => ({ ...prev, monthlyRent: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Owner & Resident Contacts (Agent Only - Hidden from Customers) */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                  <span>اطلاعات مالک و ساکن (محرمانه - فقط ویژه مشاور و بدون ارسال به مشتری)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">نام یا مشخصات مالک</label>
                    <input
                      type="text"
                      placeholder="مثال: آقای محمدی"
                      value={propForm.ownerName || ''}
                      onChange={e => setPropForm(prev => ({ ...prev, ownerName: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">تلفن تماس مالک</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="0912..."
                      value={propForm.ownerPhone || ''}
                      onChange={e => setPropForm(prev => ({ ...prev, ownerPhone: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">نام یا مشخصات ساکن فعلی</label>
                    <input
                      type="text"
                      placeholder="مثال: مستأجر فعلی / تخلیه"
                      value={propForm.residentName || ''}
                      onChange={e => setPropForm(prev => ({ ...prev, residentName: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">تلفن تماس ساکن فعلی</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="0912..."
                      value={propForm.residentPhone || ''}
                      onChange={e => setPropForm(prev => ({ ...prev, residentPhone: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-right"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-amber-700/90 leading-relaxed flex items-center gap-1">
                  <EyeOff size={13} className="shrink-0 text-amber-600" />
                  این شماره‌ها هنگام ارسال پیام خودکار یا معرفی به مشتریان متقاضی کاملاً حذف می‌شوند و صرفاً جهت هماهنگی بازدید توسط مباشر یا مشاور نگهداری می‌گردند.
                </p>
              </div>

              {/* AI Ad Generator Section */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-600" />
                    <span className="font-bold text-slate-800">تولید خودکار متن آگهی و کپشن هوشمند</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={aiTone}
                      onChange={e => setAiTone(e.target.value as any)}
                      className="p-1.5 rounded-lg border border-purple-200 text-[11px] bg-white text-slate-700"
                    >
                      <option value="luxury">لحن لوکس و جذاب</option>
                      <option value="friendly">لحن صمیمی</option>
                      <option value="formal">لحن رسمی و اداری</option>
                      <option value="short">خلاصه پیامکی</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleGenerateAiDescription}
                      disabled={generatingAi}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {generatingAi ? 'در حال تولید...' : 'تولید متن با هوش مصنوعی'}
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  placeholder="متن آگهی هوشمند در این بخش قرار می‌گیرد..."
                  value={propForm.generatedDescription || ''}
                  onChange={e => setPropForm(prev => ({ ...prev, generatedDescription: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-purple-200 bg-white focus:outline-purple-500 text-slate-700 text-xs leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPropertyModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  ذخیره فایل ملک
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD REQUEST */}
      {showAddRequestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Filter size={20} className="text-purple-600" />
                ثبت درخواست خرید یا اجاره مشتری
              </h3>
              <button onClick={() => setShowAddRequestModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveRequest} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">نام مشتری *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: آقای حسینی"
                    value={reqForm.customerName || ''}
                    onChange={e => setReqForm(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">تلفن همراه *</label>
                  <input
                    type="text"
                    required
                    placeholder="0912..."
                    value={reqForm.customerPhone || ''}
                    onChange={e => setReqForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">نوع معامله</label>
                  <select
                    value={reqForm.dealType || 'sale'}
                    onChange={e => setReqForm(prev => ({ ...prev, dealType: e.target.value as any }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  >
                    <option value="sale">خرید</option>
                    <option value="rent">اجاره</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">حداقل متراژ</label>
                  <input
                    type="number"
                    placeholder="80"
                    value={reqForm.minArea || ''}
                    onChange={e => setReqForm(prev => ({ ...prev, minArea: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">حداکثر متراژ</label>
                  <input
                    type="number"
                    placeholder="150"
                    value={reqForm.maxArea || ''}
                    onChange={e => setReqForm(prev => ({ ...prev, maxArea: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">محله‌های مد نظر (با کاما جدا کنید)</label>
                <input
                  type="text"
                  placeholder="مثال: سعادت آباد، شهرک غرب، پونک"
                  value={neighborhoodInput}
                  onChange={e => {
                    setNeighborhoodInput(e.target.value);
                    setReqForm(prev => ({
                      ...prev,
                      preferredNeighborhoods: e.target.value.split('،').map(s => s.trim()).filter(Boolean)
                    }));
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              {reqForm.dealType === 'sale' ? (
                <div>
                  <label className="block text-slate-600 font-bold mb-1">حداکثر بودجه خرید (تومان)</label>
                  <input
                    type="number"
                    placeholder="مثال: 6000000000"
                    value={reqForm.maxPrice || ''}
                    onChange={e => setReqForm(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">حداکثر ودیعه (تومان)</label>
                    <input
                      type="number"
                      placeholder="500000000"
                      value={reqForm.maxDeposit || ''}
                      onChange={e => setReqForm(prev => ({ ...prev, maxDeposit: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">حداکثر اجاره ماهانه</label>
                    <input
                      type="number"
                      placeholder="20000000"
                      value={reqForm.maxMonthlyRent || ''}
                      onChange={e => setReqForm(prev => ({ ...prev, maxMonthlyRent: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRequestModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs"
                >
                  ذخیره تقاضای مشتری
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SEND PROPERTY TO CUSTOMER */}
      {customerDispatchModal.isOpen && customerDispatchModal.property && customerDispatchModal.request && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-600">
                  <Send size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">ارسال مشخصات ملک به متقاضی</h3>
                  <p className="text-[11px] text-slate-400">متقاضی: {customerDispatchModal.request.customerName} ({customerDispatchModal.request.customerPhone})</p>
                </div>
              </div>
              <button
                onClick={() => setCustomerDispatchModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Privacy Protection Notice */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800">
              <ShieldAlert size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">محافظت خودکار از حریم خصوصی فایل</span>
                شماره تلفن مالک و ساکن در پیام ارسالی به مشتری نمایش داده نمی‌شود و اطلاعات تماس آژانس املاک در انتهای پیام پیوست خواهد شد.
              </div>
            </div>

            {/* Message preview / edit */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 font-bold text-xs">
                متن نهایی پیام ارسالی (قابل ویرایش):
              </label>
              <textarea
                rows={7}
                value={customerDispatchModal.customMessage}
                onChange={e => setCustomerDispatchModal(prev => ({ ...prev, customMessage: e.target.value }))}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 font-normal leading-relaxed focus:outline-purple-500"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-400 text-[11px]">
                ارسال از طریق ربات‌های بله، ایتا یا تلگرام
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerDispatchModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl"
                  disabled={isSendingMessage}
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleDispatchToCustomer}
                  disabled={isSendingMessage}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Send size={14} />
                  {isSendingMessage ? 'در حال ارسال...' : 'ارسال به متقاضی'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SEND PROPERTY TO AGENT / REPRESENTATIVE */}
      {agentDispatchModal.isOpen && agentDispatchModal.property && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-600">
                  <UserCheck size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">ارسال فایل ملکی به مباشر / همکار</h3>
                  <p className="text-[11px] text-slate-400">انتخاب مباشر از لیست مباشران ثبت‌شده در تنظیمات</p>
                </div>
              </div>
              <button
                onClick={() => setAgentDispatchModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Select Agent */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 font-bold text-xs">
                انتخاب مباشر / همکار مقصد:
              </label>
              {(!settings?.agents || settings.agents.length === 0) ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  هنوز هیچ مباشری در بخش «تنظیمات آژانس &gt; مدیریت مباشران و همکاران» تعریف نشده است. لطفاً ابتدا در منوی تنظیمات مشخصات مباشر را ثبت فرمایید.
                </div>
              ) : (
                <select
                  value={agentDispatchModal.selectedAgentId}
                  onChange={e => {
                    const agentId = e.target.value;
                    const agent = settings.agents?.find(a => a.id === agentId);
                    const newMsg = agentDispatchModal.property
                      ? buildAgentPropertyMessage(
                          agentDispatchModal.property, 
                          agent?.fullName || 'همکار گرامی', 
                          agentDispatchModal.includePrivateContacts
                        )
                      : '';
                    setAgentDispatchModal(prev => ({
                      ...prev,
                      selectedAgentId: agentId,
                      customMessage: newMsg
                    }));
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-amber-500 font-medium"
                >
                  <option value="">-- انتخاب مباشر --</option>
                  {settings.agents.map((ag: AgentProfile) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.fullName} {ag.licenseCode ? `(کد صنفی: ${ag.licenseCode})` : ''} - {ag.phone}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Toggle Private Contact Inclusion for Agent */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 block">شامل اطلاعات تماس مالک و ساکن برای مباشر</span>
                <span className="text-[11px] text-slate-500">شماره تلفن مالک و ساکن برای هماهنگی بازدید به مباشر ارسال شود</span>
              </div>
              <input
                type="checkbox"
                checked={agentDispatchModal.includePrivateContacts}
                onChange={e => {
                  const include = e.target.checked;
                  const agent = settings?.agents?.find(a => a.id === agentDispatchModal.selectedAgentId);
                  const newMsg = agentDispatchModal.property
                    ? buildAgentPropertyMessage(
                        agentDispatchModal.property,
                        agent?.fullName || 'همکار گرامی',
                        include
                      )
                    : '';
                  setAgentDispatchModal(prev => ({
                    ...prev,
                    includePrivateContacts: include,
                    customMessage: newMsg
                  }));
                }}
                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
              />
            </div>

            {/* Message preview / edit */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 font-bold text-xs">
                پیش‌نمایش متن پیام ارسالی به مباشر:
              </label>
              <textarea
                rows={7}
                value={agentDispatchModal.customMessage}
                onChange={e => setAgentDispatchModal(prev => ({ ...prev, customMessage: e.target.value }))}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 font-normal leading-relaxed focus:outline-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setAgentDispatchModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl"
                disabled={isSendingMessage}
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleDispatchToAgent}
                disabled={isSendingMessage || !agentDispatchModal.selectedAgentId}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Send size={14} />
                {isSendingMessage ? 'در حال ارسال...' : 'ارسال به مباشر'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to send property to customer via Bot */}
      {botModalProperty && (
        <SendPropertyToCustomerModal
          isOpen={Boolean(botModalProperty)}
          onClose={() => setBotModalProperty(null)}
          property={botModalProperty}
        />
      )}
    </div>
  );
}
