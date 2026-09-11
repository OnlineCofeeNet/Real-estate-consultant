/**
 * API پشتیبان‌گیری سمت سرور
 * ذخیره پشتیبان‌ها به صورت فایل JSON در پوشه backups/
 */
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const router = Router();
const BACKUP_DIR = path.join(process.cwd(), 'backups');

// اطمینان از وجود پوشه
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

interface StoredBackupMeta {
  id: string;
  createdAt: string;
  source: string;
  size: number;
  filename: string;
}

function listBackupFiles(): StoredBackupMeta[] {
  try {
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'));
    return files
      .map((filename) => {
        const full = path.join(BACKUP_DIR, filename);
        const stat = fs.statSync(full);
        // نام فایل: backup-{id}-{timestamp}.json
        const id = filename.replace(/^backup-/, '').replace(/\.json$/, '').split('-')[0] || filename;
        return {
          id: filename.replace(/\.json$/, ''),
          createdAt: stat.mtime.toISOString(),
          source: 'server',
          size: stat.size,
          filename
        };
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 30); // حداکثر ۳۰ نسخه
  } catch {
    return [];
  }
}

// لیست پشتیبان‌ها
router.get('/', (_req, res) => {
  try {
    const backups = listBackupFiles();
    res.json({ success: true, backups });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ذخیره پشتیبان جدید
router.post('/', (req, res) => {
  try {
    const backup = req.body;
    if (!backup || !backup.data) {
      return res.status(400).json({ error: 'داده پشتیبان نامعتبر است' });
    }

    const id = randomUUID().slice(0, 8);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${id}-${ts}.json`;
    const fullPath = path.join(BACKUP_DIR, filename);

    const toStore = {
      ...backup,
      id,
      storedAt: new Date().toISOString()
    };

    fs.writeFileSync(fullPath, JSON.stringify(toStore, null, 2), 'utf-8');

    // نگه داشتن فقط ۳۰ فایل آخر
    const all = listBackupFiles();
    if (all.length > 30) {
      all.slice(30).forEach((b) => {
        try {
          fs.unlinkSync(path.join(BACKUP_DIR, b.filename));
        } catch {}
      });
    }

    res.json({ success: true, id, filename });
  } catch (e: any) {
    console.error('Backup save error:', e);
    res.status(500).json({ error: e.message || 'خطا در ذخیره پشتیبان' });
  }
});

// دریافت یک پشتیبان خاص
router.get('/:id', (req, res) => {
  try {
    const id = req.params.id;
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.includes(id) && f.endsWith('.json'));
    if (files.length === 0) {
      return res.status(404).json({ error: 'پشتیبان یافت نشد' });
    }
    const fullPath = path.join(BACKUP_DIR, files[0]);
    const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    res.json({ success: true, backup: content });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// حذف پشتیبان
router.delete('/:id', (req, res) => {
  try {
    const id = req.params.id;
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.includes(id) && f.endsWith('.json'));
    files.forEach((f) => {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
      } catch {}
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
