export class ValidationError extends Error { status = 400; }

export function assertObject(value: unknown, name = 'body'): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError(`${name} باید یک شیء معتبر باشد.`);
  return value as Record<string, any>;
}

export function assertId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ValidationError('شناسه نامعتبر است.');
  return id;
}

export function assertUsername(value: unknown): string {
  const username = String(value ?? '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new ValidationError('نام کاربری نامعتبر است.');
  return username;
}

export function assertPassword(value: unknown): string {
  const password = String(value ?? '');
  if (password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new ValidationError('رمز عبور باید ۸ تا ۱۲۸ کاراکتر و شامل حداقل یک حرف و یک عدد باشد.');
  return password;
}

export function assertPlainPayload(value: unknown, maxBytes = 512 * 1024): Record<string, any> {
  const body = assertObject(value);
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > maxBytes) throw new ValidationError('حجم داده ارسالی بیش از حد مجاز است.');
  return body;
}

export function sanitizeCrudBody(body: Record<string, any>): Record<string, any> {
  const clone = { ...body };
  delete clone.id;
  delete clone.createdAt;
  delete clone.updatedAt;
  delete clone.passwordHash;
  delete clone.salt;
  delete clone.securityAnswer1Hash;
  delete clone.securityAnswer2Hash;
  return clone;
}
