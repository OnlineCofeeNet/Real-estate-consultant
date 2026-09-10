import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

export type StorageDriver = 'local' | 's3';

const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase() as StorageDriver;

const localRoot = path.join(process.cwd(), 'uploads', 'properties');
fs.mkdirSync(localRoot, { recursive: true });

/** پایه عمومی برای CDN (مثلاً https://cdn.example.com) */
const cdnBase = (process.env.CDN_BASE_URL || '').replace(/\/$/, '');

function s3Enabled(): boolean {
  return driver === 's3' && Boolean(process.env.S3_BUCKET);
}

function createS3(): S3Client {
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const region = process.env.S3_REGION || 'auto';
  return new S3Client({
    region,
    endpoint,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
  });
}

let s3Client: S3Client | null = null;
function getS3(): S3Client {
  if (!s3Client) s3Client = createS3();
  return s3Client;
}

export function getStorageDriver(): StorageDriver {
  return s3Enabled() ? 's3' : 'local';
}

export function makeObjectKey(originalName: string, prefix = 'properties'): string {
  const ext = path.extname(originalName).toLowerCase() || '';
  const safeExt = ext.replace(/[^a-z0-9.]/gi, '') || '';
  return `${prefix}/${Date.now()}-${randomUUID()}${safeExt}`;
}

/** ساخت URL عمومی برای نمایش در مرورگر */
export function publicUrlForKey(key: string): string {
  if (cdnBase) {
    return `${cdnBase}/${key.replace(/^\//, '')}`;
  }
  if (s3Enabled() && process.env.S3_PUBLIC_URL) {
    return `${process.env.S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  }
  // مسیر API محلی
  const filename = path.basename(key);
  return `/api/media/file/${filename}`;
}

export async function saveBuffer(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ key: string; url: string; size: number }> {
  if (s3Enabled()) {
    const bucket = process.env.S3_BUCKET!;
    await getS3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: process.env.S3_ACL === 'public-read' ? 'public-read' : undefined,
      }),
    );
    return { key, url: publicUrlForKey(key), size: buffer.length };
  }

  const filename = path.basename(key);
  const full = path.join(localRoot, filename);
  fs.writeFileSync(full, buffer);
  return { key: filename, url: publicUrlForKey(filename), size: buffer.length };
}

export async function saveLocalFile(
  key: string,
  filePath: string,
  contentType: string,
): Promise<{ key: string; url: string; size: number }> {
  const buffer = fs.readFileSync(filePath);
  return saveBuffer(key, buffer, contentType);
}

export async function deleteByKeyOrUrl(keyOrUrl: string): Promise<void> {
  if (!keyOrUrl) return;

  // استخراج key/filename
  let key = keyOrUrl;
  if (keyOrUrl.includes('/api/media/file/')) {
    key = path.basename(keyOrUrl);
  } else if (keyOrUrl.startsWith('http')) {
    try {
      const u = new URL(keyOrUrl);
      key = u.pathname.replace(/^\//, '');
    } catch {
      key = path.basename(keyOrUrl);
    }
  }

  if (s3Enabled()) {
    try {
      await getS3().send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key.startsWith('properties/') ? key : `properties/${path.basename(key)}`,
        }),
      );
    } catch (e) {
      console.warn('S3 delete failed', e);
    }
    return;
  }

  const full = path.join(localRoot, path.basename(key));
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {}
}

export function localFilePath(filename: string): string | null {
  const safe = path.basename(filename);
  const full = path.join(localRoot, safe);
  if (!full.startsWith(localRoot) || !fs.existsSync(full)) return null;
  return full;
}

export function getLocalRoot(): string {
  return localRoot;
}

/** سهمیه کل فضای آژانس (بایت) */
export function getQuotaBytes(): number {
  const mb = parseInt(process.env.AGENCY_STORAGE_QUOTA_MB || '2048', 10);
  if (Number.isNaN(mb) || mb <= 0) return 2 * 1024 * 1024 * 1024;
  return mb * 1024 * 1024;
}
