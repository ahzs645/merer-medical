import { RxDatabase } from 'rxdb';

import { DatabaseCollections } from '../../app/providers/DatabaseCollections';
import {
  auditActionLabel,
  auditActorLabel,
  recordAuditEvent,
} from './auditLog';

/**
 * A fake standing in for the two things `recordAuditEvent` touches: the
 * selected-profile lookup and the workflow-record upsert underneath
 * `appendAuditLog`.
 */
function fakeDb(
  options: {
    selectedUserId?: string;
    onUpsert?: (doc: Record<string, unknown>) => void;
    throwOnUpsert?: boolean;
    throwOnFind?: boolean;
  } = {},
) {
  return {
    user_documents: {
      findOne: () => ({
        exec: async () => {
          if (options.throwOnFind) throw new Error('database is gone');
          return options.selectedUserId
            ? {
                get: (key: string) =>
                  key === 'id' ? options.selectedUserId : undefined,
              }
            : null;
        },
      }),
    },
    workflow_records: {
      findOne: () => ({ exec: async () => null }),
      upsert: async (doc: Record<string, unknown>) => {
        if (options.throwOnUpsert) throw new Error('write failed');
        options.onUpsert?.(doc);
        // The repository reads the saved document back through RxDB's
        // `toMutableJSON()`, so the fake has to answer to that too.
        return { toMutableJSON: () => doc };
      },
    },
  } as unknown as RxDatabase<DatabaseCollections>;
}

/**
 * The audit page promised "Imports, edits, exports, shares, AI access, and
 * sync events" while three of those seven actions had no writer at all: an
 * import that replaced the whole database, or a sync that pulled in hundreds
 * of records, left the page reading "No audit events yet". The writers that
 * were missing sit in places with a database but no `user` in hand — the
 * `.emrpkg` service and the sync provider — which is what this helper is for.
 */
describe('recordAuditEvent', () => {
  it('files the entry under whichever profile is selected', async () => {
    const written: Record<string, unknown>[] = [];
    const entry = await recordAuditEvent(
      fakeDb({
        selectedUserId: 'user-1',
        onUpsert: (doc) => written.push(doc),
      }),
      {
        action: 'record.import',
        actor: 'local-user',
        summary: 'Imported 12 rows from a record package',
      },
    );

    expect(entry?.userId).toBe('user-1');
    expect(written).toHaveLength(1);
    expect(written[0]['user_id']).toBe('user-1');
    expect(written[0]['kind']).toBe('audit-log-entry');
  });

  it('prefers a profile the caller already knows', async () => {
    const entry = await recordAuditEvent(
      fakeDb({ selectedUserId: 'selected' }),
      {
        userId: 'passed-in',
        action: 'sync.complete',
        actor: 'local-user',
        summary: 'Synced 3 sources',
      },
    );

    expect(entry?.userId).toBe('passed-in');
  });

  it('writes nothing when no profile is selected', async () => {
    const written: Record<string, unknown>[] = [];
    const entry = await recordAuditEvent(
      fakeDb({ onUpsert: (doc) => written.push(doc) }),
      { action: 'record.import', actor: 'local-user', summary: 'Imported' },
    );

    expect(entry).toBeUndefined();
    expect(written).toHaveLength(0);
  });

  it('never fails the thing it is describing', async () => {
    // An audit entry is a description of something that already happened, so a
    // failed write must not take the import or the sync down with it.
    await expect(
      recordAuditEvent(
        fakeDb({ selectedUserId: 'user-1', throwOnUpsert: true }),
        {
          action: 'record.export',
          actor: 'local-user',
          summary: 'Exported health summary',
        },
      ),
    ).resolves.toBeUndefined();

    await expect(
      recordAuditEvent(fakeDb({ throwOnFind: true }), {
        action: 'record.export',
        actor: 'local-user',
        summary: 'Exported health summary',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('audit labels', () => {
  it('reads as English rather than as the stored code', () => {
    // The page printed "record.export · local-user".
    expect(auditActionLabel('record.export')).toBe('Records exported');
    expect(auditActionLabel('sync.complete')).toBe('Sync');
    expect(auditActorLabel('local-user')).toBe('On this device');
  });

  it('passes an action it does not know through unchanged', () => {
    expect(auditActionLabel('something.new')).toBe('something.new');
    expect(auditActorLabel('Dr Bora')).toBe('Dr Bora');
  });
});
