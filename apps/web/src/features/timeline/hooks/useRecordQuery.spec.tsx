import { RxDatabase } from 'rxdb';
import { DatabaseCollections } from '../../../app/providers/DatabaseCollections';
import { ClinicalDocumentResourceType } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  createTestDatabase,
  cleanupTestDatabase,
} from '../../../test-utils/createTestDatabase';
import {
  createDocumentsForDays,
  createDocumentsWithSpecificDates,
  createTestClinicalDocument,
} from '../../../test-utils/clinicalDocumentTestData';
import { createDefaultTestUser } from '../../../test-utils/userTestData';
import {
  fetchRawRecords,
  fetchRecordsUntilCompleteDays,
  fetchTimelineDateKeys,
  getRecordDateKey,
  groupRecordsByDate,
  mergeRecordsByDate,
} from './useRecordQuery';
import { timelineDateKeyUpperBound } from '../utils/timelineDates';

/** Records of an arbitrary resource type on a fixed date. */
function createDocumentsOfType(
  userId: string,
  date: string,
  resourceType: ClinicalDocumentResourceType,
  count = 1,
) {
  return Array.from({ length: count }, () => {
    const doc = createTestClinicalDocument({ user_id: userId });
    doc.metadata = { ...doc.metadata, date };
    // The primary key is composed from connection/user/metadata ids, so the
    // document id has to be rebuilt around the overridden user.
    doc.id = `test-connection|${userId}|${doc.metadata.id}`;
    doc.data_record.resource_type = resourceType;
    return doc;
  });
}

