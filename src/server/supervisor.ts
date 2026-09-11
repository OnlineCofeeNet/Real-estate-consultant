import { spawn } from 'child_process';
import path from 'path';
import { createBackup, getBackupConfig, pruneBackups, stopBackupScheduler, startBackupScheduler } from './backup.ts';

const isProduction = process.env.NODE_ENV === 'production';
const serverCommand = isProduction ? process.execPath : process.execPath;
const serverArgs = isProduction
  ? [path.join(process.cwd(), 'dist/server.cjs')]
  : [path.join(process.cwd(), 'node_modules/tsx/dist/cli.mjs'), path.join(process.cwd(), 'server.ts')];

let shuttingDown = false;
const child = spawn(serverCommand, serverArgs, {
  stdio: 'inherit',
  env: process.env,
});

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
  } catch (error) {
    console.error('Shutdown backup failed:', error);
  } finally {
    if (!child.killed) child.kill('SIGTERM');
    setTimeout(() => process.exit(exitCode), 1500).unref();
  }
}

process.on('SIGINT', () => void shutdown('sigint'));
process.on('SIGTERM', () => void shutdown('sigterm'));

child.on('error', (error) => {
  console.error('Application process failed to start:', error);
  void shutdown('spawn-error', 1);
});

child.on('exit', (code, signal) => {
  if (shuttingDown) return;
  const reason = signal ? `server-${signal.toLowerCase()}` : `server-exit-${code ?? 1}`;
  void shutdown(reason, code && code !== 0 ? code : 0);
});
