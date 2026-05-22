import Dexie, { type Table } from 'dexie';
import type {
  Attachment,
  ClinicalDocument,
  Connection,
  InstanceConfig,
  SummaryPagePreferences,
  User,
  UserPreferences,
} from '@mere/domain';

export interface AttachmentBlob {
  id: string;
  bytes: Uint8Array;
}

export class MereDb extends Dexie {
  users!: Table<User, string>;
  user_preferences!: Table<UserPreferences, string>;
  connections!: Table<Connection, string>;
  clinical_documents!: Table<ClinicalDocument, string>;
  attachments!: Table<Attachment, string>;
  attachment_blobs!: Table<AttachmentBlob, string>;
  instance_config!: Table<InstanceConfig, string>;
  summary_page_preferences!: Table<SummaryPagePreferences, string>;

  constructor(name = 'mere') {
    super(name);

    // Indexes mirror the queries we expect to port to Convex later.
    // Convention: primary key first, then secondary indexes.
    this.version(1).stores({
      users: 'id, updatedAt, isSelected, deletedAt',
      user_preferences: 'id, userId, updatedAt',
      connections: 'id, userId, source, updatedAt, deletedAt',
      clinical_documents:
        'id, userId, connectionId, resourceType, updatedAt, deletedAt, [userId+resourceType], [userId+connectionId]',
      attachments: 'id, ownerType, ownerId, updatedAt, [ownerType+ownerId]',
      attachment_blobs: 'id',
      instance_config: 'id, updatedAt',
      summary_page_preferences: 'id, userId, updatedAt',
    });
  }
}

let _db: MereDb | null = null;

export function getDb(name = 'mere'): MereDb {
  if (_db && _db.name === name) return _db;
  if (_db) {
    _db.close();
    _db = null;
  }
  _db = new MereDb(name);
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_db) {
    _db.close();
    _db = null;
  }
}
