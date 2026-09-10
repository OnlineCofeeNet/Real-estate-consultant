import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { toPersianDigits, toEnglishDigits, normalizeSearchQuery, formatCurrency } from './format.ts';

describe('toPersianDigits', () => {
  it('converts English digits to Persian', () => {
    assert.equal(toPersianDigits('123'), '۱۲۳');
    assert.equal(toPersianDigits(456), '۴۵۶');
  });

  it('handles empty/null/undefined', () => {
    assert.equal(toPersianDigits(''), '');
    assert.equal(toPersianDigits(null), '');
    assert.equal(toPersianDigits(undefined), '');
  });
});

describe('toEnglishDigits', () => {
  it('converts Persian and Arabic digits to English', () => {
    assert.equal(toEnglishDigits('۱۲۳'), '123');
    assert.equal(toEnglishDigits('٠١٢'), '012');
  });
});

describe('normalizeSearchQuery', () => {
  it('normalizes Persian/Arabic variants and trims', () => {
    assert.equal(normalizeSearchQuery('كی'), 'کی');
    assert.equal(normalizeSearchQuery('  یحیی  '), 'یحیی');
  });
});

describe('formatCurrency', () => {
  it('formats number with Persian digits and currency suffix', () => {
    const result = formatCurrency(1500000);
    assert.ok(result.includes('تومان'));
    assert.ok(/[۰-۹]/.test(result) || /\d/.test(result));
  });

  it('handles zero and empty values', () => {
    assert.ok(formatCurrency(0).includes('۰') || formatCurrency(0).includes('0'));
    assert.ok(formatCurrency(null).includes('۰') || formatCurrency(null).includes('0'));
  });
});
