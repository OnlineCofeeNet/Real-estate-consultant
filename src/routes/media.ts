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

/** آپلود چند فایل برای یک ملک */
router.post('/upload', upload.array('files', 12), async (req, res) => {
  try {
    const propertyId = parseInt(String(req.body.propertyId || ''), 10);
    if (!propertyId || Number.isNaN(propertyId)) {
      // پاک کردن فایل‌های آپلودشده اگر propertyId نامعتبر است
      for (const f of req.files as Express.Multer.File[] || []) {
        try { fs.unlinkSync(f.path); } catch {}
      }
      return res.status(400).json({ error: 'propertyId معتبر الزامی است' });
    }

    const files = (req.files as Express.Multer.File[]) || [];
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

      const publicUrl = `/uploads/properties/${file.filename}`;
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
    rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id! - b.id!));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** تنظیم تصویر/فیلم اصلی */
router.patch('/:id/primary', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await db.select().from(propertyMedia).where(eq(propertyMedia.id, id));
    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'یافت نشد' });

    // همه را غیر اصلی کن
    const all = await db.select().from(propertyMedia).where(eq(propertyMedia.propertyId, item.propertyId));
    for (const m of all) {
      if (m.isPrimary) {
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

    if (item.url && item.url.startsWith('/uploads/')) {
      const diskPath = path.join(process.cwd(), item.url.replace(/^\//, ''));
      try { if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath); } catch {}
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
