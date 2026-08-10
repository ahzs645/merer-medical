import { RxDatabase } from 'rxdb';

import { DatabaseCollections } from '../../../app/providers/DatabaseCollections';
import { ClinicalDocumentResourceType } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  cleanupTestDatabase,
  createTestDatabase,
} from '../../../test-utils/createTestDatabase';
import { createTestClinicalDocument } from '../../../test-utils/clinicalDocumentTestData';
import { createDefaultTestUser } from '../../../test-utils/userTestData';
import { fetchRecords } from './timelineRecords';

function createSearchableDocument(
  userId: string,
  date: string,
  resourceType: ClinicalDocumentResourceType,
  displayName: string,
) {
  const doc = createTestClinicalDocument({ user_id: userId });
  doc.metadata = { ...doc.metadata, date, display_name: displayName };
  // The primary key is composed from connection/user/metadata ids, so the
  // document id has to be rebuilt around the overridden user.
  doc.id = `test-connection|${userId}|${doc.metadata.id}`;
  doc.data_record.resource_type = resourceType;
  return doc;
}

describe('fetchRecords', () => {
  let db: RxDatabase<DatabaseCollections>;
  let userId: string;

  beforeEach(async () => {
    db = await createTestDatabase();
    const user = createDefaultTestUser();
    userId = user.id;
    await db.user_documents.insert(user);
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  /**
   * Search used to exclude a different set of resource types than the grouped
   * timeline, so a query matching a clinic or a doctor by name returned a
   * record that no card knows how to draw — a blank entry in the results.
   */
  it('hides directory records that have no card to render', async () => {
    await db.clinical_documents.bulkInsert([
      createSearchableDocument(
        userId,
        '2024-01-15T10:00:00Z',
        'observation',
        'Mercy General panel',
      ),
      createSearchableDocument(
        userId,
        '2024-01-14T10:00:00Z',
        'location',
        'Mercy General Hospital',
      ),
      createSearchableDocument(
        userId,
        '2024-01-13T10:00:00Z',
        'practitioner',
        'Mercy General, Dr Ada Ray',
      ),
      createSearchableDocument(
        userId,
        '2024-01-12T10:00:00Z',
        'organization',
        'Mercy General Group',
      ),
    ]);

    const records = await fetchRecords(db, userId, 'Mercy General');

    expect(
      Object.values(records)
        .flat()
        .map((record) => record.data_record.resource_type),
    ).toEqual(['observation']);
  });

  it('keeps hiding attachment chunks, whose name duplicates their document', async () => {
    await db.clinical_documents.bulkInsert([
      createSearchableDocument(
        userId,
        '2024-01-15T10:00:00Z',
        'documentreference',
        'Discharge summary',
      ),
      createSearchableDocument(
        userId,
        '2024-01-15T10:00:00Z',
        'documentreference_attachment',
        'Discharge summary',
      ),
    ]);

    const records = await fetchRecords(db, userId, 'Discharge');

    expect(
      Object.values(records)
        .flat()
        .map((record) => record.data_record.resource_type),
    ).toEqual(['documentreference']);
  });

  it('groups results by local day, newest first, across mixed date formats', async () => {
    // Tests run in America/New_York: the timestamp below is the evening of the
    // 26th locally, so it must group under the day before the bare date even
    // though the raw stored strings sort the other way around.
    await db.clinical_documents.bulkInsert([
      createSearchableDocument(
        userId,
        '2016-05-27T03:00:00.000Z',
        'observation',
        'Panel A',
      ),
      createSearchableDocument(userId, '2016-05-27', 'observation', 'Panel B'),
      createSearchableDocument(
        userId,
        '2016-05-25T14:00:00.000Z',
        'observation',
        'Panel C',
      ),
    ]);

    const records = await fetchRecords(db, userId, 'Panel');

    expect(Object.keys(records)).toEqual([
      '2016-05-27',
      '2016-05-26',
      '2016-05-25',
    ]);
    expect(records['2016-05-27'][0].metadata?.display_name).toBe('Panel B');
  });
});
