import { RxDatabase } from 'rxdb';
import { DatabaseCollections } from '../app/providers/DatabaseCollections';
import { getDataClient, isDexieReposEnabled } from './dexie-bridge';

export async function deleteDocumentsByConnectionId(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  connectionId: string,
): Promise<void> {
  if (isDexieReposEnabled()) {
    const client = getDataClient();
    const docs = await client.clinicalDocuments.query({
      userId,
      connectionId,
    });
    await Promise.all(docs.map((d) => client.clinicalDocuments.delete(d.id)));
    return;
  }
  await db.clinical_documents
    .find({
      selector: {
        user_id: userId,
        connection_record_id: connectionId,
      },
    })
    .remove();
}
