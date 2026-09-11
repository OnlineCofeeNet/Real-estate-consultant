import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { promisify } from 'util';
import { db } from '../db/index.ts';
import { users, customers, contracts, invoices, payments, messageLogs, auditLogs, settings, properties, areas, propertyImages, propertyMedia, propertyRequests, propertyShares } from '../db/schema.ts';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const DEFAULT_INTERVAL_MINUTES = 30;
const DEFAULT_RETENTION = 30;
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const BOT_FILES = ['bot-settings.json', 'bot-users.json'];
export interface BackupConfig { enabled: boolean; intervalMinutes: number; backupOnExit: boolean; retentionCount: number; }
export interface BackupRecord { fileName: string; createdAt: number; sizeBytes: number; sha256: string; encrypted: boolean; }
const defaults: BackupConfig = { enabled: true, intervalMinutes: DEFAULT_INTERVAL_MINUTES, backupOnExit: true, retentionCount: DEFAULT_RETENTION };
let heartbeatTimer: NodeJS.Timeout | null = null;
let lastScheduledBackupAt = 0;
let backupInProgress = false;
let shutdownBackupStarted = false;
function ensureBackupDir() { fs.mkdirSync(BACKUP_DIR, { recursive: true }); }
function normalizeConfig(raw: any): BackupConfig { return { enabled: raw?.enabled !== false, intervalMinutes: Math.max(1, Math.min(24 * 60, Number(raw?.intervalMinutes) || DEFAULT_INTERVAL_MINUTES)), backupOnExit: raw?.backupOnExit !== false, retentionCount: Math.max(1, Math.min(365, Number(raw?.retentionCount) || DEFAULT_RETENTION)) }; }
export async function getBackupConfig(): Promise<BackupConfig> { try { const rows = await db.select().from(settings); return normalizeConfig((rows[0]?.data as any)?.backupSettings); } catch (error) { console.warn('Backup settings could not be loaded; defaults are used.', error); return defaults; } }
async function collectDatabase() { const [usersRows, customersRows, contractsRows, invoicesRows, paymentsRows, messageLogsRows, auditLogsRows, settingsRows, propertiesRows, areasRows, propertyImagesRows, propertyMediaRows, propertyRequestsRows, propertySharesRows] = await Promise.all([db.select().from(users), db.select().from(customers), db.select().from(contracts), db.select().from(invoices), db.select().from(payments), db.select().from(messageLogs), db.select().from(auditLogs), db.select().from(settings), db.select().from(properties), db.select().from(areas), db.select().from(propertyImages), db.select().from(propertyMedia), db.select().from(propertyRequests), db.select().from(propertyShares)]); return { users: usersRows, customers: customersRows, contracts: contractsRows, invoices: invoicesRows, payments: paymentsRows, messageLogs: messageLogsRows, auditLogs: auditLogsRows, settings: settingsRows, properties: propertiesRows, areas: areasRows, propertyImages: propertyImagesRows, propertyMedia: propertyMediaRows, propertyRequests: propertyRequestsRows, propertyShares: propertySharesRows }; }
async function collectBotFiles() { const files: Record<string, unknown> = {}; for (const name of BOT_FILES) { try { const filePath = path.join(process.cwd(), name); if (fs.existsSync(filePath)) files[name] = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (error) { console.warn(`Could not include ${name} in backup.`, error); } } return files; }
function encryptionKey(): Buffer | null { const secret = process.env.BACKUP_ENCRYPTION_KEY || ''; if (!secret) { if (process.env.NODE_ENV === 'production') throw new Error('BACKUP_ENCRYPTION_KEY is required in production.'); return null; } return crypto.scryptSync(secret, 'real-estate-consultant-backup-v1', 32); }
function encrypt(data: Buffer): Buffer { const key = encryptionKey(); if (!key) return data; const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key, iv); const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]); const tag = cipher.getAuthTag(); return Buffer.from(JSON.stringify({ version: 1, algorithm: 'aes-256-gcm', iv: iv.toString('base64'), tag: tag.toString('base64'), data: ciphertext.toString('base64') }), 'utf8'); }
function decrypt(data: Buffer): Buffer { const raw = JSON.parse(data.toString('utf8')); if (raw?.algorithm !== 'aes-256-gcm') return data; const key = encryptionKey(); if (!key) throw new Error('Backup is encrypted but BACKUP_ENCRYPTION_KEY is not configured.'); const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(raw.iv, 'base64')); decipher.setAuthTag(Buffer.from(raw.tag, 'base64')); return Buffer.concat([decipher.update(Buffer.from(raw.data, 'base64')), decipher.final()]); }
function checksum(data: Buffer) { return crypto.createHash('sha256').update(data).digest('hex'); }

