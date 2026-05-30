import { RxDatabase } from 'rxdb';

import { DatabaseCollections } from '../app/providers/DatabaseCollections';
import {
  WorkflowRecord,
  WorkflowRecordKind,
} from '../models/workflow-record/WorkflowRecord.type';
import { getRawDb, isDexieReposEnabled } from './dexie-bridge';

type WorkflowRecordInput<TPayload> = Omit<
  WorkflowRecord<TPayload>,
  'created_at' | 'updated_at'
> & {
  created_at?: string;
  updated_at?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function toDomain(record: WorkflowRecord) {
  return {
    id: record.id,
    userId: record.user_id,
    kind: record.kind,
    payload: record.payload,
    createdAt: Date.parse(record.created_at) || Date.now(),
    updatedAt: Date.parse(record.updated_at) || Date.now(),
  };
}

function toLegacy(record: {
  id: string;
  userId: string;
  kind: WorkflowRecordKind;
  payload: unknown;
  createdAt: number;
  updatedAt: number;
}): WorkflowRecord {
  return {
    id: record.id,
    user_id: record.userId,
    kind: record.kind,
    payload: record.payload,
    created_at: new Date(record.createdAt).toISOString(),
    updated_at: new Date(record.updatedAt).toISOString(),
  };
}

export async function listWorkflowRecords<TPayload = unknown>(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  kind: WorkflowRecordKind,
): Promise<Array<WorkflowRecord<TPayload>>> {
  if (isDexieReposEnabled()) {
    const rawDb = getRawDb();
    const rows = await rawDb.workflow_records
      .where('[userId+kind]' as never)
      .equals([userId, kind] as never)
      .toArray()
      .catch(async () => {
        const byUser = await rawDb.workflow_records
          .where('userId')
          .equals(userId)
          .toArray();
        return byUser.filter((row) => row.kind === kind);
      });
    return rows
      .map(toLegacy)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at)) as Array<
      WorkflowRecord<TPayload>
    >;
  }

  const docs = await db.workflow_records
    .find({
      selector: {
        user_id: userId,
        kind,
      },
      sort: [{ updated_at: 'desc' }],
    })
    .exec();
  return docs.map((doc) => doc.toMutableJSON() as WorkflowRecord<TPayload>);
}

export async function upsertWorkflowRecord<TPayload>(
  db: RxDatabase<DatabaseCollections>,
  input: WorkflowRecordInput<TPayload>,
): Promise<WorkflowRecord<TPayload>> {
  const timestamp = nowIso();
  const record: WorkflowRecord<TPayload> = {
    ...input,
    created_at: input.created_at || timestamp,
    updated_at: input.updated_at || timestamp,
  };

  if (isDexieReposEnabled()) {
    const rawDb = getRawDb();
    await rawDb.workflow_records.put(toDomain(record));
    return record;
  }

  const saved = await db.workflow_records.upsert(record);
  return saved.toMutableJSON() as WorkflowRecord<TPayload>;
}

export async function deleteWorkflowRecord(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  id: string,
): Promise<void> {
  if (isDexieReposEnabled()) {
    const rawDb = getRawDb();
    const record = await rawDb.workflow_records.get(id);
    if (record?.userId === userId) await rawDb.workflow_records.delete(id);
    return;
  }

  const doc = (await db.workflow_records.findByIds([id])).get(id);
  if (doc && doc.get('user_id') === userId) await doc.remove();
}

export async function replaceWorkflowRecords<TPayload>(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  kind: WorkflowRecordKind,
  records: Array<WorkflowRecordInput<TPayload>>,
): Promise<Array<WorkflowRecord<TPayload>>> {
  const existing = await listWorkflowRecords(db, userId, kind);
  await Promise.all(
    existing.map((record) => deleteWorkflowRecord(db, userId, record.id)),
  );
  return Promise.all(records.map((record) => upsertWorkflowRecord(db, record)));
}
