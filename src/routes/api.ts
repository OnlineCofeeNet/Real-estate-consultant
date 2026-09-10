import { Router } from 'express';
import { db } from '../db/index.ts';
import { customers, contracts, invoices, payments, messageLogs, auditLogs, settings, users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const router = Router();

type TableSchema = typeof customers | typeof contracts | typeof invoices | typeof payments | typeof messageLogs | typeof auditLogs | typeof users;

type AuditInput = {
  action: string;
  entity: string;
  entityId?: string | number;
  description: string;
  before?: unknown;
  after?: unknown;
};

const safeError = (error: unknown) => {
  console.error(error);
  return { error: 'خطای داخلی سرور رخ داد.' };
};

const addAuditLog = async ({ action, entity, entityId, description, before, after }: AuditInput) => {
  try {
    await db.insert(auditLogs).values({
      action,
      entity,
      entityId: entityId == null ? undefined : String(entityId),
      description,
      before,
      after,
    });
  } catch (error) {
    // Audit failures must never turn a successful business operation into a 500.
    console.error('Audit Log Error:', error);
  }
};

const parseId = (raw: string): number | null => {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const createCrudRoutes = (tableName: string, tableSchema: TableSchema) => {
  router.get(`/${tableName}`, async (_req, res) => {
    try {
      const result = await db.select().from(tableSchema);
      res.json(result);
    } catch (error) {
      res.status(500).json(safeError(error));
    }
  });

  router.post(`/${tableName}`, async (req, res) => {
    try {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'بدنه درخواست نامعتبر است.' });
      }

      const result = await db.insert(tableSchema).values(req.body).returning();
      const created = result[0];
      await addAuditLog({
        action: 'create',
        entity: tableName,
        entityId: created?.id,
        description: `Created record ID: ${created?.id ?? 'unknown'}`,
        after: created,
      });
      return res.status(201).json(created?.id);
    } catch (error) {
      return res.status(500).json(safeError(error));
    }
  });

  router.put(`/${tableName}/:id`, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'شناسه نامعتبر است.' });
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'بدنه درخواست نامعتبر است.' });
    }

    try {
      const beforeResult = await db.select().from(tableSchema).where(eq(tableSchema.id, id));
      if (!beforeResult[0]) return res.status(404).json({ error: 'رکورد پیدا نشد.' });

      const result = await db.update(tableSchema).set(req.body).where(eq(tableSchema.id, id)).returning();
      const after = result[0];
      await addAuditLog({
        action: 'update',
        entity: tableName,
        entityId: id,
        description: `Updated record ID: ${id}`,
        before: beforeResult[0],
        after,
      });
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json(safeError(error));
    }
  });

  router.delete(`/${tableName}/:id`, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'شناسه نامعتبر است.' });

    try {
      const beforeResult = await db.select().from(tableSchema).where(eq(tableSchema.id, id));
      if (!beforeResult[0]) return res.status(404).json({ error: 'رکورد پیدا نشد.' });

      await db.delete(tableSchema).where(eq(tableSchema.id, id));
      await addAuditLog({
        action: 'delete',
        entity: tableName,
        entityId: id,
        description: `Deleted record ID: ${id}`,
        before: beforeResult[0],
      });
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json(safeError(error));
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

router.get('/settings', async (_req, res) => {
  try {
    const result = await db.select().from(settings).where(eq(settings.id, 1));
    return res.json(result[0]?.data ?? null);
  } catch (error) {
    return res.status(500).json(safeError(error));
  }
});

router.post('/settings', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'تنظیمات نامعتبر است.' });
    }
    const result = await db.insert(settings).values({ id: 1, data: req.body })
      .onConflictDoUpdate({ target: settings.id, set: { data: req.body } })
      .returning();
    await addAuditLog({ action: 'create/update', entity: 'settings', entityId: 1, description: 'Updated global settings', after: req.body });
    return res.json(result[0]?.id);
  } catch (error) {
    return res.status(500).json(safeError(error));
  }
});

router.put('/settings/1', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'تنظیمات نامعتبر است.' });
    }
    const before = await db.select().from(settings).where(eq(settings.id, 1));
    const result = await db.update(settings).set({ data: req.body }).where(eq(settings.id, 1)).returning();
    if (!result[0]) return res.status(404).json({ error: 'تنظیمات پیدا نشد.' });
    await addAuditLog({ action: 'update', entity: 'settings', entityId: 1, description: 'Updated global settings', before: before[0]?.data, after: req.body });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json(safeError(error));
  }
});

router.post('/contracts/complete', async (req, res) => {
  const { contract, invoice1, payment1, invoice2, payment2 } = req.body ?? {};

  if (!contract || typeof contract !== 'object') {
    return res.status(400).json({ error: 'اطلاعات قرارداد الزامی است.' });
  }
  if (!contract.contractNumber || typeof contract.contractNumber !== 'string' || !contract.contractNumber.trim()) {
    return res.status(400).json({ error: 'شماره قرارداد الزامی است.' });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Prevent accidental duplicate contract numbers when two clients submit concurrently.
      const existing = await tx.select({ id: contracts.id })
        .from(contracts)
        .where(eq(contracts.contractNumber, contract.contractNumber.trim()));
      if (existing.length > 0) {
        const duplicateError = new Error('DUPLICATE_CONTRACT_NUMBER');
        throw duplicateError;
      }

      const contractToInsert = { ...contract, contractNumber: contract.contractNumber.trim() };
      const contractResult = await tx.insert(contracts).values(contractToInsert).returning();
      const createdContract = contractResult[0];
      if (!createdContract?.id) throw new Error('Contract was not created');
      const contractId = createdContract.id;

      const resultData: {
        contractId: number;
        invoice1Id?: number;
        payment1Id?: number;
        invoice2Id?: number;
        payment2Id?: number;
      } = { contractId };

      const insertInvoiceAndPayment = async (invoice: any, payment: any, key: '1' | '2') => {
        if (!invoice) return;
        const invoiceToInsert = { ...invoice, contractId, contractNumber: contractToInsert.contractNumber };
        const invoiceResult = await tx.insert(invoices).values(invoiceToInsert).returning();
        const createdInvoice = invoiceResult[0];
        if (!createdInvoice?.id) throw new Error(`Invoice ${key} was not created`);
        resultData[`invoice${key}Id`] = createdInvoice.id;

        if (payment) {
          const paymentToInsert = { ...payment, invoiceId: createdInvoice.id, contractId };
          const paymentResult = await tx.insert(payments).values(paymentToInsert).returning();
          const createdPayment = paymentResult[0];
          if (!createdPayment?.id) throw new Error(`Payment ${key} was not created`);
          resultData[`payment${key}Id`] = createdPayment.id;
        }
      };

      await insertInvoiceAndPayment(invoice1, payment1, '1');
      await insertInvoiceAndPayment(invoice2, payment2, '2');

      return resultData;
    });

    await addAuditLog({
      action: 'create/complete',
      entity: 'contracts',
      entityId: result.contractId,
      description: `Completed contract ${contract.contractNumber}`,
      after: result,
    });

    return res.status(201).json(result);
  } catch (error: any) {
    if (error?.message === 'DUPLICATE_CONTRACT_NUMBER') {
      return res.status(409).json({ error: 'شماره قرارداد قبلاً ثبت شده است.' });
    }
    return res.status(500).json(safeError(error));
  }
});

export default router;
