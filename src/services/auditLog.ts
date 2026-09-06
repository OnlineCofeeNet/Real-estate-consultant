import { db } from '../db/db';
import type { AuditLog, AuditAction, AuditEntity } from '../types';

export interface WriteAuditLogInput {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | number;
  description: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Centralized audit trail writer.
 * Keep business actions independent from the UI so future API/cloud sync
 * can consume the same audit events.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  const entry: AuditLog = {
    ...input,
    entityId: input.entityId == null ? undefined : String(input.entityId),
    createdAt: Date.now(),
  };

  await db.auditLogs.add(entry);
}

export async function clearAuditLogs(): Promise<void> {
  await db.auditLogs.clear();
}
