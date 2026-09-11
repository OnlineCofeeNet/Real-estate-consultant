import { db } from '../db/db';

const BACKUP_DB = 'real-estate-consultant-backups';
const BACKUP_STORE = 'snapshots';
const BACKUP_KEY = 'latest';
let timer: ReturnType<typeof setInterval> | null = null;
const TABLES = [['customers', db.customers], ['contracts', db.contracts], ['settings', db.settings], ['messageLogs', db.messageLogs], ['auditLogs', db.auditLogs], ['invoices', db.invoices], ['payments', db.payments], ['users', db.users], ['properties', db.properties], ['areas', db.areas]] as const;

const openBackupDb = () => new Promise<IDBDatabase>((resolve, reject) => { const req = indexedDB.open(BACKUP_DB, 1); req.onupgradeneeded = () => { const d = req.result; if (!d.objectStoreNames.contains(BACKUP_STORE)) d.createObjectStore(BACKUP_STORE); }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
const putSnapshot = async (data: unknown) => { const d = await openBackupDb(); await new Promise<void>((resolve, reject) => { const tx = d.transaction(BACKUP_STORE, 'readwrite'); tx.objectStore(BACKUP_STORE).put(data, BACKUP_KEY); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); d.close(); };
const getSnapshot = async () => { const d = await openBackupDb(); const value = await new Promise<any>((resolve, reject) => { const tx = d.transaction(BACKUP_STORE, 'readonly'); const req = tx.objectStore(BACKUP_STORE).get(BACKUP_KEY); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); d.close(); return value; };

export const createBackupData = async () => { const data: Record<string, unknown> = {}; for (const [name, table] of TABLES) data[name] = await table.toArray(); return { format: 'real-estate-consultant-browser-backup', version: 3, createdAt: Date.now(), data }; };
export const restoreFromBackupData = async (payload: any) => { if (!payload?.data || typeof payload.data !== 'object') throw new Error('نسخه پشتیبان نامعتبر است'); for (const [name, table] of TABLES) { const rows = payload.data[name]; if (!Array.isArray(rows)) continue; await table.clear(); if (rows.length) await table.bulkAdd(rows as any); } };
export const doAutoBackup = async () => { try { await putSnapshot(await createBackupData()); } catch (e) { console.warn('Browser auto-backup failed', e); } };
export const checkAndRestoreAutoBackup = async () => { try { const snapshot: any = await getSnapshot(); if (!snapshot?.data) return; const counts = await Promise.all(TABLES.map(([, table]) => table.count())); if (counts.every(c => c === 0)) await restoreFromBackupData(snapshot); } catch (e) { console.warn('Browser backup recovery check failed', e); } };
export const startAutoBackupScheduler = () => { if (timer) clearInterval(timer); const tick = async () => { try { const settings: any = await db.settings.get(1); const cfg = settings?.backupSettings || {}; if (cfg.enabled === false) return; const minutes = Math.max(1, Math.min(1440, Number(cfg.intervalMinutes) || 30)); await doAutoBackup(); if (timer) { clearInterval(timer); timer = setInterval(tick, minutes * 60000); } } catch (e) { console.warn('Auto-backup scheduler failed', e); } }; void tick(); };
export const stopAutoBackupScheduler = () => { if (timer) clearInterval(timer); timer = null; };
