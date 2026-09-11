import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { db } from '../db/index.ts';
import {
  users,
  customers,
  contracts,
  invoices,
  payments,
  messageLogs,
  auditLogs,
  settings,
  properties,
  areas,
  propertyImages,
  propertyMedia,
  propertyRequests,
  propertyShares,
} from '../db/schema.ts';

const gzip = promisify(zlib.gzip);
const DEFAULT_INTERVAL_MINUTES = 30;
const DEFAULT_RETENTION = 30;
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const BOT_FILES = ['bot-settings.json', 'bot-users.json'];

export interface BackupConfig {
  enabled: boolean;
  intervalMinutes: number;
  backupOnExit: boolean;
  retentionCount: number;
}

export interface BackupRecord {
  fileName: string;
  createdAt: number;
  sizeBytes: number;
}

const defaults: BackupConfig = {
  enabled: true,
  intervalMinutes: DEFAULT_INTERVAL_MINUTES,
  backupOnExit: true,
  retentionCount: DEFAULT_RETENTION,
};

let timer: NodeJS.Timeout | null = null;
let backupInProgress = false;

function ensureBackupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function normalizeConfig(raw: any): BackupConfig {
  return {
    enabled: raw?.enabled !== false,
    intervalMinutes: Math.max(1, Math.min(24 * 60, Number(raw?.intervalMinutes) || DEFAULT_INTERVAL_MINUTES)),
    backupOnExit: raw?.backupOnExit !== false,
    retentionCount: Math.max(1, Math.min(365, Number(raw?.retentionCount) || DEFAULT_RETENTION)),
  };
}

export async function getBackupConfig(): Promise<BackupConfig> {
  try {
    const rows = await db.select().from(settings);
    const data: any = rows[0]?.data || {};
    return normalizeConfig(data.backupSettings);
  } catch (error) {
    console.warn('Backup settings could not be loaded; defaults are used.', error);
    return defaults;
  }
}

async function collectDatabase() {
  const [usersRows, customersRows, contractsRows, invoicesRows, paymentsRows, messageLogsRows,
    auditLogsRows, settingsRows, propertiesRows, areasRows, propertyImagesRows, propertyMediaRows,
    propertyRequestsRows, propertySharesRows] = await Promise.all([
    db.select().from(users),
    db.select().from(customers),
    db.select().from(contracts),
    db.select().from(invoices),
    db.select().from(payments),
    db.select().from(messageLogs),
    db.select().from(auditLogs),
    db.select().from(settings),
    db.select().from(properties),
    db.select().from(areas),
    db.select().from(propertyImages),
    db.select().from(propertyMedia),
    db.select().from(propertyRequests),
    db.select().from(propertyShares),
  ]);

  return {
    users: usersRows,
    customers: customersRows,
    contracts: contractsRows,
    invoices: invoicesRows,
    payments: paymentsRows,
    messageLogs: messageLogsRows,
    auditLogs: auditLogsRows,
    settings: settingsRows,
    properties: propertiesRows,
    areas: areasRows,
    propertyImages: propertyImagesRows,
    propertyMedia: propertyMediaRows,
    propertyRequests: propertyRequestsRows,
    propertyShares: propertySharesRows,
  };
}

async function collectBotFiles() {
  const files: Record<string, unknown> = {};
  for (const name of BOT_FILES) {
    const filePath = path.join(process.cwd(), name);
    try {
      if (fs.existsSync(filePath)) files[name] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.warn(`Could not include ${name} in backup.`, error);
    }
  }
  return files;
}

export async function createBackup(reason = 'manual'): Promise<BackupRecord | null> {
  if (backupInProgress) return null;
  backupInProgress = true;
  try {
    ensureBackupDir();
    const createdAt = Date.now();
    const payload = {
      format: 'real-estate-consultant-backup',
      version: 1,
      reason,
      createdAt,
      database: await collectDatabase(),
      botFiles: await collectBotFiles(),
    };

    const compressed = await gzip(Buffer.from(JSON.stringify(payload), 'utf8'), { level: 6 });
    const stamp = new Date(createdAt).toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${stamp}-${reason}.json.gz`;
    const tempPath = path.join(BACKUP_DIR, `.${fileName}.tmp`);
    const finalPath = path.join(BACKUP_DIR, fileName);

    fs.writeFileSync(tempPath, compressed);
    fs.renameSync(tempPath, finalPath);
    return { fileName, createdAt, sizeBytes: compressed.byteLength };
  } catch (error) {
    console.error('Backup creation failed:', error);
    return null;
  } finally {
    backupInProgress = false;
  }
}

export function listBackups(): BackupRecord[] {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(name => /^backup-.*\.json\.gz$/.test(name))
    .map(fileName => {
      const stat = fs.statSync(path.join(BACKUP_DIR, fileName));
      return { fileName, createdAt: stat.mtimeMs, sizeBytes: stat.size };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getBackupPath(fileName: string): string | null {
  if (!/^backup-[A-Za-z0-9_.-]+\.json\.gz$/.test(fileName)) return null;
  const full = path.resolve(BACKUP_DIR, fileName);
  if (path.dirname(full) !== path.resolve(BACKUP_DIR)) return null;
  return fs.existsSync(full) ? full : null;
}

export function pruneBackups(retentionCount: number) {
  const backups = listBackups();
  for (const backup of backups.slice(Math.max(1, retentionCount))) {
    try { fs.unlinkSync(path.join(BACKUP_DIR, backup.fileName)); } catch (error) { console.warn('Could not prune backup', backup.fileName, error); }
  }
}

export async function runScheduledBackup() {
  const config = await getBackupConfig();
  if (!config.enabled) return null;
  const result = await createBackup('scheduled');
  pruneBackups(config.retentionCount);
  return result;
}

export async function runExitBackup() {
  const config = await getBackupConfig();
  if (!config.enabled || !config.backupOnExit) return null;
  const result = await createBackup('exit');
  pruneBackups(config.retentionCount);
  return result;
}

export async function startBackupScheduler() {
  if (timer) clearInterval(timer);
  const config = await getBackupConfig();
  if (!config.enabled) return;

  timer = setInterval(() => {
    void runScheduledBackup();
  }, config.intervalMinutes * 60_000);
  timer.unref?.();

  // Ensure there is at least one recent backup after startup.
  if (listBackups().length === 0) void createBackup('startup');
}

export function stopBackupScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

export function backupDirectory() {
  ensureBackupDir();
  return BACKUP_DIR;
}