describe('useRecordQuery helper functions', () => {
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

  describe('getRecordDateKey', () => {
    it('extracts date in yyyy-MM-dd format from record with metadata.date', () => {
      const doc = createDocumentsForDays(userId, 1, 1)[0];
      doc.metadata!.date = '2024-01-15T12:30:00.000Z';

      const dateKey = getRecordDateKey(doc);

      expect(dateKey).toBe('2024-01-15');
    });

    it('returns epoch date when metadata.date is missing', () => {
      const doc = createDocumentsForDays(userId, 1, 1)[0];
      doc.metadata = undefined;

      const dateKey = getRecordDateKey(doc);

      expect(dateKey).toBe('1970-01-01');
    });

    it('returns epoch date when metadata.date is empty string', () => {
      const doc = createDocumentsForDays(userId, 1, 1)[0];
      doc.metadata = { date: '' };

      const dateKey = getRecordDateKey(doc);

      expect(dateKey).toBe('1970-01-01');
    });
  });

  describe('groupRecordsByDate', () => {
    it('groups records by their date key', () => {
      const docs = createDocumentsWithSpecificDates(userId, [
        { date: '2024-01-15T10:00:00Z', count: 3 },
        { date: '2024-01-14T10:00:00Z', count: 2 },
        { date: '2024-01-13T10:00:00Z', count: 4 },
      ]);

      const grouped = groupRecordsByDate(docs);

      expect(Object.keys(grouped)).toHaveLength(3);
      expect(grouped['2024-01-15']).toHaveLength(3);
      expect(grouped['2024-01-14']).toHaveLength(2);
      expect(grouped['2024-01-13']).toHaveLength(4);
    });

    it('returns empty object for empty array', () => {
      const grouped = groupRecordsByDate([]);

      expect(Object.keys(grouped)).toHaveLength(0);
    });

    it('handles records with missing dates by grouping to epoch', () => {
      const docs = createDocumentsForDays(userId, 1, 2);
      docs[0].metadata = undefined;
      docs[1].metadata = { date: '2024-01-15T10:00:00Z' };

      const grouped = groupRecordsByDate(docs);

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped['1970-01-01']).toHaveLength(1);
      expect(grouped['2024-01-15']).toHaveLength(1);
    });
  });

  /**
   * The invariant the timeline is built on: whatever order records arrive in,
   * the day keys the UI reads come out newest first, and each record sits
   * under the day it happened in the reader's timezone. Sorting and grouping
   * used to be derived from different values — the raw stored string and the
   * local day — which is only a total order while every record uses the same
   * date format.
   */
  describe('day ordering invariant', () => {
    // Tests run in America/New_York, so an early-morning UTC instant is the
    // previous local evening.
    const previousLocalDay = '2016-05-27T03:00:00.000Z';

    it('groups a small-hours UTC instant under the local day it happened', () => {
      const [doc] = createDocumentsWithSpecificDates(userId, [
        { date: previousLocalDay, count: 1 },
      ]);

      expect(getRecordDateKey(doc)).toBe('2016-05-26');
    });

    it('keeps a bare date above a timestamp that shares its UTC day', () => {
      // Raw string order puts the timestamp first ('2016-05-27' is a prefix of
      // it), yet it belongs to the older day. Grouping has to override that.
      const docs = createDocumentsWithSpecificDates(userId, [
        { date: previousLocalDay, count: 2 },
        { date: '2016-05-27', count: 1 },
      ]);

      expect(Object.keys(groupRecordsByDate(docs))).toEqual([
        '2016-05-27',
        '2016-05-26',
      ]);
    });

    it('orders days newest first whatever order the records arrive in', () => {
      const dates = [
        '2016-05-27',
        '2016-05-27T03:00:00.000Z',
        '2016-05-25',
        '2016-05-28T12:00:00.000Z',
        '2016-05-24T23:00:00.000Z',
      ];
      const docs = dates.flatMap((date) =>
        createDocumentsWithSpecificDates(userId, [{ date, count: 1 }]),
      );

      const forwards = Object.keys(groupRecordsByDate(docs));
      const backwards = Object.keys(groupRecordsByDate([...docs].reverse()));

      expect(forwards).toEqual([
        '2016-05-28',
        '2016-05-27',
        '2016-05-26',
        '2016-05-25',
        '2016-05-24',
      ]);
      expect(backwards).toEqual(forwards);
    });

    it('sorts on the same value it groups on, down to the record', () => {
      const docs = createDocumentsWithSpecificDates(userId, [
        { date: '2024-03-02T09:00:00.000Z', count: 1 },
        { date: '2024-03-02T21:00:00.000Z', count: 1 },
        { date: '2024-03-01T18:00:00.000Z', count: 1 },
      ]);

      const grouped = groupRecordsByDate([...docs].reverse());
      const flattened = Object.entries(grouped).flatMap(([dateKey, records]) =>
        records.map((record) => [dateKey, record.metadata?.date]),
      );

      expect(flattened).toEqual([
        ['2024-03-02', '2024-03-02T21:00:00.000Z'],
        ['2024-03-02', '2024-03-02T09:00:00.000Z'],
        ['2024-03-01', '2024-03-01T18:00:00.000Z'],
      ]);
    });
  });

  describe('mergeRecordsByDate', () => {
    it('returns incoming when existing is undefined', () => {
      const incoming = createDocumentsWithSpecificDates(userId, [
        { date: '2024-01-15T10:00:00Z', count: 2 },
      ]);
      const incomingGrouped = groupRecordsByDate(incoming);

      const result = mergeRecordsByDate(undefined, incomingGrouped);

      expect(result).toBe(incomingGrouped);
    });

    it('merges records from same date', () => {
      const existing = groupRecordsByDate(
        createDocumentsWithSpecificDates(userId, [
          { date: '2024-01-15T10:00:00Z', count: 2 },
        ]),
      );
      const incoming = groupRecordsByDate(
        createDocumentsWithSpecificDates(userId, [
          { date: '2024-01-15T10:00:00Z', count: 3 },
        ]),
      );

      const result = mergeRecordsByDate(existing, incoming);

      expect(result['2024-01-15']).toHaveLength(5);
    });

    it('adds new dates from incoming', () => {
      const existing = groupRecordsByDate(
        createDocumentsWithSpecificDates(userId, [
          { date: '2024-01-15T10:00:00Z', count: 2 },
        ]),
      );
      const incoming = groupRecordsByDate(
        createDocumentsWithSpecificDates(userId, [
          { date: '2024-01-14T10:00:00Z', count: 3 },
        ]),
      );

      const result = mergeRecordsByDate(existing, incoming);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['2024-01-15']).toHaveLength(2);
      expect(result['2024-01-14']).toHaveLength(3);
    });

    it('keeps merged days newest first', () => {
      const existing = groupRecordsByDate(
        createDocumentsWithSpecificDates(userId, [
          { date: '2024-01-15T10:00:00Z', count: 1 },
        ]),
      );
      const incoming = groupRecordsByDate(
        createDocumentsWithSpecificDates(userId, [
          { date: '2024-01-16T10:00:00Z', count: 1 },
          { date: '2024-01-14T10:00:00Z', count: 1 },
        ]),
      );

      const result = mergeRecordsByDate(existing, incoming);

      expect(Object.keys(result)).toEqual([
        '2024-01-16',
        '2024-01-15',
        '2024-01-14',
      ]);
    });

    it('preserves existing dates not in incoming', () => {
      const existing = groupRecordsByDate(
        createDocumentsWithSpecificDates(userId, [
          { date: '2024-01-15T10:00:00Z', count: 2 },
          { date: '2024-01-14T10:00:00Z', count: 3 },
        ]),
      );
      const incoming = groupRecordsByDate(
        createDocumentsWithSpecificDates(userId, [
          { date: '2024-01-13T10:00:00Z', count: 1 },
        ]),
      );

      const result = mergeRecordsByDate(existing, incoming);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result['2024-01-15']).toHaveLength(2);
      expect(result['2024-01-14']).toHaveLength(3);
      expect(result['2024-01-13']).toHaveLength(1);
    });
  });

  describe('fetchRawRecords', () => {
    it('fetches records for user sorted by date descending', async () => {
      const docs = createDocumentsWithSpecificDates(userId, [
        { date: '2024-01-15T10:00:00Z', count: 5 },
        { date: '2024-01-14T10:00:00Z', count: 5 },
        { date: '2024-01-13T10:00:00Z', count: 5 },
      ]);
      await db.clinical_documents.bulkInsert(docs);

      const records = await fetchRawRecords(db, userId, 0, 10);

      expect(records).toHaveLength(10);
      expect(records[0].metadata?.date).toContain('2024-01-15');
    });

    it('respects offset and limit', async () => {
      const docs = createDocumentsForDays(userId, 3, 20);
      await db.clinical_documents.bulkInsert(docs);

      const first10 = await fetchRawRecords(db, userId, 0, 10);
      const next10 = await fetchRawRecords(db, userId, 10, 10);

      expect(first10).toHaveLength(10);
      expect(next10).toHaveLength(10);
      expect(first10[0].id).not.toBe(next10[0].id);
    });

    it('returns empty array when offset exceeds total records', async () => {
      const docs = createDocumentsForDays(userId, 1, 5);
      await db.clinical_documents.bulkInsert(docs);

      const records = await fetchRawRecords(db, userId, 100, 10);

      expect(records).toHaveLength(0);
    });

    it('excludes filtered resource types', async () => {
      const docs = createDocumentsForDays(userId, 1, 6);
      docs[0].data_record.resource_type = 'patient';
      docs[1].data_record.resource_type = 'provenance';
      docs[2].data_record.resource_type = 'documentreference_attachment';
      docs[3].data_record.resource_type = 'location';
      docs[4].data_record.resource_type = 'organization';
      await db.clinical_documents.bulkInsert(docs);

      const records = await fetchRawRecords(db, userId, 0, 10);

      expect(records).toHaveLength(2);
      expect(records.map((record) => record.data_record.resource_type)).toEqual(
        expect.arrayContaining(['observation', 'documentreference_attachment']),
      );
    });

    // The grouped card has a "Care Plans" section and the type filter offers
    // "Care plans", so excluding them from the unfiltered query made the
    // category unreachable from the timeline.
    it('includes care plans in the unfiltered timeline', async () => {
      await db.clinical_documents.bulkInsert([
        ...createDocumentsOfType(userId, '2024-01-15T10:00:00Z', 'careplan', 2),
        ...createDocumentsOfType(
          userId,
          '2024-01-15T10:00:00Z',
          'observation',
          1,
        ),
      ]);

      const records = await fetchRawRecords(db, userId, 0, 10);

      expect(
        records.filter((r) => r.data_record.resource_type === 'careplan'),
      ).toHaveLength(2);
    });

    it('returns care plans when filtered to care plans', async () => {
      await db.clinical_documents.bulkInsert([
        ...createDocumentsOfType(userId, '2024-01-15T10:00:00Z', 'careplan', 2),
        ...createDocumentsOfType(
          userId,
          '2024-01-15T10:00:00Z',
          'observation',
          3,
        ),
      ]);

      const records = await fetchRawRecords(db, userId, 0, 10, 'careplan');

      expect(records).toHaveLength(2);
      expect(
        records.every((r) => r.data_record.resource_type === 'careplan'),
      ).toBe(true);
    });

    it('excludes records newer than maxDate so paging can start mid-history', async () => {
      const docs = createDocumentsWithSpecificDates(userId, [
        { date: '2024-01-15T10:00:00Z', count: 2 },
        { date: '2024-01-14T10:00:00Z', count: 2 },
        { date: '2024-01-13T10:00:00Z', count: 2 },
      ]);
      await db.clinical_documents.bulkInsert(docs);

      const records = await fetchRawRecords(
        db,
        userId,
        0,
        10,
        'all',
        timelineDateKeyUpperBound('2024-01-14'),
      );

      expect(records).toHaveLength(4);
      expect(records.map(getRecordDateKey)).toEqual([
        '2024-01-14',
        '2024-01-14',
        '2024-01-13',
        '2024-01-13',
      ]);
    });

    it('keeps the whole target day when bounded by maxDate', async () => {
      // The bound is a date key, not an instant: every record whose local date
      // key is the target day has to survive it, including one whose UTC
      // timestamp already reads as the following day.
      await db.clinical_documents.bulkInsert(
        createDocumentsWithSpecificDates(userId, [
          { date: '2024-01-14T06:00:00Z', count: 1 },
          { date: '2024-01-15T04:00:00Z', count: 1 },
        ]),
      );

      const records = await fetchRawRecords(
        db,
        userId,
        0,
        10,
        'all',
        timelineDateKeyUpperBound('2024-01-14'),
      );

      expect(records.map(getRecordDateKey)).toEqual([
        '2024-01-14',
        '2024-01-14',
      ]);
    });

    it('excludes records with empty metadata.date', async () => {
      const docs = createDocumentsForDays(userId, 1, 3);
      docs[0].metadata!.date = '';
      await db.clinical_documents.bulkInsert(docs);

      const records = await fetchRawRecords(db, userId, 0, 10);

      expect(records).toHaveLength(2);
      expect(records.every((r) => r.metadata?.date)).toBe(true);
    });
  });
});

