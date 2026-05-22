import { RxDatabase, RxDocument } from 'rxdb';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DatabaseCollections } from '../app/providers/DatabaseCollections';
import { ConnectionDocument } from '../models/connection-document/ConnectionDocument.type';
import {
  connectionPatchToDomain,
  connectionToDomain,
  connectionToLegacy,
  getDataClient,
  isDexieReposEnabled,
  liveRxObservable,
  wrapAsRxDocument,
  type RxDocumentLike,
} from './dexie-bridge';

function buildConnectionHandle(
  legacy: ConnectionDocument,
): RxDocumentLike<ConnectionDocument> {
  const client = getDataClient();
  return wrapAsRxDocument<ConnectionDocument>(legacy, {
    update: async (patch) => {
      const next = await client.connections.update(
        legacy.id,
        connectionPatchToDomain(patch),
      );
      return connectionToLegacy(next);
    },
    remove: async () => {
      await client.connections.delete(legacy.id);
    },
  });
}

export async function findConnectionById(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  connectionId: string,
): Promise<ConnectionDocument | null> {
  if (isDexieReposEnabled()) {
    const c = await getDataClient().connections.get(connectionId);
    if (!c) return null;
    if (c.userId !== userId) {
      throw new Error(
        `Access denied: Connection ${connectionId} belongs to different user`,
      );
    }
    return connectionToLegacy(c);
  }
  const doc = await db.connection_documents
    .findOne({ selector: { id: connectionId } })
    .exec();
  if (!doc) return null;
  if (doc.user_id !== userId) {
    throw new Error(
      `Access denied: Connection ${connectionId} belongs to different user`,
    );
  }
  return doc.toJSON();
}

export async function findConnectionByUrl(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  url: string | Location,
): Promise<ConnectionDocument | null> {
  if (isDexieReposEnabled()) {
    const target = typeof url === 'string' ? url : url.toString();
    const rows = await getDataClient().connections.list(userId);
    const hit = rows.find((r) => r.location === target);
    return hit ? connectionToLegacy(hit) : null;
  }
  const doc = await db.connection_documents
    .findOne({ selector: { location: url, user_id: userId } })
    .exec();
  return doc ? doc.toJSON() : null;
}

export async function findConnectionsByIds(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  ids: string[],
): Promise<ConnectionDocument[]> {
  if (isDexieReposEnabled()) {
    const rows = await getDataClient().connections.list(userId);
    const wanted = new Set(ids);
    return rows.filter((r) => wanted.has(r.id)).map(connectionToLegacy);
  }
  const docs = await db.connection_documents
    .find({ selector: { id: { $in: ids }, user_id: userId } })
    .exec();
  return docs.map((doc) => doc.toJSON());
}

export async function findAllConnections(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
): Promise<ConnectionDocument[]> {
  if (isDexieReposEnabled()) {
    const rows = await getDataClient().connections.list(userId);
    return rows.map(connectionToLegacy);
  }
  const docs = await db.connection_documents
    .find({ selector: { user_id: userId } })
    .exec();
  return docs.map((doc) => doc.toJSON());
}

export async function findConnectionWithDoc(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  connectionId: string,
): Promise<{
  connection: ConnectionDocument | null;
  rawConnection: RxDocument<ConnectionDocument> | null;
}> {
  if (isDexieReposEnabled()) {
    const c = await getDataClient().connections.get(connectionId);
    if (!c) return { connection: null, rawConnection: null };
    if (c.userId !== userId) {
      throw new Error(
        `Access denied: Connection ${connectionId} belongs to different user`,
      );
    }
    const legacy = connectionToLegacy(c);
    return {
      connection: legacy,
      rawConnection: buildConnectionHandle(
        legacy,
      ) as unknown as RxDocument<ConnectionDocument>,
    };
  }

  const rawConnection = await db.connection_documents
    .findOne({ selector: { id: connectionId } })
    .exec();

  if (!rawConnection) {
    return { connection: null, rawConnection: null };
  }

  if (rawConnection.user_id !== userId) {
    throw new Error(
      `Access denied: Connection ${connectionId} belongs to different user`,
    );
  }

  return {
    connection: rawConnection.toJSON(),
    rawConnection: rawConnection as RxDocument<ConnectionDocument>,
  };
}

export async function findConnectionsWithDocsByIds(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  ids: string[],
): Promise<
  Array<{
    connection: ConnectionDocument;
    rawConnection: RxDocument<ConnectionDocument>;
  }>
> {
  if (isDexieReposEnabled()) {
    const rows = await getDataClient().connections.list(userId);
    const wanted = new Set(ids);
    return rows
      .filter((r) => wanted.has(r.id))
      .map((r) => {
        const legacy = connectionToLegacy(r);
        return {
          connection: legacy,
          rawConnection: buildConnectionHandle(
            legacy,
          ) as unknown as RxDocument<ConnectionDocument>,
        };
      });
  }
  const docs = await db.connection_documents
    .find({ selector: { id: { $in: ids }, user_id: userId } })
    .exec();
  return docs.map((doc) => ({
    connection: doc.toJSON(),
    rawConnection: doc as RxDocument<ConnectionDocument>,
  }));
}

export function watchAllConnections(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
): Observable<RxDocument<ConnectionDocument>[]> {
  if (isDexieReposEnabled()) {
    return liveRxObservable(async () => {
      const rows = await getDataClient().connections.list(userId);
      return rows.map(
        (r) =>
          buildConnectionHandle(
            connectionToLegacy(r),
          ) as unknown as RxDocument<ConnectionDocument>,
      );
    });
  }
  return db.connection_documents
    .find({ selector: { user_id: userId } })
    .$.pipe(map((docs) => docs as RxDocument<ConnectionDocument>[]));
}

