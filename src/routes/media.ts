import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { db } from '../db/index.ts';
import { propertyMedia } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import {
  getLocalRoot,
  localFilePath,
  makeObjectKey,
  saveBuffer,
  saveLocalFile,
  deleteByKeyOrUrl,
  getQuotaBytes,
  getStorageDriver,
  publicUrlForKey,
} from '../server/storage.ts';
import { compressImage, generateVideoThumbnail } from '../server/mediaProcessing.ts';

const router = Router();

const propertyUploadsDir = getLocalRoot();
fs.mkdirSync(propertyUploadsDir, { recursive: true });

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_VIDEO = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, propertyUploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

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

async function getUsedBytes(): Promise<number> {
  try {
    const result = await db
      .select({ total: sql<number>`coalesce(sum(${propertyMedia.sizeBytes}), 0)` })
      .from(propertyMedia);
    return Number(result[0]?.total || 0);
  } catch {
    return 0;
  }
}

/** وضعیت فضای ذخیره‌سازی آژانس */
router.get('/quota', async (_req, res) => {
  try {
    const used = await getUsedBytes();
    const quota = getQuotaBytes();
    res.json({
      usedBytes: used,
      quotaBytes: quota,
      remainingBytes: Math.max(0, quota - used),
      usedPercent: quota > 0 ? Math.min(100, Math.round((used / quota) * 1000) / 10) : 0,
      driver: getStorageDriver(),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** سرو فایل محلی (وقتی CDN/S3 نیست) */
router.get('/file/:filename', (req, res) => {
  const fp = localFilePath(req.params.filename);
  if (!fp) return res.status(404).json({ error: 'فایل یافت نشد' });
  res.sendFile(fp);
});

/** آپلود چند فایل */
router.post('/upload', upload.array('files', 12), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  try {
    const propertyId = parseInt(String(req.body.propertyId || ''), 10);

    if (!propertyId || Number.isNaN(propertyId)) {
      for (const f of files) {
        try { fs.unlinkSync(f.path); } catch {}
      }
      return res.status(400).json({ error: 'propertyId معتبر الزامی است' });
    }

    if (files.length === 0) {
      return res.status(400).json({ error: 'هیچ فایلی ارسال نشده است' });
    }

    // بررسی سهمیه
    const used = await getUsedBytes();
    const quota = getQuotaBytes();
    const incoming = files.reduce((s, f) => s + f.size, 0);
    if (used + incoming > quota) {
      for (const f of files) {
        try { fs.unlinkSync(f.path); } catch {}
      }
      const remainMb = Math.max(0, (quota - used) / (1024 * 1024));
      return res.status(413).json({
        error: `ظرفیت ذخیره آژانس پر است. باقی‌مانده حدود ${remainMb.toFixed(1)} مگابایت`,
        usedBytes: used,
        quotaBytes: quota,
      });
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

      let finalUrl = '';
      let finalSize = file.size;
      let finalMime = file.mimetype;
      let width: number | undefined;
      let height: number | undefined;
      let thumbnailUrl: string | undefined;
      let objectKey = '';

      if (kind === 'image') {
        const processed = await compressImage(file.path, file.mimetype);
        objectKey = makeObjectKey(`${randomUUID()}${processed.ext}`);
        const saved = await saveBuffer(objectKey, processed.buffer, processed.mimeType);
        finalUrl = saved.url;
        finalSize = saved.size;
        finalMime = processed.mimeType;
        width = processed.width;
        height = processed.height;
        try { fs.unlinkSync(file.path); } catch {}
      } else {
        // ویدیو: ذخیره مستقیم + thumbnail اختیاری
        objectKey = makeObjectKey(file.originalname || `${randomUUID()}.mp4`);
        const saved = await saveLocalFile(objectKey, file.path, file.mimetype);
        finalUrl = saved.url;
        finalSize = saved.size;

        const thumb = await generateVideoThumbnail(file.path);
        if (thumb) thumbnailUrl = thumb.url;

        // اگر روی S3 ذخیره شد، فایل موقت محلی را پاک کن
        if (getStorageDriver() === 's3') {
          try { fs.unlinkSync(file.path); } catch {}
        } else {
          // برای local، نام فایل باید با آنچه در دیسک است هم‌خوان باشد
          // saveLocalFile با driver=local از basename استفاده می‌کند
        }
      }

      const rows = await db.insert(propertyMedia).values({
        propertyId,
        type: kind,
        url: finalUrl,
        thumbnailUrl,
        mimeType: finalMime,
        sizeBytes: finalSize,
        originalName: file.originalname,
        width,
        height,
        isPrimary: false,
        sortOrder: 0,
        createdAt: Date.now(),
      }).returning();

      created.push(rows[0]);
    }

    const usedAfter = await getUsedBytes();
    res.json({
      success: true,
      items: created,
      storage: {
        usedBytes: usedAfter,
        quotaBytes: quota,
        remainingBytes: Math.max(0, quota - usedAfter),
        driver: getStorageDriver(),
      },
    });
  } catch (e: any) {
    console.error('upload error', e);
    for (const f of files) {
      try { fs.unlinkSync(f.path); } catch {}
    }
    res.status(500).json({ error: e.message || 'خطا در آپلود' });
  }
});

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

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await db.select().from(propertyMedia).where(eq(propertyMedia.id, id));
    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'یافت نشد' });

    await db.delete(propertyMedia).where(eq(propertyMedia.id, id));

    if (item.url) await deleteByKeyOrUrl(item.url);
    if (item.thumbnailUrl) await deleteByKeyOrUrl(item.thumbnailUrl);

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