describe('fetchRecordsUntilCompleteDays', () => {
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

  it('returns at least the requested number of days on initial load', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 20 },
      { date: '2024-01-14T10:00:00Z', count: 20 },
      { date: '2024-01-13T10:00:00Z', count: 20 },
      { date: '2024-01-12T10:00:00Z', count: 20 },
      { date: '2024-01-11T10:00:00Z', count: 20 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

    const dayCount = Object.keys(result.records).length;
    expect(dayCount).toBeGreaterThanOrEqual(3);
    expect(result.hasMore).toBe(true);
  });

  it('returns exactly the requested days when data has few records per day', async () => {
    const dates: { date: string; count: number }[] = [];
    const baseDate = new Date('2024-01-15T10:00:00Z');
    for (let i = 0; i < 100; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      dates.push({ date: d.toISOString(), count: 3 });
    }
    const docs = createDocumentsWithSpecificDates(userId, dates);
    await db.clinical_documents.bulkInsert(docs);

    const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

    expect(Object.keys(result.records).length).toBe(3);
    expect(result.hasMore).toBe(true);

    const totalRecords = Object.values(result.records).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    expect(totalRecords).toBeLessThan(50);
  });

  it('fetches all records when days have many records spanning multiple batches', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 100 },
      { date: '2024-01-14T10:00:00Z', count: 100 },
      { date: '2024-01-13T10:00:00Z', count: 100 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

    expect(Object.keys(result.records).length).toBe(3);
    const totalRecords = Object.values(result.records).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    expect(totalRecords).toBe(300);
    expect(result.hasMore).toBe(false);
  });

  it('returns the requested days even when records span multiple batches', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 80 },
      { date: '2024-01-14T10:00:00Z', count: 80 },
      { date: '2024-01-13T10:00:00Z', count: 80 },
      { date: '2024-01-12T10:00:00Z', count: 80 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

    expect(Object.keys(result.records).length).toBe(3);
    const totalRecords = Object.values(result.records).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    expect(totalRecords).toBe(240);
    expect(result.hasMore).toBe(true);
  });

  it('load more returns different days than initial load', async () => {
    const dates: { date: string; count: number }[] = [];
    const baseDate = new Date('2024-01-15T10:00:00Z');
    for (let i = 0; i < 20; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      dates.push({ date: d.toISOString(), count: 5 });
    }
    const docs = createDocumentsWithSpecificDates(userId, dates);
    await db.clinical_documents.bulkInsert(docs);

    const firstLoad = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);
    expect(Object.keys(firstLoad.records).length).toBe(3);
    expect(firstLoad.hasMore).toBe(true);

    const secondLoad = await fetchRecordsUntilCompleteDays(
      db,
      userId,
      3,
      firstLoad.lastOffset,
    );
    expect(Object.keys(secondLoad.records).length).toBe(3);

    const firstDates = new Set(Object.keys(firstLoad.records));
    const secondDates = Object.keys(secondLoad.records);
    const overlap = secondDates.filter((d) => firstDates.has(d));
    expect(overlap).toEqual([]);
  });

  it('returns all records when fewer than minDays exist', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 10 },
      { date: '2024-01-14T10:00:00Z', count: 10 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

    const dayCount = Object.keys(result.records).length;
    expect(dayCount).toBe(2);
    expect(result.hasMore).toBe(false);
    const totalRecords = Object.values(result.records).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    expect(totalRecords).toBe(20);
  });

  it('never returns partial days', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 30 },
      { date: '2024-01-14T10:00:00Z', count: 30 },
      { date: '2024-01-13T10:00:00Z', count: 30 },
      { date: '2024-01-12T10:00:00Z', count: 30 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

    for (const [dateKey, records] of Object.entries(result.records)) {
      const expectedCount =
        dateKey === '2024-01-15'
          ? 30
          : dateKey === '2024-01-14'
            ? 30
            : dateKey === '2024-01-13'
              ? 30
              : 30;
      expect(records.length).toBe(expectedCount);
    }
  });

  it('lastOffset equals total records returned for pagination', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 20 },
      { date: '2024-01-14T10:00:00Z', count: 20 },
      { date: '2024-01-13T10:00:00Z', count: 20 },
      { date: '2024-01-12T10:00:00Z', count: 20 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

    const totalRecords = Object.values(result.records).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    expect(result.lastOffset).toBe(totalRecords);
  });

  it('load more returns non-overlapping days', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 20 },
      { date: '2024-01-14T10:00:00Z', count: 20 },
      { date: '2024-01-13T10:00:00Z', count: 20 },
      { date: '2024-01-12T10:00:00Z', count: 20 },
      { date: '2024-01-11T10:00:00Z', count: 20 },
      { date: '2024-01-10T10:00:00Z', count: 20 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    const firstLoad = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);
    const secondLoad = await fetchRecordsUntilCompleteDays(
      db,
      userId,
      3,
      firstLoad.lastOffset,
    );

    const firstDates = Object.keys(firstLoad.records);
    const secondDates = Object.keys(secondLoad.records);

    expect(firstDates.some((d) => secondDates.includes(d))).toBe(false);
  });

  it('returns days in newest-to-oldest order', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-13T10:00:00Z', count: 10 },
      { date: '2024-01-15T10:00:00Z', count: 10 },
      { date: '2024-01-14T10:00:00Z', count: 10 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

    const dates = Object.keys(result.records);
    expect(dates).toEqual(['2024-01-15', '2024-01-14', '2024-01-13']);
  });

  it('on timeout, returns available complete days immediately', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 300 },
      { date: '2024-01-14T10:00:00Z', count: 300 },
      { date: '2024-01-13T10:00:00Z', count: 300 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    let callCount = 0;
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 5000;
    });

    const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0, 1);

    expect(result.hasMore).toBe(true);
    expect(Object.keys(result.records).length).toBeLessThan(3);
    for (const dateKey of Object.keys(result.records)) {
      expect(['2024-01-15', '2024-01-14', '2024-01-13']).toContain(dateKey);
    }

    dateNowSpy.mockRestore();
  });

  it('fetches all records even past timeout when only one day exists', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 750 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    let callCount = 0;
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
      callCount++;
      return callCount * 2000;
    });

    const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0, 1);

    expect(result.records['2024-01-15'].length).toBe(750);
    expect(result.hasMore).toBe(false);
    expect(callCount).toBeGreaterThan(3);

    dateNowSpy.mockRestore();
  });

  it('on timeout, excludes partially-loaded days', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 200 },
      { date: '2024-01-14T10:00:00Z', count: 200 },
      { date: '2024-01-13T10:00:00Z', count: 200 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    let callCount = 0;
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 5000;
    });

    const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0, 1);

    expect(Object.keys(result.records)).toEqual(['2024-01-15']);
    expect(result.records['2024-01-15'].length).toBe(200);
    expect(result.hasMore).toBe(true);
    expect(result.lastOffset).toBe(200);

    dateNowSpy.mockRestore();
  });

  it('shows incremental progress when loading a day with many records', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 750 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    let callCount = 0;
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 5000;
    });

    const partialResults: any[] = [];
    const onPartialResults = jest.fn((partial) => {
      partialResults.push(partial);
    });

    const result = await fetchRecordsUntilCompleteDays(
      db,
      userId,
      3,
      0,
      1,
      onPartialResults,
    );

    expect(onPartialResults).toHaveBeenCalled();
    expect(partialResults.length).toBeGreaterThanOrEqual(1);
    expect(partialResults[0].hasMore).toBe(true);
    expect(Object.keys(partialResults[0].records)).toContain('2024-01-15');

    expect(result.records['2024-01-15'].length).toBe(750);
    expect(result.hasMore).toBe(false);

    dateNowSpy.mockRestore();
  });

  it('incremental progress callback fires each batch until a day completes', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 1000 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    let callCount = 0;
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 5000;
    });

    const onPartialResults = jest.fn();

    await fetchRecordsUntilCompleteDays(db, userId, 3, 0, 1, onPartialResults);

    expect(onPartialResults).toHaveBeenCalledTimes(4);

    const calls = onPartialResults.mock.calls;
    expect(calls[0][0].lastOffset).toBe(250);
    expect(calls[1][0].lastOffset).toBe(500);
    expect(calls[2][0].lastOffset).toBe(750);
    expect(calls[3][0].lastOffset).toBe(1000);

    dateNowSpy.mockRestore();
  });

  it('on timeout with multiple complete days, returns all of them', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 100 },
      { date: '2024-01-14T10:00:00Z', count: 100 },
      { date: '2024-01-13T10:00:00Z', count: 100 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    let callCount = 0;
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 5000;
    });

    const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0, 1);

    const returnedDates = Object.keys(result.records).sort((a, b) =>
      b.localeCompare(a),
    );
    expect(returnedDates).toEqual(['2024-01-15', '2024-01-14']);
    expect(result.records['2024-01-15'].length).toBe(100);
    expect(result.records['2024-01-14'].length).toBe(100);
    expect(result.hasMore).toBe(true);

    dateNowSpy.mockRestore();
  });

  it('no incremental progress when complete days are available', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 200 },
      { date: '2024-01-14T10:00:00Z', count: 200 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    let callCount = 0;
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 5000;
    });

    const onPartialResults = jest.fn();

    const result = await fetchRecordsUntilCompleteDays(
      db,
      userId,
      3,
      0,
      1,
      onPartialResults,
    );

    expect(onPartialResults).not.toHaveBeenCalled();
    expect(Object.keys(result.records)).toEqual(['2024-01-15']);
    expect(result.hasMore).toBe(true);

    dateNowSpy.mockRestore();
  });

  it('excludes partially-loaded oldest day when more records exist', async () => {
    const docs = createDocumentsWithSpecificDates(userId, [
      { date: '2024-01-15T10:00:00Z', count: 100 },
      { date: '2024-01-14T10:00:00Z', count: 100 },
      { date: '2024-01-13T10:00:00Z', count: 50 },
      { date: '2024-01-12T10:00:00Z', count: 1 },
    ]);
    await db.clinical_documents.bulkInsert(docs);

    const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

    expect(
      Object.keys(result.records).sort((a, b) => b.localeCompare(a)),
    ).toEqual(['2024-01-15', '2024-01-14']);
    expect(result.records['2024-01-15'].length).toBe(100);
    expect(result.records['2024-01-14'].length).toBe(100);
    expect(result.hasMore).toBe(true);
    expect(result.lastOffset).toBe(200);
  });

  describe('boundary conditions', () => {
    it('returns empty when user has no records', async () => {
      const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

      expect(Object.keys(result.records)).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.lastOffset).toBe(0);
    });

    it('returns all days when exactly minDays exist', async () => {
      const docs = createDocumentsWithSpecificDates(userId, [
        { date: '2024-01-15T10:00:00Z', count: 10 },
        { date: '2024-01-14T10:00:00Z', count: 10 },
        { date: '2024-01-13T10:00:00Z', count: 10 },
      ]);
      await db.clinical_documents.bulkInsert(docs);

      const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

      expect(Object.keys(result.records)).toHaveLength(3);
      expect(result.hasMore).toBe(false);
    });

    it('handles exactly GROUPED_VIEW_BATCH_SIZE records (250)', async () => {
      const docs = createDocumentsWithSpecificDates(userId, [
        { date: '2024-01-15T10:00:00Z', count: 100 },
        { date: '2024-01-14T10:00:00Z', count: 100 },
        { date: '2024-01-13T10:00:00Z', count: 50 },
      ]);
      await db.clinical_documents.bulkInsert(docs);

      const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

      expect(Object.keys(result.records).length).toBe(3);
      const totalRecords = Object.values(result.records).reduce(
        (sum, arr) => sum + arr.length,
        0,
      );
      expect(totalRecords).toBe(250);
      expect(result.hasMore).toBe(false);
    });

    it('handles GROUPED_VIEW_BATCH_SIZE - 1 records (249)', async () => {
      const docs = createDocumentsWithSpecificDates(userId, [
        { date: '2024-01-15T10:00:00Z', count: 100 },
        { date: '2024-01-14T10:00:00Z', count: 100 },
        { date: '2024-01-13T10:00:00Z', count: 49 },
      ]);
      await db.clinical_documents.bulkInsert(docs);

      const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

      expect(Object.keys(result.records).length).toBe(3);
      const totalRecords = Object.values(result.records).reduce(
        (sum, arr) => sum + arr.length,
        0,
      );
      expect(totalRecords).toBe(249);
      expect(result.hasMore).toBe(false);
    });

    it('handles GROUPED_VIEW_BATCH_SIZE + 1 records (251)', async () => {
      const docs = createDocumentsWithSpecificDates(userId, [
        { date: '2024-01-15T10:00:00Z', count: 100 },
        { date: '2024-01-14T10:00:00Z', count: 100 },
        { date: '2024-01-13T10:00:00Z', count: 51 },
      ]);
      await db.clinical_documents.bulkInsert(docs);

      const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

      expect(Object.keys(result.records)).toHaveLength(3);
      const totalRecords = Object.values(result.records).reduce(
        (sum, arr) => sum + arr.length,
        0,
      );
      expect(totalRecords).toBe(251);
      expect(result.hasMore).toBe(false);
    });

    it('returns single day when only one record exists', async () => {
      const docs = createDocumentsWithSpecificDates(userId, [
        { date: '2024-01-15T10:00:00Z', count: 1 },
      ]);
      await db.clinical_documents.bulkInsert(docs);

      const result = await fetchRecordsUntilCompleteDays(db, userId, 3, 0);

      expect(Object.keys(result.records)).toHaveLength(1);
      expect(result.records['2024-01-15']).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });
  });

  // A "Jump To" link points at a date that is usually many pages below the
  // loaded window. Seeking re-anchors the pager there instead of leaving the
  // link to scroll to an anchor that was never rendered.
  describe('seeking to a date (maxDate)', () => {
    const yearlyDates = Array.from({ length: 20 }, (_, index) => ({
      date: `${2006 + index}-06-15T12:00:00Z`,
      count: 40,
    })).reverse();

    it('starts at the requested date instead of the newest record', async () => {
      await db.clinical_documents.bulkInsert(
        createDocumentsWithSpecificDates(userId, yearlyDates),
      );

      const result = await fetchRecordsUntilCompleteDays(
        db,
        userId,
        3,
        0,
        3000,
        undefined,
        false,
        'all',
        timelineDateKeyUpperBound('2012-06-15'),
      );

      expect(Object.keys(result.records)).toEqual([
        '2012-06-15',
        '2011-06-15',
        '2010-06-15',
      ]);
      expect(result.hasMore).toBe(true);
    });

    it('loads the full target day, not a partial one', async () => {
      await db.clinical_documents.bulkInsert(
        createDocumentsWithSpecificDates(userId, [
          { date: '2020-01-02T12:00:00Z', count: 500 },
          { date: '2015-05-05T12:00:00Z', count: 400 },
          { date: '2015-05-04T12:00:00Z', count: 10 },
        ]),
      );

      const result = await fetchRecordsUntilCompleteDays(
        db,
        userId,
        3,
        0,
        3000,
        undefined,
        false,
        'all',
        timelineDateKeyUpperBound('2015-05-05'),
      );

      expect(result.records['2015-05-05']).toHaveLength(400);
      expect(result.records['2020-01-02']).toBeUndefined();
    });

    it('continues paging older from the seeked position', async () => {
      await db.clinical_documents.bulkInsert(
        createDocumentsWithSpecificDates(userId, yearlyDates),
      );
      const maxDate = timelineDateKeyUpperBound('2012-06-15');

      const first = await fetchRecordsUntilCompleteDays(
        db,
        userId,
        3,
        0,
        3000,
        undefined,
        false,
        'all',
        maxDate,
      );
      const second = await fetchRecordsUntilCompleteDays(
        db,
        userId,
        3,
        first.lastOffset,
        3000,
        undefined,
        false,
        'all',
        maxDate,
      );

      expect(Object.keys(second.records)).toEqual([
        '2009-06-15',
        '2008-06-15',
        '2007-06-15',
      ]);
    });

    it('reports no more records once the oldest date is seeked to', async () => {
      await db.clinical_documents.bulkInsert(
        createDocumentsWithSpecificDates(userId, yearlyDates),
      );

      const result = await fetchRecordsUntilCompleteDays(
        db,
        userId,
        3,
        0,
        3000,
        undefined,
        false,
        'all',
        timelineDateKeyUpperBound('2006-06-15'),
      );

      expect(Object.keys(result.records)).toEqual(['2006-06-15']);
      expect(result.hasMore).toBe(false);
    });

    it('reaches every date the jump rail offers', async () => {
      await db.clinical_documents.bulkInsert([
        ...createDocumentsWithSpecificDates(userId, yearlyDates),
        ...createDocumentsOfType(userId, '2013-02-02T12:00:00Z', 'careplan', 2),
      ]);

      const dateKeys = await fetchTimelineDateKeys(db, userId);
      expect(dateKeys.length).toBe(21);

      for (const dateKey of dateKeys) {
        const result = await fetchRecordsUntilCompleteDays(
          db,
          userId,
          1,
          0,
          3000,
          undefined,
          false,
          'all',
          timelineDateKeyUpperBound(dateKey),
        );
        expect(Object.keys(result.records)).toContain(dateKey);
      }
    });
  });

  describe('fuzz testing - pagination integrity', () => {
    function generateRandomDateDistribution(
      seed: number,
    ): { date: string; count: number }[] {
      const random = (max: number) => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed % max;
      };

      const numDays = 3 + random(15);
      const baseDate = new Date('2024-01-15T10:00:00Z');
      const dates: { date: string; count: number }[] = [];

      for (let i = 0; i < numDays; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        const count = 1 + random(150);
        dates.push({ date: d.toISOString(), count });
      }

      return dates;
    }

    async function getAllRecordsPaged(
      db: RxDatabase<DatabaseCollections>,
      userId: string,
      minDays: number,
    ): Promise<string[]> {
      const allIds: string[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const result = await fetchRecordsUntilCompleteDays(
          db,
          userId,
          minDays,
          offset,
        );
        for (const records of Object.values(result.records)) {
          for (const record of records) {
            allIds.push(record.id!);
          }
        }
        offset = result.lastOffset;
        hasMore = result.hasMore;

        if (allIds.length > 10000) {
          throw new Error('Safety limit exceeded');
        }
      }

      return allIds;
    }

    async function getAllRecordsUnpaged(
      db: RxDatabase<DatabaseCollections>,
      userId: string,
    ): Promise<string[]> {
      const records = await fetchRawRecords(db, userId, 0, 100000);
      return records.map((r) => r.id!);
    }

    it.each([42, 123, 456, 789, 1001])(
      'all records are returned across multiple load-more calls (seed %i)',
      async (seed) => {
        const dates = generateRandomDateDistribution(seed);
        const totalExpected = dates.reduce((sum, d) => sum + d.count, 0);
        const docs = createDocumentsWithSpecificDates(userId, dates);
        await db.clinical_documents.bulkInsert(docs);

        const pagedIds = await getAllRecordsPaged(db, userId, 3);
        const unpagedIds = await getAllRecordsUnpaged(db, userId);

        const pagedSet = new Set(pagedIds);
        const unpagedSet = new Set(unpagedIds);

        expect(pagedIds.length).toBe(totalExpected);
        expect(unpagedIds.length).toBe(totalExpected);

        expect(pagedIds.length).toBe(pagedSet.size);

        const missingFromPaged = unpagedIds.filter((id) => !pagedSet.has(id));
        const extraInPaged = pagedIds.filter((id) => !unpagedSet.has(id));

        expect(missingFromPaged).toEqual([]);
        expect(extraInPaged).toEqual([]);
      },
    );

    it('all records are returned regardless of minDays setting', async () => {
      const dates = generateRandomDateDistribution(999);
      const docs = createDocumentsWithSpecificDates(userId, dates);
      await db.clinical_documents.bulkInsert(docs);

      const unpagedIds = await getAllRecordsUnpaged(db, userId);

      for (const minDays of [1, 2, 3, 5, 7]) {
        const pagedIds = await getAllRecordsPaged(db, userId, minDays);
        const pagedSet = new Set(pagedIds);

        expect(pagedIds.length).toBe(pagedSet.size);
        expect(pagedIds.length).toBe(unpagedIds.length);

        const missing = unpagedIds.filter((id) => !pagedSet.has(id));
        expect(missing).toEqual([]);
      }
    });
  });
});

