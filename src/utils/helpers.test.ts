import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { validateNationalId, validatePhone, formatBankCard, formatSheba } from './helpers.ts';

describe('validateNationalId', () => {
  it('accepts a valid Iranian national ID', () => {
    assert.equal(validateNationalId('0013542419'), true);
  });

  it('rejects non-10-digit codes', () => {
    assert.equal(validateNationalId('123'), false);
    assert.equal(validateNationalId('12345678901'), false);
    assert.equal(validateNationalId('abcdefghij'), false);
  });

  it('rejects invalid checksum', () => {
    assert.equal(validateNationalId('0013542410'), false);
  });
});

describe('validatePhone', () => {
  it('accepts valid Iranian mobile numbers', () => {
    assert.equal(validatePhone('09123456789'), true);
    assert.equal(validatePhone('09901234567'), true);
  });

  it('rejects invalid phones', () => {
    assert.equal(validatePhone('0912345678'), false);
    assert.equal(validatePhone('091234567890'), false);
    assert.equal(validatePhone('08123456789'), false);
    assert.equal(validatePhone('+989123456789'), false);
    assert.equal(validatePhone(''), false);
  });
});

describe('formatBankCard', () => {
  it('formats 16-digit card with dashes and Persian digits', () => {
    const result = formatBankCard('6037991234567890');
    assert.ok(result.includes('-'));
    assert.ok(/[۰-۹]/.test(result));
  });
});

describe('formatSheba', () => {
  it('formats IBAN-style sheba', () => {
    const result = formatSheba('IR120170000000123456789012');
    assert.ok(result.length > 20);
  });
});
