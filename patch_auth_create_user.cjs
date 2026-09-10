const fs = require('fs');
let code = fs.readFileSync('src/services/auth.ts', 'utf8');

const createUserBlock = `
export async function createUserByAdmin(username: string, password: string, email: string, phone: string, role: string, q1: string = '', a1: string = '', q2: string = '', a2: string = ''): Promise<void> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(normalizedUsername)) throw new Error('نام کاربری نامعتبر است.');
  if (password && !isValidPassword(password)) throw new Error('رمز عبور ضعیف است.');
  
  const existing = await db.users.where('username').equals(normalizedUsername).first();
  if (existing) throw new Error('این نام کاربری قبلاً ثبت شده است.');
  
  const salt = randomSalt();
  const passwordHash = password ? await derivePasswordHash(password, salt) : '';
  const securityAnswer1Hash = a1 ? await derivePasswordHash(a1.trim().toLowerCase(), salt) : '';
  const securityAnswer2Hash = a2 ? await derivePasswordHash(a2.trim().toLowerCase(), salt) : '';
  
  const user: AuthUser = {
    username: normalizedUsername,
    passwordHash,
    salt,
    role: role as any,
    phone,
    email,
    securityQuestion1: q1,
    securityAnswer1Hash,
    securityQuestion2: q2,
    securityAnswer2Hash,
    createdAt: Date.now()
  };
  
  await db.users.add(user);
}
`;

if (!code.includes('createUserByAdmin')) {
  code = code.replace("export async function registerUser", createUserBlock + "\nexport async function registerUser");
  fs.writeFileSync('src/services/auth.ts', code);
  console.log("Patched createUserByAdmin");
}
