import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Printer, 
  Calendar, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileSpreadsheet, 
  UserCheck, 
  ChevronDown, 
  RefreshCw,
  Landmark,
  CheckCircle2,
  SlidersHorizontal,
  X
} from 'lucide-react';
import type { ChartOfAccount, JournalEntry, JournalItem, Settings } from '../types';
import { toPersianDigits, toEnglishDigits, formatCurrency } from '../utils/format';

interface GeneralLedgerViewProps {
  accounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
  settings?: Settings | null;
  initialPerson?: string;
  initialAccountCode?: string;
}

export default function GeneralLedgerView({
  accounts,
  journalEntries,
  settings,
  initialPerson = '',
  initialAccountCode = ''
}: GeneralLedgerViewProps) {
  // Current Persian year calculation for default date range
  const currentPersianYear = useMemo(() => {
    try {
      const nowFa = new Date().toLocaleDateString('fa-IR-u-nu-latn');
      const year = nowFa.split('/')[0];
      return year || '1403';
    } catch {
      return '1403';
    }
  }, []);

  // Today's Persian date
  const todayPersianDate = useMemo(() => {
    try {
      const nowFa = new Date().toLocaleDateString('fa-IR-u-nu-latn');
      const parts = nowFa.split('/');
      return `${parts[0]}/${parts[1]?.padStart(2, '0')}/${parts[2]?.padStart(2, '0')}`;
    } catch {
      return '1404/12/29';
    }
  }, []);

  // Filters State
  const [ledgerLevel, setLedgerLevel] = useState<'all' | 'general' | 'subsidiary' | 'detail'>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountCode ? 'code_' + initialAccountCode : 'all');
  const [selectedPerson, setSelectedPerson] = useState<string>(initialPerson);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(`${currentPersianYear}/01/01`);
  const [endDate, setEndDate] = useState<string>(todayPersianDate);

  useEffect(() => {
    if (initialPerson) {
      setSelectedPerson(initialPerson);
      setLedgerLevel('detail');
    }
  }, [initialPerson]);

  useEffect(() => {
    if (initialAccountCode) {
      const found = accounts.find(a => a.code === initialAccountCode);
      if (found?.id) {
        setSelectedAccountId(String(found.id));
      }
    }
  }, [initialAccountCode, accounts]);

  // Normalize Persian date for accurate string comparison (YYYY/MM/DD)
  const normalizeDate = (d?: string): string => {
    if (!d) return '';
    const eng = toEnglishDigits(d).trim().replace(/-/g, '/');
    const parts = eng.split('/');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${y}/${m}/${day}`;
    }
    return eng;
  };

  const normStart = normalizeDate(startDate);
  const normEnd = normalizeDate(endDate);

  // Quick Date Presets
  const handleQuickPreset = (preset: 'all' | 'year' | 'month' | 'last3months') => {
    if (preset === 'all') {
      setStartDate('1400/01/01');
      setEndDate('1409/12/29');
    } else if (preset === 'year') {
      setStartDate(`${currentPersianYear}/01/01`);
      setEndDate(todayPersianDate);
    } else if (preset === 'month') {
      const parts = todayPersianDate.split('/');
      setStartDate(`${parts[0]}/${parts[1]}/01`);
      setEndDate(todayPersianDate);
    } else if (preset === 'last3months') {
      setStartDate(`${currentPersianYear}/01/01`);
      setEndDate(todayPersianDate);
    }
  };

  // Distinct Persons list extracted from all journal entry items
  const distinctPersons = useMemo(() => {
    const set = new Set<string>();
    journalEntries.forEach(entry => {
      entry.items?.forEach(item => {
        if (item.detailPersonName && item.detailPersonName.trim()) {
          set.add(item.detailPersonName.trim());
        }
      });
    });
    // Also include agents defined in settings
    settings?.agents?.forEach(a => {
      if (a.fullName && a.fullName.trim()) {
        set.add(a.fullName.trim());
      }
    });
    return Array.from(set).sort();
  }, [journalEntries, settings]);

  // Flattened journal items with parent entry details and account metadata
  const flattenedTransactions = useMemo(() => {
    const list: Array<{
      entryId: number;
      voucherNumber: number;
      date: string;
      normDate: string;
      voucherDesc: string;
      referenceType?: string;
      referenceId?: string;
      accountId: number;
      accountTitle: string;
      accountCode: string;
      accountLevel: 'general' | 'subsidiary' | 'group' | 'detail';
      accountNature: 'debtor' | 'creditor' | 'dual';
      itemDesc: string;
      debit: number;
      credit: number;
      detailPersonName?: string;
    }> = [];

    const accMap = new Map<number, ChartOfAccount>();
    accounts.forEach(a => {
      if (a.id) accMap.set(a.id, a);
    });

    journalEntries.forEach(entry => {
      const entryDate = entry.date || '';
      const normDate = normalizeDate(entryDate);

      entry.items?.forEach(item => {
        const acc = accMap.get(item.accountId);
        list.push({
          entryId: entry.id || 0,
          voucherNumber: entry.voucherNumber,
          date: entryDate,
          normDate,
          voucherDesc: entry.description || '',
          referenceType: entry.referenceType,
          referenceId: entry.referenceId,
          accountId: item.accountId,
          accountTitle: acc?.title || item.accountTitle || 'حساب نامشخص',
          accountCode: acc?.code || item.accountCode || '000',
          accountLevel: acc?.level || 'subsidiary',
          accountNature: acc?.nature || 'debtor',
          itemDesc: item.description || '',
          debit: Number(item.debit) || 0,
          credit: Number(item.credit) || 0,
          detailPersonName: item.detailPersonName
        });
      });
    });

    // Sort chronologically (oldest first for accurate running balance)
    list.sort((a, b) => {
      if (a.normDate !== b.normDate) return a.normDate.localeCompare(b.normDate);
      return a.voucherNumber - b.voucherNumber;
    });

    return list;
  }, [journalEntries, accounts]);

  // Filter transactions based on date range, selected account, selected person, level, and query
  const { filteredTransactions, openingDebits, openingCredits } = useMemo(() => {
    let beforeDebits = 0;
    let beforeCredits = 0;
    const result: typeof flattenedTransactions = [];

    flattenedTransactions.forEach(tx => {
      // Check account filter
      if (selectedAccountId !== 'all') {
        if (String(tx.accountId) !== selectedAccountId) {
          return;
        }
      }

      // Check level filter
      if (ledgerLevel === 'general') {
        if (tx.accountLevel !== 'general' && tx.accountCode.length > 3) {
          // If viewing General ledger and item is subsidiary, we can still include it mapped to parent general code
        }
      } else if (ledgerLevel === 'detail') {
        // Detail ledger focuses on items with a specific person or all persons
        if (selectedPerson && tx.detailPersonName !== selectedPerson) {
          return;
        }
      }

      // Check person filter
      if (selectedPerson) {
        if (tx.detailPersonName?.trim() !== selectedPerson.trim()) {
          return;
        }
      }

      // Check keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          tx.voucherNumber.toString().includes(q) ||
          tx.accountTitle.toLowerCase().includes(q) ||
          tx.accountCode.includes(q) ||
          tx.itemDesc.toLowerCase().includes(q) ||
          (tx.detailPersonName && tx.detailPersonName.toLowerCase().includes(q)) ||
          (tx.referenceId && tx.referenceId.toLowerCase().includes(q));
        if (!match) return;
      }

      // Date check
      if (normStart && tx.normDate < normStart) {
        // Occurred before period -> adds to opening balance
        beforeDebits += tx.debit;
        beforeCredits += tx.credit;
      } else if (!normEnd || tx.normDate <= normEnd) {
        // Falls within period
        result.push(tx);
      }
    });

    return {
      filteredTransactions: result,
      openingDebits: beforeDebits,
      openingCredits: beforeCredits
    };
  }, [flattenedTransactions, selectedAccountId, ledgerLevel, selectedPerson, searchQuery, normStart, normEnd]);

  // Compute period totals and running balance for detailed rows
  const { 
    periodTotalDebit, 
    periodTotalCredit, 
    openingBalance, 
    closingBalance, 
    rowsWithRunningBalance 
  } = useMemo(() => {
    let running = openingDebits - openingCredits;
    const openingBal = running;
    let periodDebit = 0;
    let periodCredit = 0;

    const rows = filteredTransactions.map(tx => {
      periodDebit += tx.debit;
      periodCredit += tx.credit;
      running += (tx.debit - tx.credit);

      return {
        ...tx,
        runningBalance: Math.abs(running),
        runningNature: running > 0 ? 'بد' : running < 0 ? 'بس' : 'تسویه'
      };
    });

    return {
      periodTotalDebit: periodDebit,
      periodTotalCredit: periodCredit,
      openingBalance: openingBal,
      closingBalance: running,
      rowsWithRunningBalance: rows
    };
  }, [filteredTransactions, openingDebits, openingCredits]);

  // Summary by Accounts (for General and Subsidiary Table)
  const accountsSummaryList = useMemo(() => {
    const map = new Map<number, {
      account: ChartOfAccount;
      debit: number;
      credit: number;
      balance: number;
      nature: string;
      txCount: number;
    }>();

    accounts.forEach(a => {
      if (a.id) {
        map.set(a.id, {
          account: a,
          debit: 0,
          credit: 0,
          balance: 0,
          nature: a.nature === 'debtor' ? 'بدهکار' : 'بستانکار',
          txCount: 0
        });
      }
    });

    flattenedTransactions.forEach(tx => {
      // Date filter check
      if (normStart && tx.normDate < normStart) return;
      if (normEnd && tx.normDate > normEnd) return;

      if (selectedPerson && tx.detailPersonName !== selectedPerson) return;

      const record = map.get(tx.accountId);
      if (record) {
        record.debit += tx.debit;
        record.credit += tx.credit;
        record.txCount += 1;
        record.balance = (record.account.nature === 'debtor')
          ? (record.debit - record.credit)
          : (record.credit - record.debit);
      }
    });

    return Array.from(map.values())
      .filter(item => {
        if (ledgerLevel === 'general') return item.account.level === 'general';
        if (ledgerLevel === 'subsidiary') return item.account.level === 'subsidiary';
        return item.account.level !== 'group'; // default show all active accounts
      })
      .filter(item => item.txCount > 0 || item.debit > 0 || item.credit > 0);
  }, [accounts, flattenedTransactions, normStart, normEnd, ledgerLevel, selectedPerson]);

  const handlePrint = () => {
    window.print();
  };

  const selectedAccountObject = useMemo(() => {
    if (selectedAccountId === 'all') return null;
    return accounts.find(a => String(a.id) === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="print-hide flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/80">
              <BookOpen size={24} />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900">دفتر کل، دفتر معین و کاردکس حساب‌های تفصیلی</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                مشاهده و چاپ گردش تراکنش‌ها، مانده‌گیری استاندارد دوطرفه و پیگیری حساب مشاوران و اشخاص با فیلتر تاریخ شمسی
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Printer size={16} />
            <span>چاپ رسمی صورت گردش حساب</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS TOOLBAR */}
      <div className="print-hide bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        {/* Row 1: Level Tabs & Quick Date Presets */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => { setLedgerLevel('all'); setSelectedPerson(''); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                ledgerLevel === 'all' && !selectedPerson ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              دفتر معین جامع (کل تراکنش‌ها)
            </button>
            <button
              onClick={() => { setLedgerLevel('general'); setSelectedPerson(''); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                ledgerLevel === 'general' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              دفتر کل (سطح ۲)
            </button>
            <button
              onClick={() => { setLedgerLevel('subsidiary'); setSelectedPerson(''); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                ledgerLevel === 'subsidiary' && !selectedPerson ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              دفتر معین (سطح ۳)
            </button>
            <button
              onClick={() => setLedgerLevel('detail')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                ledgerLevel === 'detail' || selectedPerson ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck size={14} />
              حساب تفصیلی اشخاص و مباشران
            </button>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 text-[11px] ml-1">بازه سریع:</span>
            <button
              onClick={() => handleQuickPreset('year')}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
            >
              سال جاری
            </button>
            <button
              onClick={() => handleQuickPreset('month')}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
            >
              ماه جاری
            </button>
            <button
              onClick={() => handleQuickPreset('all')}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
            >
              همه اسناد
            </button>
          </div>
        </div>

        {/* Row 2: Date Inputs, Account Dropdown, Person Selector, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* از تاریخ شمسی */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
              <Calendar size={13} className="text-indigo-600" />
              <span>از تاریخ شمسی:</span>
            </label>
            <input
              type="text"
              dir="ltr"
              placeholder="1403/01/01"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-center"
            />
          </div>

          {/* تا تاریخ شمسی */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
              <Calendar size={13} className="text-indigo-600" />
              <span>تا تاریخ شمسی:</span>
            </label>
            <input
              type="text"
              dir="ltr"
              placeholder="1404/12/29"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-center"
            />
          </div>

          {/* فیلتر حساب معین */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
              <Landmark size={13} className="text-indigo-600" />
              <span>انتخاب حساب (کل / معین):</span>
            </label>
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium truncate"
            >
              <option value="all">-- تمام حساب‌ها (دفتر جامع) --</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.title} ({acc.level === 'general' ? 'کل' : 'معین'})
                </option>
              ))}
            </select>
          </div>

          {/* فیلتر شخص تفصیلی / مباشر */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <UserCheck size={13} className="text-amber-600" />
                <span>شخص تفصیلی / مباشر:</span>
              </span>
              {selectedPerson && (
                <button
                  onClick={() => setSelectedPerson('')}
                  className="text-red-500 hover:text-red-700 text-[10px] font-bold"
                >
                  حذف فیلتر
                </button>
              )}
            </label>
            <select
              value={selectedPerson}
              onChange={e => {
                setSelectedPerson(e.target.value);
                if (e.target.value) setLedgerLevel('detail');
              }}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium truncate"
            >
              <option value="">-- تمام اشخاص و مباشران --</option>
              {distinctPersons.map(person => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Query Input */}
        <div className="relative">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="جستجو در شرح سند، شماره عطف، کد حساب یا شماره سند حسابداری..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
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
      </div>

      {/* KPI METRIC CARDS FOR CHOSEN FILTER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <BookOpen size={22} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">مانده ابتدای دوره (قبل از {toPersianDigits(startDate)})</span>
            <div className="text-base font-bold font-mono text-slate-800">
              {formatCurrency(Math.abs(openingBalance))}
            </div>
            <span className="text-[10px] text-slate-400 font-bold">
              {openingBalance > 0 ? 'بدهکار (طلب)' : openingBalance < 0 ? 'بستانکار (بدهی)' : 'تسویه'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ArrowUpRight size={22} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">مجموع گردش بدهکار طی دوره</span>
            <div className="text-base font-bold font-mono text-blue-700">
              {formatCurrency(periodTotalDebit)}
            </div>
            <span className="text-[10px] text-slate-400">وارده‌ها / هزینه‌ها / مطالبات</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ArrowDownLeft size={22} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">مجموع گردش بستانکار طی دوره</span>
            <div className="text-base font-bold font-mono text-amber-700">
              {formatCurrency(periodTotalCredit)}
            </div>
            <span className="text-[10px] text-slate-400">صادره‌ها / درآمدها / بدهی‌ها</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
            closingBalance > 0 ? 'bg-emerald-50 text-emerald-600' : closingBalance < 0 ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'
          }`}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">مانده نهایی پایان دوره</span>
            <div className={`text-base font-bold font-mono ${
              closingBalance > 0 ? 'text-emerald-700' : closingBalance < 0 ? 'text-purple-700' : 'text-slate-700'
            }`}>
              {formatCurrency(Math.abs(closingBalance))}
            </div>
            <span className="text-[10px] font-bold">
              {closingBalance > 0 ? 'وضعیت: مانده بدهکار' : closingBalance < 0 ? 'وضعیت: مانده بستانکار' : 'وضعیت: تراز و تسویه'}
            </span>
          </div>
        </div>
      </div>

      {/* DETAILED TRANSACTIONS TABLE (PRINTABLE CARDEX) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none" id="ledger-printable-area">
        {/* Printable Official Header (visible during print) */}
        <div className="hidden print:block p-6 border-b border-slate-300 space-y-4 text-center">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <div className="text-right">
              <h2 className="text-lg font-bold text-slate-900">{settings?.agencyName || 'دفتر املاک'}</h2>
              <p className="text-xs text-slate-500 mt-1">سامانه جامع حسابداری و صدور فاکتور املاک</p>
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900">صورت گردش حساب تفصیلی و دفتر معین</h1>
              <span className="text-xs text-slate-600 block mt-1">
                بازه گزارش: از تاریخ {toPersianDigits(startDate)} تا {toPersianDigits(endDate)}
              </span>
            </div>
            <div className="text-left text-xs text-slate-500 space-y-1 font-mono">
              <p>تاریخ چاپ: {toPersianDigits(todayPersianDate)}</p>
              <p>صفحه: ۱ از ۱</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs text-right bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500">حساب معین:</span>{' '}
              <strong>{selectedAccountObject ? `${selectedAccountObject.code} - ${selectedAccountObject.title}` : 'تمامی حساب‌های معین دفتر'}</strong>
            </div>
            <div>
              <span className="text-slate-500">شخص / طرف تفصیلی:</span>{' '}
              <strong>{selectedPerson || 'کلیه اشخاص و مشاوران'}</strong>
            </div>
            <div>
              <span className="text-slate-500">مانده پایان دوره:</span>{' '}
              <strong className="font-mono">{formatCurrency(Math.abs(closingBalance))} ({closingBalance > 0 ? 'بدهکار' : closingBalance < 0 ? 'بستانکار' : 'تسویه'})</strong>
            </div>
          </div>
        </div>

        {/* Card Header for Screen */}
        <div className="print-hide p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              ریز تراکنش‌ها و کاردکس خط به خط (کاردکس تفصیلی)
            </h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
              {toPersianDigits(rowsWithRunningBalance.length)} ردیف سند
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>مانده ابتدای دوره: <strong className="font-mono text-slate-800">{formatCurrency(Math.abs(openingBalance))}</strong></span>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-3 text-center w-12">ردیف</th>
                <th className="py-3 px-3 text-center w-24">تاریخ سند</th>
                <th className="py-3 px-3 text-center w-20">شماره سند</th>
                <th className="py-3 px-3 w-40">کد و عنوان حساب</th>
                <th className="py-3 px-3 w-36">شخص / مباشر تفصیلی</th>
                <th className="py-3 px-3">شرح آرتیکل سند حسابداری</th>
                <th className="py-3 px-3 text-center w-28 text-blue-700">بدهکار (تومان)</th>
                <th className="py-3 px-3 text-center w-28 text-amber-700">بستانکار (تومان)</th>
                <th className="py-3 px-3 text-center w-32">مانده تجمعی</th>
                <th className="py-3 px-2 text-center w-12">تشخیص</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {/* Row for Opening Balance */}
              {openingBalance !== 0 && (
                <tr className="bg-amber-50/40 text-slate-700 font-bold italic">
                  <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                  <td className="py-2.5 px-3 text-center font-mono">{toPersianDigits(startDate)}</td>
                  <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                  <td className="py-2.5 px-3" colSpan={3}>
                    مانده منقول از قبل (ابتدای دوره مالی)
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {openingBalance > 0 ? formatCurrency(openingBalance) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {openingBalance < 0 ? formatCurrency(Math.abs(openingBalance)) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {formatCurrency(Math.abs(openingBalance))}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {openingBalance > 0 ? 'بد' : 'بس'}
                  </td>
                </tr>
              )}

              {rowsWithRunningBalance.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <BookOpen size={32} className="mx-auto mb-2 text-slate-300" />
                    <p>هیچ تراکنشی مطابق با فیلترهای انتخابی در این بازه تاریخی یافت نشد.</p>
                  </td>
                </tr>
              ) : (
                rowsWithRunningBalance.map((row, idx) => (
                  <tr key={`${row.entryId}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {toPersianDigits(idx + 1)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {toPersianDigits(row.date)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                      {toPersianDigits(row.voucherNumber)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-[11px] truncate max-w-[150px]" title={row.accountTitle}>
                          {row.accountTitle}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{row.accountCode}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {row.detailPersonName ? (
                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200/70 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                          <UserCheck size={11} />
                          {row.detailPersonName}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 text-[11px] leading-relaxed max-w-xs">
                      {row.itemDesc}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                      {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-700">
                      {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                      {formatCurrency(row.runningBalance)}
                    </td>
                    <td className="py-2.5 px-2 text-center text-[10px] font-bold text-slate-600">
                      {row.runningNature}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer with Totals */}
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                <td colSpan={6} className="py-3 px-4 text-left">
                  جمع کل گردش دوره ({toPersianDigits(startDate)} الی {toPersianDigits(endDate)}):
                </td>
                <td className="py-3 px-3 text-center font-mono text-blue-800 text-sm">
                  {formatCurrency(periodTotalDebit)}
                </td>
                <td className="py-3 px-3 text-center font-mono text-amber-800 text-sm">
                  {formatCurrency(periodTotalCredit)}
                </td>
                <td className="py-3 px-3 text-center font-mono text-emerald-800 text-sm">
                  {formatCurrency(Math.abs(closingBalance))}
                </td>
                <td className="py-3 px-2 text-center font-bold">
                  {closingBalance > 0 ? 'بد' : closingBalance < 0 ? 'بس' : 'تسویه'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Official Printable Signatures Footer */}
        <div className="hidden print:flex justify-between items-center p-8 pt-12 border-t border-slate-300 text-xs text-center">
          <div className="w-1/3">
            <p className="font-bold text-slate-800">تهیه‌کننده و حسابدار دفتر</p>
            <p className="text-slate-400 mt-12">(امضاء و تاریخ)</p>
          </div>
          <div className="w-1/3">
            <p className="font-bold text-slate-800">تأیید مدیریت مشاورین املاک</p>
            <p className="text-slate-400 mt-12">(مهر و امضاء)</p>
          </div>
          <div className="w-1/3">
            <p className="font-bold text-slate-800">
              {selectedPerson ? `طرف حساب / مباشر (${selectedPerson})` : 'مشتری / طرف حساب'}
            </p>
            <p className="text-slate-400 mt-12">(امضاء و اثر انگشت)</p>
          </div>
        </div>
      </div>

      {/* SUMMARY TABLE OF SUBSIDIARY ACCOUNTS (معین حساب‌ها) */}
      {ledgerLevel !== 'detail' && (
        <div className="print-hide bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark size={20} className="text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">
                تراز و گردش حساب‌های معین در بازه انتخابی
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {toPersianDigits(accountsSummaryList.length)} حساب دارای گردش
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 w-28">کد حساب</th>
                  <th className="py-3 px-4">عنوان حساب</th>
                  <th className="py-3 px-4 text-center w-24">سطح</th>
                  <th className="py-3 px-4 text-center w-24">ماهیت</th>
                  <th className="py-3 px-4 text-center w-32 text-blue-700">گردش بدهکار</th>
                  <th className="py-3 px-4 text-center w-32 text-amber-700">گردش بستانکار</th>
                  <th className="py-3 px-4 text-center w-36">مانده حساب</th>
                  <th className="py-3 px-4 text-center w-24">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {accountsSummaryList.map(item => (
                  <tr key={item.account.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {item.account.code}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.account.title}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.account.level === 'general' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.account.level === 'general' ? 'کل' : 'معین'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {item.nature}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-blue-700 font-bold">
                      {formatCurrency(item.debit)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-amber-700 font-bold">
                      {formatCurrency(item.credit)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                      {formatCurrency(Math.abs(item.balance))}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedAccountId(String(item.account.id))}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition-colors"
                      >
                        کاردکس ریز
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
