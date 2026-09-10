import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { db } from '../db/index.ts';
import { propertyMedia } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const router = Router();

const propertyUploadsDir = path.join(process.cwd(), 'uploads', 'properties');
fs.mkdirSync(propertyUploadsDir, { recursive: true });

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_VIDEO = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, propertyUploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || guessExt(file.mimetype);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

function guessExt(mime: string): string {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  if (mime === 'video/mp4') return '.mp4';
  if (mime === 'video/webm') return '.webm';
  if (mime === 'video/quicktime') return '.mov';
  return '';
}

function mediaKind(mime: string): 'image' | 'video' | null {
  if (ALLOWED_IMAGE.has(mime)) return 'image';
  if (ALLOWED_VIDEO.has(mime)) return 'video';
  return null;
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_BYTES, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (mediaKind(file.mimetype)) cb(null, true);
    else cb(new Error('نوع فایل مجاز نیست. فقط عکس (jpg/png/webp/gif) و فیلم (mp4/webm/mov)'));
  },
});

/** سرو فایل آپلودشده */
router.get('/file/:filename', (req, res) => {
  const safe = path.basename(req.params.filename);
  const fp = path.join(propertyUploadsDir, safe);
  if (!fp.startsWith(propertyUploadsDir) || !fs.existsSync(fp)) {
    return res.status(404).json({ error: 'فایل یافت نشد' });
  }
  res.sendFile(fp);
});

/** آپلود چند فایل برای یک ملک */
router.post('/upload', upload.array('files', 12), async (req, res) => {
  try {
    const propertyId = parseInt(String(req.body.propertyId || ''), 10);
    const files = (req.files as Express.Multer.File[]) || [];

    if (!propertyId || Number.isNaN(propertyId)) {
      for (const f of files) {
        try { fs.unlinkSync(f.path); } catch {}
      }
      return res.status(400).json({ error: 'propertyId معتبر الزامی است' });
    }

    if (files.length === 0) {
      return res.status(400).json({ error: 'هیچ فایلی ارسال نشده است' });
    }

    const created: any[] = [];

    for (const file of files) {
      const kind = mediaKind(file.mimetype);
      if (!kind) {
        try { fs.unlinkSync(file.path); } catch {}
        continue;
      }
      if (kind === 'image' && file.size > MAX_IMAGE_BYTES) {
        try { fs.unlinkSync(file.path); } catch {}
        return res.status(400).json({ error: `حجم عکس نباید بیشتر از ${MAX_IMAGE_BYTES / (1024 * 1024)}MB باشد` });
      }
      if (kind === 'video' && file.size > MAX_VIDEO_BYTES) {
        try { fs.unlinkSync(file.path); } catch {}
        return res.status(400).json({ error: `حجم فیلم نباید بیشتر از ${MAX_VIDEO_BYTES / (1024 * 1024)}MB باشد` });
      }

      const publicUrl = `/api/media/file/${file.filename}`;
      const rows = await db.insert(propertyMedia).values({
        propertyId,
        type: kind,
        url: publicUrl,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        originalName: file.originalname,
        isPrimary: false,
        sortOrder: 0,
        createdAt: Date.now(),
      }).returning();

      created.push(rows[0]);
    }

    res.json({ success: true, items: created });
  } catch (e: any) {
    console.error('upload error', e);
    res.status(500).json({ error: e.message || 'خطا در آپلود' });
  }
});

/** لیست رسانه یک ملک */
router.get('/property/:propertyId', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.propertyId, 10);
    const rows = await db.select().from(propertyMedia).where(eq(propertyMedia.propertyId, propertyId));
    rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || ((a.id ?? 0) - (b.id ?? 0)));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** تنظیم رسانه اصلی */
router.patch('/:id/primary', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await db.select().from(propertyMedia).where(eq(propertyMedia.id, id));
    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'یافت نشد' });

    const all = await db.select().from(propertyMedia).where(eq(propertyMedia.propertyId, item.propertyId));
    for (const m of all) {
      if (m.isPrimary && m.id !== id) {
        await db.update(propertyMedia).set({ isPrimary: false }).where(eq(propertyMedia.id, m.id));
      }
    }
    await db.update(propertyMedia).set({ isPrimary: true }).where(eq(propertyMedia.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** حذف رسانه + فایل فیزیکی */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await db.select().from(propertyMedia).where(eq(propertyMedia.id, id));
    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'یافت نشد' });

    await db.delete(propertyMedia).where(eq(propertyMedia.id, id));

    if (item.url && item.url.includes('/api/media/file/')) {
      const filename = path.basename(item.url);
      const diskPath = path.join(propertyUploadsDir, filename);
      try { if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath); } catch {}
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
