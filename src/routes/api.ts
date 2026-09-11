import { Router } from 'express';
import mediaRouter from './media.ts';
import matchingRouter from './matching.ts';
import backupRouter from './backup.ts';
import { db } from '../db/index.ts';
import {
  customers,
  contracts,
  invoices,
  payments,
  messageLogs,
  auditLogs,
  settings,
  users,
  properties,
  areas,
  propertyImages,
  propertyMedia,
} from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const router = Router();

const addAuditLog = async (action: string, entity: string, details: string, user: string = 'System') => {
  try {
    await db.insert(auditLogs).values({
      createdAt: Date.now(),
      action,
      entity,
      description: details,
      entityId: user
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
createCrudRoutes('properties', properties);
createCrudRoutes('areas', areas);
createCrudRoutes('propertyImages', propertyImages);
createCrudRoutes('propertyMedia', propertyMedia);

router.post('/users/recover-sms', async (req, res) => {
  const { username, phone } = req.body;
  try {
    const result = await db.select().from(users).where(eq(users.username, username));
    const user = result[0];
    if (!user) {
      return res.status(404).json({ error: 'کاربری با این مشخصات یافت نشد' });
    }
    if (user.phone !== phone) {
      return res.status(400).json({ error: 'شماره موبایل وارد شده با اطلاعات حساب مطابقت ندارد' });
    }

    const newPassword = Math.floor(10000000 + Math.random() * 90000000).toString();
    const crypto = require('crypto');
    const keyMaterial = await crypto.webcrypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(newPassword),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const saltBuffer = Buffer.from(user.salt, 'base64');
    const bits = await crypto.webcrypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: saltBuffer, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    const newPasswordHash = Buffer.from(bits).toString('base64');

    await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, user.id));

    const messageText = `رمز عبور جدید شما برای سامانه املاک:\nنام کاربری: ${username}\nرمز عبور: ${newPassword}`;

    try {
      await fetch('http://localhost:3000/api/bot/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: messageText, customerName: user.username })
      });
    } catch (e) {
      console.error('Failed to send SMS to bot API internally', e);
    }

    res.json({ success: true, message: 'رمز عبور جدید به شماره موبایل شما ارسال شد.' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/users/login-fetch', async (req, res) => {
  const { username } = req.body;
  try {
    const result = await db.select().from(users).where(eq(users.username, username));
    res.json(result[0] || null);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const result = await db.select().from(users);
    const safeUsers = result.map(u => ({
      ...u,
      passwordHash: undefined,
      salt: undefined,
      securityAnswer1Hash: undefined,
      securityAnswer2Hash: undefined
    }));
    res.json(safeUsers);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

createCrudRoutes('users', users);

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
      const contractResult = await tx.insert(contracts).values(contract).returning();
      const contractId = contractResult[0]?.id;

      let resData: any = { contractId };

      if (invoice1) {
        invoice1.contractId = contractId;
        const inv1Result = await tx.insert(invoices).values(invoice1).returning();
        const inv1Id = inv1Result[0]?.id;
        resData.invoice1Id = inv1Id;

        if (payment1) {
          payment1.invoiceId = inv1Id;
          const pay1Result = await tx.insert(payments).values(payment1).returning();
          resData.payment1Id = pay1Result[0]?.id;
        }
      }

      if (invoice2) {
        invoice2.contractId = contractId;
        const inv2Result = await tx.insert(invoices).values(invoice2).returning();
        const inv2Id = inv2Result[0]?.id;
        resData.invoice2Id = inv2Id;

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

router.delete('/contracts/:id/cascade', async (req, res) => {
  const contractId = parseInt(req.params.id);
  try {
    await db.transaction(async (tx) => {
      await tx.delete(payments).where(eq(payments.contractId, contractId));
      await tx.delete(invoices).where(eq(invoices.contractId, contractId));
      await tx.delete(contracts).where(eq(contracts.id, contractId));
    });
    await addAuditLog('delete', 'contracts', `Cascade deleted contract ID: ${contractId}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.use('/media', mediaRouter);
router.use('/matching', matchingRouter);
router.use('/backup', backupRouter);

export default router;
