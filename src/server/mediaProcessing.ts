import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { getLocalRoot, saveBuffer, makeObjectKey } from './storage.ts';

const MAX_IMAGE_DIMENSION = parseInt(process.env.MEDIA_MAX_IMAGE_DIMENSION || '1920', 10);
const JPEG_QUALITY = parseInt(process.env.MEDIA_JPEG_QUALITY || '82', 10);

export type ProcessedImage = {
  buffer: Buffer;
  mimeType: string;
  ext: string;
  width?: number;
  height?: number;
  sizeBytes: number;
};

/** فشرده‌سازی و نرمال‌سازی عکس */
export async function compressImage(inputPath: string, mimeType: string): Promise<ProcessedImage> {
  const image = sharp(inputPath, { failOn: 'none' }).rotate();
  const meta = await image.metadata();

  let pipeline = image.resize({
    width: MAX_IMAGE_DIMENSION,
    height: MAX_IMAGE_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  });

  // GIF متحرک را دست نمی‌زنیم
  if (mimeType === 'image/gif') {
    const buffer = fs.readFileSync(inputPath);
    return {
      buffer,
      mimeType: 'image/gif',
      ext: '.gif',
      width: meta.width,
      height: meta.height,
      sizeBytes: buffer.length,
    };
  }

  // خروجی webp برای صرفه‌جویی، مگر PNG شفاف
  const preferPng = mimeType === 'image/png' && meta.hasAlpha;
  if (preferPng) {
    const buffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
    const outMeta = await sharp(buffer).metadata();
    return {
      buffer,
      mimeType: 'image/png',
      ext: '.png',
      width: outMeta.width,
      height: outMeta.height,
      sizeBytes: buffer.length,
    };
  }

  const buffer = await pipeline.webp({ quality: JPEG_QUALITY }).toBuffer();
  const outMeta = await sharp(buffer).metadata();
  return {
    buffer,
    mimeType: 'image/webp',
    ext: '.webp',
    width: outMeta.width,
    height: outMeta.height,
    sizeBytes: buffer.length,
  };
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: 'ignore' });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

/** ساخت thumbnail از ویدیو (نیاز به ffmpeg روی سرور) */
export async function generateVideoThumbnail(
  videoPath: string,
): Promise<{ url: string; key: string; sizeBytes: number } | null> {
  const tmpOut = path.join(getLocalRoot(), `thumb-${randomUUID()}.jpg`);
  try {
    await runFfmpeg([
      '-y',
      '-i',
      videoPath,
      '-ss',
      '00:00:01',
      '-vframes',
      '1',
      '-vf',
      'scale=480:-1',
      tmpOut,
    ]);

    if (!fs.existsSync(tmpOut)) return null;

    const compressed = await compressImage(tmpOut, 'image/jpeg');
    const key = makeObjectKey(`thumb-${randomUUID()}.webp`, 'properties/thumbs');
    const saved = await saveBuffer(key, compressed.buffer, compressed.mimeType);

    try { fs.unlinkSync(tmpOut); } catch {}

    return { url: saved.url, key: saved.key, sizeBytes: saved.size };
  } catch (e) {
    console.warn('video thumbnail skipped (ffmpeg missing or failed):', (e as Error).message);
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch {}
    return null;
  }
}
