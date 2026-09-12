import { Router } from 'express';
import { checkDatabaseHealth } from '../db/index.ts';

const router = Router();

router.get('/health', async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const healthy = dbHealth.ok;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    service: 'real-estate-consultant',
    timestamp: new Date().toISOString(),
    database: dbHealth,
  });
});

export default router;
