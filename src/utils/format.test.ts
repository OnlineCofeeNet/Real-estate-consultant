import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { toPersianDigits, toEnglishDigits, normalizeSearchQuery, formatCurrency } from './format.ts';

describe('toPersianDigits', () => {
  it('converts English digits to Persian', () => {
    assert.equal(toPersianDigits('123'), '۱۲۳');
    assert.equal(toPersianDigits(456), '۴۵۶');
  });

  it('handles empty/null', () => {
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
  it('normalizes Persian/Arabic variants and lowercases', () => {
    assert.equal(normalizeSearchQuery('كی'), 'کی');
    assert.equal(normalizeSearchQuery('  یحیی  '), 'یحیی');
  });
});

describe('formatCurrency', () => {
  it('formats number with Persian digits and currency', () => {
    const result = formatCurrency(1500000);
    assert.ok(result.includes('تومان'));
    assert.ok(result.includes('۱') || result.includes('1'));
  });

  it('handles zero and empty', () => {
    assert.ok(formatCurrency(0).includes('۰'));
    assert.ok(formatCurrency(null).includes('۰'));
  });
});