describe('fetchTimelineDateKeys', () => {
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

  it('lists dates newest first', async () => {
    await db.clinical_documents.bulkInsert(
      createDocumentsWithSpecificDates(userId, [
        { date: '2024-01-13T10:00:00Z', count: 2 },
        { date: '2024-01-15T10:00:00Z', count: 2 },
        { date: '2024-01-14T10:00:00Z', count: 2 },
      ]),
    );

    const dateKeys = await fetchTimelineDateKeys(db, userId);

    expect(dateKeys).toEqual(['2024-01-15', '2024-01-14', '2024-01-13']);
  });

  // The rail is the ordering's most visible consumer, and the stored dates mix
  // formats. A raw-string sort put the bare `2016-05-27` below the timestamps
  // that belong to the 26th, so the rail counted backwards for one step.
  it('lists dates newest first when date-only and timestamped records mix', async () => {
    await db.clinical_documents.bulkInsert([
      ...createDocumentsWithSpecificDates(userId, [
        { date: '2016-05-27T03:00:00.000Z', count: 2 },
        { date: '2016-05-27', count: 1 },
        { date: '2016-05-25T14:00:00.000Z', count: 1 },
      ]),
    ]);

    const dateKeys = await fetchTimelineDateKeys(db, userId);

    expect(dateKeys).toEqual(['2016-05-27', '2016-05-26', '2016-05-25']);
  });

  // The rail used to be built from a wider selector than the pager, so it
  // offered dates whose records the grouped view never renders. Those links
  // scrolled nowhere and gave no feedback.
  it('omits dates whose records render no card', async () => {
    await db.clinical_documents.bulkInsert([
      ...createDocumentsOfType(
        userId,
        '2024-01-15T10:00:00Z',
        'observation',
        2,
      ),
      ...createDocumentsOfType(
        userId,
        '2024-01-14T10:00:00Z',
        'servicerequest',
        2,
      ),
      ...createDocumentsOfType(
        userId,
        '2024-01-13T10:00:00Z',
        'visionprescription',
        1,
      ),
    ]);

    const dateKeys = await fetchTimelineDateKeys(db, userId);

    expect(dateKeys).toEqual(['2024-01-15']);
  });

  it('keeps a date whose only records are care plans', async () => {
    await db.clinical_documents.bulkInsert(
      createDocumentsOfType(userId, '2024-01-15T10:00:00Z', 'careplan', 3),
    );

    const dateKeys = await fetchTimelineDateKeys(db, userId);

    expect(dateKeys).toEqual(['2024-01-15']);
  });

  it('omits directory master data dates', async () => {
    await db.clinical_documents.bulkInsert([
      ...createDocumentsOfType(
        userId,
        '2024-01-15T10:00:00Z',
        'observation',
        1,
      ),
      ...createDocumentsOfType(
        userId,
        '2024-01-14T10:00:00Z',
        'practitioner',
        1,
      ),
      ...createDocumentsOfType(
        userId,
        '2024-01-13T10:00:00Z',
        'organization',
        1,
      ),
    ]);

    const dateKeys = await fetchTimelineDateKeys(db, userId);

    expect(dateKeys).toEqual(['2024-01-15']);
  });

  it('narrows to the selected record type', async () => {
    await db.clinical_documents.bulkInsert([
      ...createDocumentsOfType(userId, '2024-01-15T10:00:00Z', 'careplan', 1),
      ...createDocumentsOfType(
        userId,
        '2024-01-14T10:00:00Z',
        'observation',
        1,
      ),
    ]);

    const dateKeys = await fetchTimelineDateKeys(db, userId, 'careplan');

    expect(dateKeys).toEqual(['2024-01-15']);
  });
});
