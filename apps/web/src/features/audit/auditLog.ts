import { RxDatabase } from 'rxdb';

import { DatabaseCollections } from '../../app/providers/DatabaseCollections';
import {
  listWorkflowRecords,
  upsertWorkflowRecord,
} from '../../repositories/WorkflowRecordRepository';

export type AuditAction =
  | 'record.create'
  | 'record.update'
  | 'record.import'
  | 'record.export'
  | 'record.share'
  | 'sync.complete'
  | 'ai.access';

export type AuditLogEntry = {
  id: string;
  userId: string;
  action: AuditAction;
  occurredAt: string;
  actor: string;
  targetId?: string;
  targetType?: string;
  source?: string;
  summary: string;
};

const STORAGE_PREFIX = 'mere:audit-log:';

function getLegacyAuditLog(userId: string): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendAuditLog(
  db: RxDatabase<DatabaseCollections>,
  entry: Omit<AuditLogEntry, 'id' | 'occurredAt'> & {
    id?: string;
    occurredAt?: string;
  },
) {
  const next: AuditLogEntry = {
    id: entry.id || crypto.randomUUID(),
    occurredAt: entry.occurredAt || new Date().toISOString(),
    ...entry,
  };
  await upsertWorkflowRecord(db, {
    id: next.id,
    user_id: next.userId,
    kind: 'audit-log-entry',
    payload: next,
    created_at: next.occurredAt,
  });
  return next;
}

export async function getAuditLog(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
): Promise<AuditLogEntry[]> {
  const records = await listWorkflowRecords<AuditLogEntry>(
    db,
    userId,
    'audit-log-entry',
  );
  if (records.length > 0) return records.map((record) => record.payload);

  const legacyEntries = getLegacyAuditLog(userId);
  if (legacyEntries.length > 0) {
    await Promise.all(
      legacyEntries.map((entry) =>
        upsertWorkflowRecord(db, {
          id: entry.id,
          user_id: userId,
          kind: 'audit-log-entry',
          payload: entry,
          created_at: entry.occurredAt,
        }),
      ),
    );
    localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
  }
  return legacyEntries;
}
