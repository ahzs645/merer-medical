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

/**
 * Each action in the reader's words. The page used to print the code itself —
 * "record.export · local-user" under every entry — which is the record's
 * internal name for the event, not a description of it.
 */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  'record.create': 'Record added',
  'record.update': 'Record edited',
  'record.import': 'Records imported',
  'record.export': 'Records exported',
  'record.share': 'Records shared',
  'sync.complete': 'Sync',
  'ai.access': 'AI access',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action as AuditAction] || action;
}

/** Likewise for the actor: every entry so far is written by the person here. */
export function auditActorLabel(actor: string): string {
  return actor === 'local-user' ? 'On this device' : actor;
}

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

/**
 * Records an event from somewhere that has a database but no `user` in hand —
 * the `.emrpkg` service, the sync provider — and must not fail the thing it is
 * describing if the write goes wrong.
 *
 * The profile is resolved at write time rather than passed in, because the
 * caller with the most reason to log (an import that replaces everything) is
 * also the one that changes which profile is selected while it runs.
 */
export async function recordAuditEvent(
  db: RxDatabase<DatabaseCollections>,
  entry: Omit<AuditLogEntry, 'id' | 'occurredAt' | 'userId'> & {
    userId?: string;
  },
): Promise<AuditLogEntry | undefined> {
  try {
    let userId = entry.userId;
    if (!userId) {
      const selected = await db.user_documents
        .findOne({ selector: { is_selected_user: true } })
        .exec();
      userId = selected?.get('id') as string | undefined;
    }
    if (!userId) return undefined;
    return await appendAuditLog(db, { ...entry, userId });
  } catch (err) {
    // An audit entry is a description of something that already happened.
    // Losing the description must not undo the thing.
    console.warn('[audit] could not record event', err);
    return undefined;
  }
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