export function watchConnectionCount(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
): Observable<number> {
  if (isDexieReposEnabled()) {
    return liveRxObservable(async () => {
      const rows = await getDataClient().connections.list(userId);
      return rows.length;
    });
  }
  return db.connection_documents
    .find({ selector: { user_id: userId } })
    .$.pipe(map((docs) => docs.length));
}

export async function createConnection(
  db: RxDatabase<DatabaseCollections>,
  connectionData: ConnectionDocument,
): Promise<RxDocument<ConnectionDocument>> {
  if (!connectionData.user_id) {
    throw new Error('Cannot create connection without user_id');
  }
  if (isDexieReposEnabled()) {
    const domain = connectionToDomain(connectionData);
    const created = await getDataClient().connections.create({
      ...domain,
      deletedAt: undefined,
    });
    const legacy = connectionToLegacy(created);
    return buildConnectionHandle(
      legacy,
    ) as unknown as RxDocument<ConnectionDocument>;
  }
  const doc = await db.connection_documents.insert(connectionData);
  return doc as RxDocument<ConnectionDocument>;
}

export async function updateConnection(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  connectionId: string,
  updates: Partial<ConnectionDocument>,
): Promise<void> {
  if (isDexieReposEnabled()) {
    const c = await getDataClient().connections.get(connectionId);
    if (!c) throw new Error(`Connection not found: ${connectionId}`);
    if (c.userId !== userId) {
      throw new Error(
        `Access denied: Connection ${connectionId} belongs to different user`,
      );
    }
    await getDataClient().connections.update(
      connectionId,
      connectionPatchToDomain(updates),
    );
    return;
  }
  const doc = await db.connection_documents
    .findOne({ selector: { id: connectionId } })
    .exec();
  if (!doc) {
    throw new Error(`Connection not found: ${connectionId}`);
  }
  if (doc.user_id !== userId) {
    throw new Error(
      `Access denied: Connection ${connectionId} belongs to different user`,
    );
  }
  await doc.update({ $set: updates });
}

export async function updateConnectionToken(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  connectionId: string,
  tokenData: {
    access_token: string;
    expires_at?: number;
    expires_in?: number;
    scope?: string;
    refresh_token?: string;
    id_token?: string;
  },
): Promise<void> {
  if (isDexieReposEnabled()) {
    const c = await getDataClient().connections.get(connectionId);
    if (!c) throw new Error(`Connection not found: ${connectionId}`);
    if (c.userId !== userId) {
      throw new Error(
        `Access denied: Connection ${connectionId} belongs to different user`,
      );
    }
    const patch: Partial<ConnectionDocument> = {
      access_token: tokenData.access_token,
      scope: tokenData.scope,
      refresh_token: tokenData.refresh_token,
      id_token: tokenData.id_token,
    };
    if (tokenData.expires_at !== undefined)
      patch.expires_at = tokenData.expires_at;
    else if (tokenData.expires_in !== undefined) {
      patch.expires_at = Math.floor(Date.now() / 1000) + tokenData.expires_in;
    }
    await getDataClient().connections.update(
      connectionId,
      connectionPatchToDomain(patch),
    );
    return;
  }
  const doc = await db.connection_documents
    .findOne({ selector: { id: connectionId } })
    .exec();
  if (!doc) {
    throw new Error(`Connection not found: ${connectionId}`);
  }
  if (doc.user_id !== userId) {
    throw new Error(
      `Access denied: Connection ${connectionId} belongs to different user`,
    );
  }
  await doc.update({ $set: tokenData });
}

export async function updateConnectionTimestamp(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  connectionId: string,
  timestampData: {
    last_refreshed?: string;
    last_sync_attempt?: string;
    last_sync_was_error?: boolean;
  },
): Promise<void> {
  if (isDexieReposEnabled()) {
    const c = await getDataClient().connections.get(connectionId);
    if (!c) throw new Error(`Connection not found: ${connectionId}`);
    if (c.userId !== userId) {
      throw new Error(
        `Access denied: Connection ${connectionId} belongs to different user`,
      );
    }
    await getDataClient().connections.update(
      connectionId,
      connectionPatchToDomain(timestampData as Partial<ConnectionDocument>),
    );
    return;
  }
  const doc = await db.connection_documents
    .findOne({ selector: { id: connectionId } })
    .exec();
  if (!doc) {
    throw new Error(`Connection not found: ${connectionId}`);
  }
  if (doc.user_id !== userId) {
    throw new Error(
      `Access denied: Connection ${connectionId} belongs to different user`,
    );
  }
  await doc.update({ $set: timestampData });
}

export async function upsertConnection(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  connectionData: ConnectionDocument,
): Promise<void> {
  if (connectionData.user_id !== userId) {
    throw new Error('Cannot upsert connection for different user');
  }
  if (isDexieReposEnabled()) {
    const client = getDataClient();
    const existing = await client.connections.get(connectionData.id);
    const domain = connectionToDomain(connectionData);
    if (existing) {
      const { id: _id, userId: _uid, ...patch } = domain;
      await client.connections.update(connectionData.id, patch);
    } else {
      await client.connections.create(domain);
    }
    return;
  }
  await db.connection_documents.upsert(connectionData);
}

export async function deleteConnection(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  connectionId: string,
): Promise<void> {
  if (isDexieReposEnabled()) {
    const c = await getDataClient().connections.get(connectionId);
    if (!c || c.userId !== userId) return;
    await getDataClient().connections.delete(connectionId);
    return;
  }
  const doc = await db.connection_documents
    .findOne({ selector: { id: connectionId } })
    .exec();
  if (!doc || doc.user_id !== userId) {
    return;
  }
  await doc.remove();
}
