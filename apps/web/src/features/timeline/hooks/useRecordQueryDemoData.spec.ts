import { RxDatabase } from 'rxdb';

import { DatabaseCollections } from '../../../app/providers/DatabaseCollections';
import {
  createTestDatabase,
  cleanupTestDatabase,
  seedTestDatabase,
} from '../../../test-utils/createTestDatabase';
import { getTimelineCategories } from '../utils/timelineCategories';
import { timelineDateKeyUpperBound } from '../utils/timelineDates';
import {
  fetchRawRecords,
  fetchRecordsUntilCompleteDays,
  fetchTimelineDateKeys,
  getRecordDateKey,
  groupRecordsByDate,
} from './useRecordQuery';

/**
 * The bundled demo fixture spans two decades, so the timeline genuinely pages:
 * most of what the "Jump To" rail offers sits many pages below the first load.
 * These assert invariants rather than fixture counts, which shift as the demo
 * data is refreshed.
 */
describe('timeline paging over the bundled demo data', () => {
  let db: RxDatabase<DatabaseCollections>;
  let userId: string;

  beforeEach(async () => {
    db = await createTestDatabase();
    await seedTestDatabase(db);
    const user = await db.user_documents.findOne().exec();
    userId = user?.get('id');
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  it('spans enough years that the rail reaches well past the first page', async () => {
    const dateKeys = await fetchTimelineDateKeys(db, userId);
    const years = new Set(dateKeys.map((dateKey) => dateKey.slice(0, 4)));

    expect(dateKeys.length).toBeGreaterThan(50);
    expect(years.size).toBeGreaterThan(10);
    expect(dateKeys[0]).toBe(
      [...dateKeys].sort((a, b) => b.localeCompare(a))[0],
    );
  });

  it('surfaces every care plan the fixture holds', async () => {
    const storedCarePlans = await db.clinical_documents
      .find({
        selector: {
          user_id: userId,
          'data_record.resource_type': 'careplan',
          'metadata.date': { $nin: [null, undefined, ''] },
        },
      })
      .exec();
    expect(storedCarePlans.length).toBeGreaterThan(0);

    const records = await fetchRawRecords(db, userId, 0, 100000);
    const timelineCarePlans = records.filter(
      (record) => record.data_record.resource_type === 'careplan',
    );

    expect(timelineCarePlans).toHaveLength(storedCarePlans.length);
  });

  it('reaches every date the rail offers, however far back', async () => {
    const dateKeys = await fetchTimelineDateKeys(db, userId);

    const unreachable: string[] = [];
    for (const dateKey of dateKeys) {
      const result = await fetchRecordsUntilCompleteDays(
        db,
        userId,
        3,
        0,
        3000,
        undefined,
        false,
        'all',
        timelineDateKeyUpperBound(dateKey),
      );
      if (!(dateKey in result.records)) {
        unreachable.push(dateKey);
      }
    }

    expect(unreachable).toEqual([]);
  });

  it('offers no date that the grouped view would render as nothing', async () => {
    const records = await fetchRawRecords(db, userId, 0, 100000);
    const grouped = groupRecordsByDate(records);
    const renderable = new Set(
      Object.entries(grouped)
        .filter(([, items]) => getTimelineCategories(items).length > 0)
        .map(([dateKey]) => dateKey),
    );

    const dateKeys = await fetchTimelineDateKeys(db, userId);

    expect(dateKeys.filter((dateKey) => !renderable.has(dateKey))).toEqual([]);
    // The fixture holds at least one date the grouped view cannot render, so
    // the filtering above is doing real work rather than passing vacuously.
    expect(renderable.size).toBeLessThan(Object.keys(grouped).length);
  });

  it('only pages backwards in time from a jump target', async () => {
    const dateKeys = await fetchTimelineDateKeys(db, userId);
    const target = dateKeys[Math.floor(dateKeys.length / 2)];

    const result = await fetchRecordsUntilCompleteDays(
      db,
      userId,
      3,
      0,
      3000,
      undefined,
      false,
      'all',
      timelineDateKeyUpperBound(target),
    );

    const loadedDates = Object.keys(result.records);
    expect(loadedDates).toContain(target);
    expect(loadedDates.every((dateKey) => dateKey <= target)).toBe(true);
    expect(
      Object.values(result.records)
        .flat()
        .every((record) => getRecordDateKey(record) <= target),
    ).toBe(true);
  });
});
