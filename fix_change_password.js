const fs = require('fs');
let code = fs.readFileSync('src/services/auth.ts', 'utf8');

code = code.replace(/export async function changePassword[\s\S]*?(?=^$|EOF)/, `export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
  const user = await db.users.get(userId);
  if (!user) throw new Error('کاربر یافت نشد.');
  
  const currentHash = await derivePasswordHash(currentPassword, user.salt);
  if (!constantTimeEqual(currentHash, user.passwordHash)) {
    throw new Error('رمز عبور فعلی نادرست است.');
  }
  
  if (!isValidPassword(newPassword)) throw new Error('رمز عبور جدید ضعیف است.');
  // Keep the same salt so we don't break security answers
  const newPasswordHash = await derivePasswordHash(newPassword, user.salt);
  
  await db.users.update(userId, {
    passwordHash: newPasswordHash,
  });
}`);

fs.writeFileSync('src/services/auth.ts', code);
