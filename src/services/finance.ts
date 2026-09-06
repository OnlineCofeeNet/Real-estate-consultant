import type { Contract, Settings } from '../types';

export type PaymentMethod = 'cash' | 'transfer' | 'cheque' | 'pos' | 'credit';

export interface CommissionResult {
  baseAmount: number;
  commission: number;
  tax: number;
  total: number;
  party1: { commission: number; tax: number; total: number };
  party2: { commission: number; tax: number; total: number };
}

/**
 * Central financial engine. UI components must use this function instead of
 * implementing commission formulas independently.
 */
export function calculateCommission(contract: Pick<Contract, 'type' | 'price' | 'rent'>, settings: Pick<Settings, 'commissionRate' | 'taxRate'>): CommissionResult {
  const price = Math.max(0, Number(contract.price) || 0);
  const rent = Math.max(0, Number(contract.rent) || 0);
  const rate = Math.max(0, Number(settings.commissionRate) || 0);
  const taxRate = Math.max(0, Number(settings.taxRate) || 0);

  let baseAmount = price;
  let commission = 0;

  if (contract.type === 'sale') {
    commission = (price * rate) / 100;
  } else {
    // Existing application's rent formula, centralized for consistency.
    const equivalentRent = rent + price * 0.03;
    baseAmount = equivalentRent;
    commission = equivalentRent * 0.25;
  }

  const tax = (commission * taxRate) / 100;
  const total = commission + tax;
  const party1Commission = commission / 2;
  const party2Commission = commission - party1Commission;
  const party1Tax = tax / 2;
  const party2Tax = tax - party1Tax;

  return {
    baseAmount,
    commission,
    tax,
    total,
    party1: {
      commission: party1Commission,
      tax: party1Tax,
      total: party1Commission + party1Tax,
    },
    party2: {
      commission: party2Commission,
      tax: party2Tax,
      total: party2Commission + party2Tax,
    },
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
