const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Insert Backup API
const backupApiHTML = `
  // Auto Backup API (Online Backup)
  const BACKUP_FILE = path.join(process.cwd(), 'backup.json');

  app.post('/api/backup', express.text({ type: '*/*', limit: '50mb' }), (req, res) => {
    try {
      const data = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      fs.writeFileSync(BACKUP_FILE, data, 'utf8');
      res.json({ success: true });
    } catch (err: any) {
      res.json({ success: false, error: err.message });
    }
  });

  app.get('/api/backup', (req, res) => {
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const data = fs.readFileSync(BACKUP_FILE, 'utf8');
        res.type('json').send(data);
      } else {
        res.json({ success: false, error: 'No backup found' });
      }
    } catch (err: any) {
      res.json({ success: false, error: err.message });
    }
  });
`;

code = code.replace("app.get('/api/bot/connected-users', (req, res) => {", backupApiHTML + "\n  app.get('/api/bot/connected-users', (req, res) => {");

fs.writeFileSync('server.ts', code);
