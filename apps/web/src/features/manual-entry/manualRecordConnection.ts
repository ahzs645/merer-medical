import uuid4 from '../../shared/utils/UUIDUtils';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import {
  findConnectionByUrl,
  upsertConnection,
} from '../../repositories/ConnectionRepository';
import { MANUAL_CONNECTION_LOCATION } from './manualRecordTypes';

export async function getManualConnection(
  db: Parameters<typeof findConnectionByUrl>[0],
  userId: string,
): Promise<ConnectionDocument> {
  const existing = await findConnectionByUrl(
    db,
    userId,
    MANUAL_CONNECTION_LOCATION,
  );
  if (existing) return existing;

  const connection: ConnectionDocument = {
    id: uuid4(),
    user_id: userId,
    access_token: '',
    expires_at: 0,
    source: 'manual',
    name: 'Manual entry',
    location: MANUAL_CONNECTION_LOCATION,
    last_refreshed: new Date().toISOString(),
    last_sync_attempt: new Date().toISOString(),
    last_sync_was_error: false,
  };
  await upsertConnection(db, userId, connection);
  return connection;
}
