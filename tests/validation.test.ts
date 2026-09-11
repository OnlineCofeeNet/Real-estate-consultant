import test from 'node:test';
import assert from 'node:assert/strict';
import { assertId, assertPassword, assertUsername, sanitizeCrudBody, ValidationError } from '../src/server/validation.ts';

test('username validation rejects unsafe usernames', () => {
  assert.equal(assertUsername('Admin_01'), 'admin_01');
  assert.throws(() => assertUsername('x'), ValidationError);
  assert.throws(() => assertUsername('admin<script>'), ValidationError);
});

test('password policy rejects weak credentials', () => {
  assert.equal(assertPassword('Password123'), 'Password123');
  assert.throws(() => assertPassword('short'), ValidationError);
  assert.throws(() => assertPassword('abcdefgh'), ValidationError);
});

test('ids must be positive safe integers', () => {
  assert.equal(assertId('42'), 42);
  assert.throws(() => assertId('0'), ValidationError);
  assert.throws(() => assertId('1.5'), ValidationError);
});

test('crud payload cannot override identity or credential fields', () => {
  const result = sanitizeCrudBody({ id: 10, createdAt: 1, passwordHash: 'secret', salt: 'salt', name: 'ok' });
  assert.deepEqual(result, { name: 'ok' });
});
