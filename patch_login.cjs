const fs = require('fs');
let code = fs.readFileSync('src/services/auth.ts', 'utf8');

const roleCheck = `
  if (!constantTimeEqual(passwordHash, user.passwordHash)) {
    recordFailedAttempt();
    await writeAuthAudit(\`ورود ناموفق برای کاربر: \${normalizedUsername}\`, String(user.id));
    throw new Error('نام کاربری یا رمز عبور نادرست است.');
  }
  
  if (user.role === 'pending') {
    throw new Error('حساب کاربری شما در انتظار تایید مدیر سیستم می‌باشد.');
  }
`;

code = code.replace(
  "  if (!constantTimeEqual(passwordHash, user.passwordHash)) {\n    recordFailedAttempt();\n    await writeAuthAudit(`ورود ناموفق برای کاربر: ${normalizedUsername}`, String(user.id));\n    throw new Error('نام کاربری یا رمز عبور نادرست است.');\n  }",
  roleCheck
);

fs.writeFileSync('src/services/auth.ts', code);
