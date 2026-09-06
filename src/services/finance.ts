import type { Contract, PaymentMethod, Settings } from '../types';

export interface CommissionResult {
  baseAmount: number;
  commission: number;
  tax: number;
  total: number;
  party1: { commission: number; tax: number; total: number };
  party2: { commission: number; tax: number; total: number };
}

export function calculateCommission(
  contract: Pick<Contract, 'type' | 'price' | 'rent' | 'party1SharePercent'>,
  settings: Pick<Settings, 'commissionRate' | 'taxRate' | 'rentDepositConversionRate' | 'rentCommissionPercent' | 'defaultParty1SharePercent'>,
): CommissionResult {
  const price = Math.max(0, Number(contract.price) || 0);
  const rent = Math.max(0, Number(contract.rent) || 0);
  const rate = Math.max(0, Number(settings.commissionRate) || 0);
  const taxRate = Math.max(0, Number(settings.taxRate) || 0);
  const depositRate = Math.max(0, Number(settings.rentDepositConversionRate ?? 0.03) || 0);
  const rentCommissionPercent = Math.max(0, Number(settings.rentCommissionPercent ?? 25) || 0);
  const share = Math.min(100, Math.max(0, Number(contract.party1SharePercent ?? settings.defaultParty1SharePercent ?? 50) || 50));

  let baseAmount = price;
  let commission = 0;
  if (contract.type === 'sale') {
    commission = (price * rate) / 100;
  } else {
    baseAmount = rent + price * depositRate;
    commission = (baseAmount * rentCommissionPercent) / 100;
  }

  const tax = (commission * taxRate) / 100;
  const total = commission + tax;
  const party1Commission = (commission * share) / 100;
  const party2Commission = commission - party1Commission;
  const party1Tax = (tax * share) / 100;
  const party2Tax = tax - party1Tax;

  return {
    baseAmount,
    commission,
    tax,
    total,
    party1: { commission: party1Commission, tax: party1Tax, total: party1Commission + party1Tax },
    party2: { commission: party2Commission, tax: party2Tax, total: party2Commission + party2Tax },
  };
}

export function paymentStatus(paid: number, payable: number): 'unpaid' | 'partial' | 'paid' | 'overpaid' {
  const p = Math.max(0, Number(paid) || 0);
  const due = Math.max(0, Number(payable) || 0);
  if (p <= 0) return 'unpaid';
  if (p < due) return 'partial';
  if (p === due) return 'paid';
  return 'overpaid';
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return ({ cash: 'نقدی', transfer: 'کارت/انتقال', cheque: 'چک', pos: 'دستگاه کارتخوان', credit: 'اعتباری' })[method];
}
