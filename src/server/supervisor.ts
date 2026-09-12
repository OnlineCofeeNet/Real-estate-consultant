import { spawn } from 'child_process';
import path from 'path';
import { createBackup, getBackupConfig, pruneBackups, stopBackupScheduler, startBackupScheduler } from './backup.ts';
import { checkDatabaseHealth } from '../db/index.ts';

const isProduction = process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start';
const serverCommand = process.execPath;
const serverArgs = isProduction
  ? [path.join(process.cwd(), 'dist/server.cjs')]
  : [path.join(process.cwd(), 'node_modules/tsx/dist/cli.mjs'), path.join(process.cwd(), 'server.ts')];

const guardModule = isProduction
  ? path.join(process.cwd(), 'dist/server-api-guard.mjs')
  : path.join(process.cwd(), 'src/server/api-guard.mjs');

const env = { ...process.env };
const existingNodeOptions = env.NODE_OPTIONS ? `${env.NODE_OPTIONS} ` : '';
env.NODE_OPTIONS = `${existingNodeOptions}--import=${guardModule}`;
env.PORT = env.PORT || '3000';
env.HOST = env.HOST || '0.0.0.0';

let shuttingDown = false;

async function start() {
  const health = await checkDatabaseHealth();
  if (!health.ok && process.env.DB_MOCK !== 'true') {
    console.error(`PostgreSQL health check failed (${health.latencyMs}ms): ${health.error || 'unknown error'}`);
    process.exit(1);
  }
  if (health.mode === 'mock') console.warn('[DEV ONLY] Starting with DB_MOCK=true; no database changes will persist.');

  const child = spawn(serverCommand, serverArgs, { stdio: 'inherit', env });
  void startBackupScheduler();

  async function shutdown(reason: string, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    stopBackupScheduler();
    try {
      const config = await getBackupConfig();
      if (config.enabled && config.backupOnExit) {
        const result = await createBackup(`exit-${reason}`);
        pruneBackups(config.retentionCount);
        if (result) console.log(`Backup created before shutdown: ${result.fileName}`);
      }
    } catch (error) { console.error('Shutdown backup failed:', error); }
    finally {
      if (!child.killed) child.kill('SIGTERM');
      setTimeout(() => process.exit(exitCode), 1500).unref();
    }
  }

  process.on('SIGINT', () => void shutdown('sigint'));
  process.on('SIGTERM', () => void shutdown('sigterm'));
  child.on('error', (error) => { console.error('Application process failed to start:', error); void shutdown('spawn-error', 1); });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `server-${signal.toLowerCase()}` : `server-exit-${code ?? 1}`;
    void shutdown(reason, code && code !== 0 ? code : 0);
  });
}

void start().catch((error) => {
  console.error('Supervisor startup failed:', error);
  process.exit(1);
});
