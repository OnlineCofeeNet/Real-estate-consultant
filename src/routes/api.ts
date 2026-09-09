import { Router } from 'express';
import { db } from '../db/index.ts';
import { customers, contracts, invoices, payments, messageLogs, auditLogs, settings, users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const router = Router();

// Generic helper
const createCrudRoutes = (tableName: string, tableSchema: any) => {
  router.get(`/${tableName}`, async (req, res) => {
    try {
      const result = await db.select().from(tableSchema);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post(`/${tableName}`, async (req, res) => {
    try {
      const result = await db.insert(tableSchema).values(req.body).returning();
      res.json(result[0]?.id);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put(`/${tableName}/:id`, async (req, res) => {
    try {
      await db.update(tableSchema).set(req.body).where(eq(tableSchema.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete(`/${tableName}/:id`, async (req, res) => {
    try {
      await db.delete(tableSchema).where(eq(tableSchema.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
};

createCrudRoutes('customers', customers);
createCrudRoutes('contracts', contracts);
createCrudRoutes('invoices', invoices);
createCrudRoutes('payments', payments);
createCrudRoutes('messageLogs', messageLogs);
createCrudRoutes('auditLogs', auditLogs);
createCrudRoutes('users', users);

// Settings has a specific id=1 structure
router.get('/settings', async (req, res) => {
  try {
    const result = await db.select().from(settings).where(eq(settings.id, 1));
    if (result.length > 0) {
      res.json(result[0].data);
    } else {
      res.json(null);
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const result = await db.insert(settings).values({ id: 1, data: req.body })
      .onConflictDoUpdate({ target: settings.id, set: { data: req.body } })
      .returning();
    res.json(result[0]?.id);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/settings/1', async (req, res) => {
  try {
    await db.update(settings).set({ data: req.body }).where(eq(settings.id, 1));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


export default router;
