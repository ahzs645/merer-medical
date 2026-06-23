import { RxDatabase } from 'rxdb';

import { DatabaseCollections } from '../app/providers/DatabaseCollections';
import {
  cleanupTestDatabase,
  createTestDatabase,
} from '../test-utils/createTestDatabase';
import { backfillSourceDocumentLinks } from './sourceLinkBackfill';

const userId = '6f271f0e-e76a-4c38-91d2-7216f1c7a8b4';
const connectionId = '50e03036-5c41-47de-9a2d-6d4188d06dbc';

function docId(metadataId: string) {
  return `${connectionId}|${userId}|${metadataId}`;
}

describe('backfillSourceDocumentLinks', () => {
  let db: RxDatabase<DatabaseCollections>;

  beforeEach(async () => {
    db = await createTestDatabase();
    await db.connection_documents.insert({
      id: connectionId,
      user_id: userId,
      access_token: '',
      expires_at: 0,
      source: 'manual',
      name: 'AHS import',
      location: 'manual://local',
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  async function insertDocumentReference(
    metadataId: string,
    sourceFile: string,
  ) {
    await db.clinical_documents.insert({
      id: docId(metadataId),
      connection_record_id: connectionId,
      user_id: userId,
      data_record: {
        raw: {
          resource: {
            resourceType: 'DocumentReference',
            content: [{ attachment: { title: sourceFile } }],
          },
        },
        format: 'FHIR.R4',
        content_type: 'application/json',
        resource_type: 'documentreference',
        version_history: [],
      },
      metadata: { id: metadataId, source_file: sourceFile },
    });
  }

  async function insertRecord(
    metadataId: string,
    resourceType: string,
    metadata: Record<string, unknown>,
  ) {
    await db.clinical_documents.insert({
      id: docId(metadataId),
      connection_record_id: connectionId,
      user_id: userId,
      data_record: {
        raw: { resource: { resourceType: 'Observation', id: metadataId } },
        format: 'FHIR.R4',
        content_type: 'application/json',
        resource_type: resourceType,
        version_history: [],
      },
      metadata: { id: metadataId, ...metadata },
    });
  }

  async function getMeta(metadataId: string) {
    const row = await db.clinical_documents
      .findOne({ selector: { user_id: userId, 'metadata.id': metadataId } })
      .exec();
    return (row?.toMutableJSON().metadata ?? {}) as Record<string, unknown>;
  }

  it('links records to the document matching ccda_source_file / source_file', async () => {
    await insertDocumentReference(
      'documentreference/doc1',
      'HealthSummary/IHE_XDM/Caleb1/DOC0001.XML',
    );
    await insertRecord('observation/obs1', 'observation', {
      ccda_source_file: 'HealthSummary/IHE_XDM/Caleb1/DOC0001.XML',
    });
    await insertRecord('condition/cond1', 'condition', {
      source_file: 'HealthSummary/IHE_XDM/Caleb1/DOC0001.XML',
    });

    const result = await backfillSourceDocumentLinks(db, userId);

    expect(result.linked).toBe(2);
    expect((await getMeta('observation/obs1'))['source_document_id']).toBe(
      'documentreference/doc1',
    );
    expect((await getMeta('condition/cond1'))['source_document_id']).toBe(
      'documentreference/doc1',
    );
  });

  it('is idempotent and never overwrites an existing link', async () => {
    await insertDocumentReference('documentreference/doc1', 'caleb.json');
    await insertRecord('observation/obs1', 'observation', {
      source_file: 'caleb.json',
      source_document_id: 'documentreference/preexisting',
    });

    const result = await backfillSourceDocumentLinks(db, userId);

    expect(result.linked).toBe(0);
    expect((await getMeta('observation/obs1'))['source_document_id']).toBe(
      'documentreference/preexisting',
    );
  });

  it('does not link a document to itself', async () => {
    await insertDocumentReference('documentreference/doc1', 'caleb.json');

    const result = await backfillSourceDocumentLinks(db, userId);

    expect(result.linked).toBe(0);
    expect(
      (await getMeta('documentreference/doc1'))['source_document_id'],
    ).toBeUndefined();
  });
});
