import { db } from '../db/db';
import { JournalEntry, JournalItem, ChequeRecord } from '../types';
import num2persian from 'num2persian';

/**
 * Initializes the default Chart of Accounts if empty, and ensures essential accounts exist
 */
export async function ensureDefaultAccounts(): Promise<void> {
  const count = await db.accounts.count();
  if (count === 0) {
    const { DEFAULT_REAL_ESTATE_ACCOUNTS } = await import('./accountingDefaults');
    await db.accounts.bulkAdd(DEFAULT_REAL_ESTATE_ACCOUNTS as any);
  } else {
    // Ensure agent commission expense account (40107) exists
    const acc40107 = await db.accounts.where('code').equals('40107').first();
    if (!acc40107) {
      const parentAcc = await db.accounts.where('code').equals('401').first();
      await db.accounts.add({
        code: '40107',
        title: 'هزینه پورسانت و سهم مشاوران و مباشران',
        nature: 'debtor',
        level: 'subsidiary',
        parentId: parentAcc?.id || 28,
        createdAt: Date.now(),
        isSystem: true
      } as any);
    }
  }
}

/**
 * Creates a balanced double-entry journal voucher
 */
export async function createBalancedVoucher(params: {
  date: string; // ۱۴۰۴/۰۱/۱۵
  description: string;
  referenceType?: 'contract' | 'cheque' | 'expense' | 'manual';
  referenceId?: string;
  items: Omit<JournalItem, 'id' | 'entryId'>[];
}): Promise<number> {
  await ensureDefaultAccounts();

  const totalDebit = params.items.reduce((s, i) => s + (Number(i.debit) || 0), 0);
  const totalCredit = params.items.reduce((s, i) => s + (Number(i.credit) || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 1) {
    throw new Error(`سند حسابداری تراز نیست! مجموع بدهکار (${totalDebit.toLocaleString()}) با مجموع بستانکار (${totalCredit.toLocaleString()}) برابر نیست.`);
  }

  // Find next voucher number
  const lastEntry = await db.journalEntries.orderBy('voucherNumber').last();
  const nextVoucherNumber = (lastEntry?.voucherNumber || 0) + 1;

  const descWithPersianWords = `${params.description} (${num2persian(Math.round(totalDebit))} تومان)`;

  const entryId = await db.journalEntries.add({
    agencyId: 'default_agency',
    voucherNumber: nextVoucherNumber,
    date: params.date,
    description: descWithPersianWords,
    status: 'approved',
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    items: params.items.map(it => ({ ...it, entryId: 0 })) as any,
    totalDebit,
    totalCredit,
    createdAt: Date.now()
  });

  return entryId;
}

/**
 * Automatically creates an accounting journal voucher from a completed real estate contract
 */
export async function createContractJournalEntry(contract: {
  contractNumber: string;
  date: string;
  type: 'sale' | 'rent';
  commission: number;
  tax: number;
  totalPayable: number;
  party1PaymentMethod?: string;
  party2PaymentMethod?: string;
  party1Name?: string;
  party2Name?: string;
  agentName?: string;
  agentPhone?: string;
  agentLicenseCode?: string;
  agentCommissionPercent?: number;
  agentShareAmount?: number;
}): Promise<number> {
  await ensureDefaultAccounts();

  const accounts = await db.accounts.toArray();
  const getAccId = (code: string) => accounts.find(a => a.code === code)?.id || 1;

  // Account codes
  const posBankAccId = getAccId('10103'); // بانک ملت متصل به POS
  const cashAccId = getAccId('10101'); // صندوق اصلی
  const chequeAccId = getAccId('10201'); // اسناد دریافتنی
  const receivableAccId = getAccId('10301'); // بدهکاران معوق
  
  const commissionRevenueAccId = contract.type === 'rent' ? getAccId('30102') : getAccId('30101'); // درآمد کمیسیون
  const vatTaxPayableAccId = getAccId('20401'); // مالیات بر ارزش افزوده پرداختنی

  const halfPayable = Math.round((contract.totalPayable || 0) / 2);

  // Helper to choose debit account based on payment method
  const getDebitAcc = (method?: string) => {
    if (method === 'pos') return posBankAccId;
    if (method === 'cheque') return chequeAccId;
    if (method === 'transfer') return posBankAccId;
    if (method === 'cash') return cashAccId;
    return receivableAccId;
  };

  const debitAcc1 = getDebitAcc(contract.party1PaymentMethod);
  const debitAcc2 = getDebitAcc(contract.party2PaymentMethod);

  const items: Omit<JournalItem, 'id' | 'entryId'>[] = [
    // بدهکار: سهم طرف اول
    {
      accountId: debitAcc1,
      description: `دریافت سهم کمیسیون طرف اول (${contract.party1Name || 'طرف ۱'}) - قرارداد ${contract.contractNumber}`,
      debit: halfPayable,
      credit: 0,
      detailPersonName: contract.party1Name
    },
    // بدهکار: سهم طرف دوم
    {
      accountId: debitAcc2,
      description: `دریافت سهم کمیسیون طرف دوم (${contract.party2Name || 'طرف ۲'}) - قرارداد ${contract.contractNumber}`,
      debit: halfPayable,
      credit: 0,
      detailPersonName: contract.party2Name
    },
    // بستانکار: درآمد کمیسیون آژانس
    {
      accountId: commissionRevenueAccId,
      description: `درآمد حاصل از کمیسیون قرارداد شماره ${contract.contractNumber} (${contract.type === 'rent' ? 'اجاره' : 'فروش'})`,
      debit: 0,
      credit: contract.commission || 0
    },
    // بستانکار: مالیات بر ارزش افزوده (VAT)
    {
      accountId: vatTaxPayableAccId,
      description: `مالیات بر ارزش افزوده متعلقه به قرارداد شماره ${contract.contractNumber}`,
      debit: 0,
      credit: contract.tax || 0
    }
  ];

  // ثبت سهم مباشر در حسابداری دوطرفه (در صورت تعیین مباشر و سهم پورسانت)
  const agentShare = Math.round(Number(contract.agentShareAmount) || 0);
  if (contract.agentName && agentShare > 0) {
    const agentExpenseAccId = getAccId('40107'); // هزینه پورسانت و سهم مشاوران و مباشران
    const agentPayableAccId = getAccId('20101'); // پورسانت پرداختنی مشاوران و همکاران

    // بدهکار: هزینه سهم مباشر
    items.push({
      accountId: agentExpenseAccId,
      description: `سهم کمیسیون مباشر (${contract.agentName}${contract.agentCommissionPercent ? ` - ${contract.agentCommissionPercent}٪` : ''}) - قرارداد ${contract.contractNumber}`,
      debit: agentShare,
      credit: 0,
      detailPersonName: contract.agentName
    });

    // بستانکار: بستانکاری/طلب مباشر
    items.push({
      accountId: agentPayableAccId,
      description: `بستانکاری سهم مباشر (${contract.agentName}) بابت قرارداد شماره ${contract.contractNumber}`,
      debit: 0,
      credit: agentShare,
      detailPersonName: contract.agentName
    });
  }

  return createBalancedVoucher({
    date: contract.date,
    description: `صدور فاکتور و ثبت سند قرارداد ${contract.contractNumber}${contract.agentName ? ` (مباشر: ${contract.agentName})` : ''}`,
    referenceType: 'contract',
    referenceId: contract.contractNumber,
    items
  });
}