export async function createBackup(reason = 'manual'): Promise<BackupRecord | null> {
  if (backupInProgress) return null;
  backupInProgress = true;
  try {
    ensureBackupDir(); const createdAt = Date.now(); const payload = { format: 'real-estate-consultant-backup', version: 2, reason, createdAt, database: await collectDatabase(), botFiles: await collectBotFiles() }; const compressed = await gzip(Buffer.from(JSON.stringify(payload), 'utf8'), { level: 6 }); const output = encrypt(compressed); const encrypted = output !== compressed; const stamp = new Date(createdAt).toISOString().replace(/[:.]/g, '-'); const fileName = `backup-${stamp}-${reason}.json.gz${encrypted ? '.enc' : ''}`; const tempPath = path.join(BACKUP_DIR, `.${fileName}.tmp`); const finalPath = path.join(BACKUP_DIR, fileName); fs.writeFileSync(tempPath, output); fs.renameSync(tempPath, finalPath); return { fileName, createdAt, sizeBytes: output.byteLength, sha256: checksum(output), encrypted };
  } catch (error) { console.error('Backup creation failed:', error); return null; } finally { backupInProgress = false; }
}
export function listBackups(): BackupRecord[] { ensureBackupDir(); return fs.readdirSync(BACKUP_DIR).filter(name => /^backup-.*\.json\.gz(?:\.enc)?$/.test(name)).map(fileName => { const stat = fs.statSync(path.join(BACKUP_DIR, fileName)); const data = fs.readFileSync(path.join(BACKUP_DIR, fileName)); return { fileName, createdAt: stat.mtimeMs, sizeBytes: stat.size, sha256: checksum(data), encrypted: fileName.endsWith('.enc') }; }).sort((a, b) => b.createdAt - a.createdAt); }
export function getBackupPath(fileName: string): string | null { if (!/^backup-[A-Za-z0-9_.-]+\.json\.gz(?:\.enc)?$/.test(fileName)) return null; const full = path.resolve(BACKUP_DIR, fileName); if (path.dirname(full) !== path.resolve(BACKUP_DIR)) return null; return fs.existsSync(full) ? full : null; }
export async function verifyBackup(fileName: string) { const full = getBackupPath(fileName); if (!full) throw new Error('Backup not found'); const raw = fs.readFileSync(full); const decompressed = await gunzip(decrypt(raw)); const payload = JSON.parse(decompressed.toString('utf8')); if (payload?.format !== 'real-estate-consultant-backup') throw new Error('Invalid backup format'); return { fileName, sha256: checksum(raw), createdAt: payload.createdAt, version: payload.version, encrypted: fileName.endsWith('.enc') }; }
export function pruneBackups(retentionCount: number) { for (const backup of listBackups().slice(Math.max(1, retentionCount))) { try { fs.unlinkSync(path.join(BACKUP_DIR, backup.fileName)); } catch (error) { console.warn('Could not prune backup', backup.fileName, error); } } }
export async function runScheduledBackup() { const config = await getBackupConfig(); if (!config.enabled) return null; const result = await createBackup('scheduled'); lastScheduledBackupAt = Date.now(); pruneBackups(config.retentionCount); return result; }
export async function runExitBackup() { const config = await getBackupConfig(); if (!config.enabled || !config.backupOnExit) return null; const result = await createBackup('exit'); pruneBackups(config.retentionCount); return result; }
export async function startBackupScheduler() { stopBackupScheduler(); const config = await getBackupConfig(); if (!config.enabled) return; lastScheduledBackupAt = listBackups()[0]?.createdAt || 0; heartbeatTimer = setInterval(async () => { try { const current = await getBackupConfig(); if (current.enabled && Date.now() - lastScheduledBackupAt >= current.intervalMinutes * 60_000) await runScheduledBackup(); } catch (error) { console.warn('Backup scheduler heartbeat failed:', error); } }, 60_000); heartbeatTimer.unref?.(); if (listBackups().length === 0) void createBackup('startup'); }
export function stopBackupScheduler() { if (heartbeatTimer) clearInterval(heartbeatTimer); heartbeatTimer = null; }
export function backupDirectory() { ensureBackupDir(); return BACKUP_DIR; }
export function installBackupShutdownHooks() { const shutdown = async (signal: string) => { if (shutdownBackupStarted) return; shutdownBackupStarted = true; stopBackupScheduler(); try { const result = await runExitBackup(); if (result) console.log(`Backup created before ${signal}: ${result.fileName} sha256=${result.sha256}`); } finally { process.exit(0); } }; process.once('SIGINT', () => void shutdown('SIGINT')); process.once('SIGTERM', () => void shutdown('SIGTERM')); }
