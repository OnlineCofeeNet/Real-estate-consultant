import { Router } from 'express';
import { db } from '../db/index.ts';
import { customers, contracts, invoices, payments, messageLogs, auditLogs, settings, users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const router = Router();

// Generic helper

const addAuditLog = async (action: string, entity: string, details: string, user: string = 'System') => {
  try {
    await db.insert(auditLogs).values({
      date: Date.now(),
      action,
      entity,
      user,
      details
    });
  } catch(e) {
    console.error('Audit Log Error:', e);
  }
};

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
      await addAuditLog('create', tableName, `Created record ID: ${result[0]?.id}`);
      res.json(result[0]?.id);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put(`/${tableName}/:id`, async (req, res) => {
    try {
      await db.update(tableSchema).set(req.body).where(eq(tableSchema.id, parseInt(req.params.id)));
      await addAuditLog('update', tableName, `Updated record ID: ${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete(`/${tableName}/:id`, async (req, res) => {
    try {
      await db.delete(tableSchema).where(eq(tableSchema.id, parseInt(req.params.id)));
      await addAuditLog('delete', tableName, `Deleted record ID: ${req.params.id}`);
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
    await addAuditLog('create/update', 'settings', 'Updated global settings');
    res.json(result[0]?.id);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/settings/1', async (req, res) => {
  try {
    await db.update(settings).set({ data: req.body }).where(eq(settings.id, 1));
    await addAuditLog('update', 'settings', 'Updated global settings');
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});



router.post('/contracts/complete', async (req, res) => {
  const { contract, invoice1, payment1, invoice2, payment2 } = req.body;
  
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Insert contract
      const contractResult = await tx.insert(contracts).values(contract).returning();
      const contractId = contractResult[0]?.id;
      
      let resData = { contractId };
      
      // 2. Insert Invoice 1
      if (invoice1) {
        invoice1.contractId = contractId;
        const inv1Result = await tx.insert(invoices).values(invoice1).returning();
        const inv1Id = inv1Result[0]?.id;
        resData.invoice1Id = inv1Id;
        
        // 3. Insert Payment 1
        if (payment1) {
          payment1.invoiceId = inv1Id;
          const pay1Result = await tx.insert(payments).values(payment1).returning();
          resData.payment1Id = pay1Result[0]?.id;
        }
      }
      
      // 4. Insert Invoice 2
      if (invoice2) {
        invoice2.contractId = contractId;
        const inv2Result = await tx.insert(invoices).values(invoice2).returning();
        const inv2Id = inv2Result[0]?.id;
        resData.invoice2Id = inv2Id;
        
        // 5. Insert Payment 2
        if (payment2) {
          payment2.invoiceId = inv2Id;
          const pay2Result = await tx.insert(payments).values(payment2).returning();
          resData.payment2Id = pay2Result[0]?.id;
        }
      }
      
      return resData;
    });
    
    res.json(result);
  } catch (e: any) {
    console.error('Transaction failed:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
