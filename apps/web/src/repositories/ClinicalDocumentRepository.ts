import { RxDatabase } from 'rxdb';
import { DatabaseCollections } from '../app/providers/DatabaseCollections';
import {
  clinicalDocumentId,
  clinicalDocumentToDomain,
  clinicalDocumentToLegacy,
  getDataClient,
  isDexieReposEnabled,
} from './dexie-bridge';
import {
  ClinicalDocument,
  ClinicalDocumentResourceType,
} from '../models/clinical-document/ClinicalDocument.type';

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

export async function upsertClinicalDocuments(
  db: RxDatabase<DatabaseCollections>,
  docs: ClinicalDocument[],
): Promise<ClinicalDocument[]> {
  if (isDexieReposEnabled()) {
    const prepared = docs.map((doc) => ({
      ...doc,
      id: doc.id || clinicalDocumentId(doc),
    }));
    const saved = await getDataClient().clinicalDocuments.upsertBatch(
      prepared.map(clinicalDocumentToDomain),
    );
    return saved.map(clinicalDocumentToLegacy);
  }
  const saved = await db.clinical_documents.bulkUpsert(docs);
  return saved.map((doc) => doc.toJSON() as ClinicalDocument);
}

export async function insertClinicalDocument(
  db: RxDatabase<DatabaseCollections>,
  doc: Omit<ClinicalDocument, 'id'> | ClinicalDocument,
): Promise<ClinicalDocument> {
  const withId = {
    ...doc,
    id: 'id' in doc && doc.id ? doc.id : clinicalDocumentId(doc),
  } as ClinicalDocument;

  if (isDexieReposEnabled()) {
    const [saved] = await getDataClient().clinicalDocuments.upsertBatch([
      clinicalDocumentToDomain(withId),
    ]);
    return clinicalDocumentToLegacy(saved);
  }

  const saved = await db.clinical_documents.insert(withId);
  return saved.toJSON() as ClinicalDocument;
}

export async function findClinicalDocuments(
  db: RxDatabase<DatabaseCollections>,
  query: {
    userId: string;
    connectionId: string;
    resourceType?: ClinicalDocumentResourceType;
    metadataId?: string;
  },
): Promise<ClinicalDocument[]> {
  if (isDexieReposEnabled()) {
    const docs = await getDataClient().clinicalDocuments.query({
      userId: query.userId,
      connectionId: query.connectionId,
      resourceTypes: query.resourceType ? [query.resourceType] : undefined,
    });
    return docs
      .filter(
        (doc) =>
          query.metadataId === undefined ||
          doc.metadata?.sourceId === query.metadataId,
      )
      .map(clinicalDocumentToLegacy);
  }

  const selector: Record<string, unknown> = {
    user_id: query.userId,
    connection_record_id: query.connectionId,
  };
  if (query.resourceType) {
    selector['data_record.resource_type'] = { $eq: query.resourceType };
  }
  if (query.metadataId !== undefined) {
    selector['metadata.id'] = `${query.metadataId}`;
  }

  const docs = await db.clinical_documents.find({ selector }).exec();
  return docs.map((doc) => doc.toMutableJSON() as ClinicalDocument);
}
