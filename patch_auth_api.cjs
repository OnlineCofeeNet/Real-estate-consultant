const fs = require('fs');

// 1. API Route
let codeApi = fs.readFileSync('src/routes/api.ts', 'utf8');

const loginFetchBlock = `
  router.post('/users/login-fetch', async (req, res) => {
    const { username } = req.body;
    try {
      const result = await db.select().from(users).where(eq(users.username, username));
      res.json(result[0] || null);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
`;

codeApi = codeApi.replace("router.get('/users'", loginFetchBlock + "\n  router.get('/users'");
fs.writeFileSync('src/routes/api.ts', codeApi);

// 2. Auth.ts
let codeAuth = fs.readFileSync('src/services/auth.ts', 'utf8');
codeAuth = codeAuth.replace(
  "const user = await db.users.where('username').equals(normalizedUsername).first();",
  "const { data: user } = await import('axios').then(m => m.default.post('/api/users/login-fetch', { username: normalizedUsername }));"
);

codeAuth = codeAuth.replace(
  "const user = await db.users.where('username').equals(normalizedUsername).first();",
  "const { data: user } = await import('axios').then(m => m.default.post('/api/users/login-fetch', { username: normalizedUsername }));"
);

// We need to replace all instances
codeAuth = codeAuth.replace(/const user = await db\.users\.where\('username'\)\.equals\(normalizedUsername\)\.first\(\);/g, 
  "const { data: user } = await import('axios').then(m => m.default.post('/api/users/login-fetch', { username: normalizedUsername }));");

fs.writeFileSync('src/services/auth.ts', codeAuth);
