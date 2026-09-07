import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { parseISO } from 'date-fns';
import { useDebounceCallback } from '@react-hook/debounce';
import { BundleEntry, FhirResource } from 'fhir/r2';
import { MangoQuerySelector, RxDatabase } from 'rxdb';
import { VectorStorage } from '@mere/vector-storage';
import { useLocalConfig } from '../../../app/providers/LocalConfigProvider';
import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { useVectors } from '../../vectors';
import { useRecordChangeTick } from '../../../shared/utils/recordChangeSignal';
import { DatabaseCollections } from '../../../app/providers/DatabaseCollections';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { QueryStatus, RecordsByDate, TimelineRecordTypeFilter } from '../types';
import {
  fetchRecords,
  fetchRecordsWithVectorSearch,
  NON_TIMELINE_RESOURCE_TYPES,
  PAGE_SIZE,
} from '../services/timelineRecords';
import { getTimelineCategories } from '../utils/timelineCategories';
import {
  compareTimelineDateKeysDesc,
  timelineDateKey,
  timelineDateKeyUpperBound,
} from '../utils/timelineDates';

export const GROUPED_VIEW_BATCH_SIZE = 250;

/**
 * Shared selector so the paged record query and the "Jump To" date list can
 * never disagree about which records belong on the timeline — a rail built
 * from a wider selector offers dates that the pager will never render.
 *
 * @param maxDate ISO instant upper bound on `metadata.date`. Records are
 *   stored as ISO strings and sorted lexicographically, so bounding the field
 *   lets the pager start part-way down the timeline instead of only ever
 *   walking forward from the newest record.
 */
export function buildTimelineSelector(
  user_id: string,
  typeFilter: TimelineRecordTypeFilter = 'all',
  maxDate?: string,
): MangoQuerySelector<ClinicalDocument<unknown>> {
  const dateSelector: Record<string, unknown> = { $nin: [null, undefined, ''] };
  if (maxDate) {
    dateSelector['$lte'] = maxDate;
  }

  return {
    user_id: user_id,
    'data_record.resource_type':
      typeFilter === 'all' ? { $nin: NON_TIMELINE_RESOURCE_TYPES } : typeFilter,
    'metadata.date': dateSelector,
  } as MangoQuerySelector<ClinicalDocument<unknown>>;
}

/**
 * Records in raw stored order, newest-ish first.
 *
 * The database can only sort the stored `metadata.date` string, which mixes
 * date-only and timestamped values and so is *not* in the same order as the
 * day keys the timeline groups by. That is fine here — this order exists only
 * to walk the collection in stable, pageable chunks. Every order the UI ends
 * up seeing is re-derived from `timelineDateKey`, never from this.
 */
export async function fetchRawRecords(
  db: RxDatabase<DatabaseCollections>,
  user_id: string,
  offset: number,
  limit: number,
  typeFilter: TimelineRecordTypeFilter = 'all',
  maxDate?: string,
): Promise<ClinicalDocument<BundleEntry<FhirResource>>[]> {
  const docs = await db.clinical_documents
    .find({
      selector: buildTimelineSelector(user_id, typeFilter, maxDate),
      sort: [{ 'metadata.date': 'desc' }],
    })
    .skip(offset)
    .limit(limit)
    .exec();

  return docs.map(
    (doc) => doc.toMutableJSON() as ClinicalDocument<BundleEntry<FhirResource>>,
  );
}

export function getRecordDateKey(
  record: ClinicalDocument<BundleEntry<FhirResource>>,
): string {
  if (!record.metadata?.date) {
    return new Date(0).toISOString().split('T')[0];
  }
  return timelineDateKey(record.metadata.date);
}

function getRecordInstant(
  record: ClinicalDocument<BundleEntry<FhirResource>>,
): number {
  if (!record.metadata?.date) return 0;
  const parsed = parseISO(record.metadata.date).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Newest first, refining `compareTimelineDateKeysDesc` within a day by instant
 * and then by id. The id tiebreak is what makes this a total order: two
 * records can share a date-only string, and an ordering that leaves them
 * interchangeable lets the same page render in a different order each load.
 */
function compareRecordsDesc(
  a: ClinicalDocument<BundleEntry<FhirResource>>,
  b: ClinicalDocument<BundleEntry<FhirResource>>,
): number {
  const byDay = compareTimelineDateKeysDesc(
    getRecordDateKey(a),
    getRecordDateKey(b),
  );
  if (byDay !== 0) return byDay;

  const byInstant = getRecordInstant(b) - getRecordInstant(a);
  if (byInstant !== 0) return byInstant;

  return (a.id ?? '').localeCompare(b.id ?? '');
}

/**
 * Groups records into days, newest day first.
 *
 * The key order matters: the timeline renders `Object.entries` of this map, so
 * insertion order *is* display order. Building it from whatever order the
 * records arrived in is what let a raw-string database sort leak through, so
 * the keys are sorted with the same comparator the grouping key comes from.
 */
export function groupRecordsByDate(
  records: ClinicalDocument<BundleEntry<FhirResource>>[],
): Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]> {
  const grouped: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]> =
    {};

  for (const record of [...records].sort(compareRecordsDesc)) {
    const dateKey = getRecordDateKey(record);
    if (grouped[dateKey]) {
      grouped[dateKey].push(record);
    } else {
      grouped[dateKey] = [record];
    }
  }

  return grouped;
}

/**
 * Every date the timeline can scroll to, newest first.
 *
 * Dates whose records would not produce a single card section are left out:
 * the grouped view skips those days, so offering them in the rail would give
 * a link pointing at an anchor that is never rendered.
 */
export async function fetchTimelineDateKeys(
  db: RxDatabase<DatabaseCollections>,
  user_id: string,
  typeFilter: TimelineRecordTypeFilter = 'all',
): Promise<string[]> {
  const docs = await db.clinical_documents
    .find({
      selector: buildTimelineSelector(user_id, typeFilter),
    })
    .exec();

  const byDateKey = new Map<
    string,
    ClinicalDocument<BundleEntry<FhirResource>>[]
  >();
  for (const doc of docs) {
    const date = doc.get('metadata')?.date;
    if (!date) continue;
    const dateKey = timelineDateKey(date);
    // Only `data_record` is read by the category check, so avoid cloning the
    // whole document: this runs over every record the user has.
    const item = {
      data_record: doc.get('data_record'),
    } as ClinicalDocument<BundleEntry<FhirResource>>;
    const existing = byDateKey.get(dateKey);
    if (existing) {
      existing.push(item);
    } else {
      byDateKey.set(dateKey, [item]);
    }
  }

  // Sorted on the day key rather than taken from the database's order: that
  // order is on the raw stored string, which disagrees with the day key
  // whenever the two stored date formats meet.
  return [...byDateKey.entries()]
    .filter(([, items]) => getTimelineCategories(items).length > 0)
    .map(([dateKey]) => dateKey)
    .sort(compareTimelineDateKeysDesc);
}

export function mergeRecordsByDate(
  existing:
    | Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]>
    | undefined,
  incoming: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]>,
): Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]> {
  if (!existing) return incoming;
  const merged: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]> =
    {};

  // Rebuilt in day order rather than spread over `existing`, because the
  // result is rendered straight out of its key order: a page whose days
  // interleave with the loaded ones would otherwise land wherever the merge
  // happened to put them.
  const dateKeys = [
    ...new Set([...Object.keys(existing), ...Object.keys(incoming)]),
  ].sort(compareTimelineDateKeysDesc);

  for (const dateKey of dateKeys) {
    const before = existing[dateKey] ?? [];
    const existingIds = new Set(before.map((record) => record.id));
    merged[dateKey] = [
      ...before,
      ...(incoming[dateKey] ?? []).filter(
        (record) => !existingIds.has(record.id),
      ),
    ];
  }

  return merged;
}

export type PartialResultsCallback = (partial: {
  records: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]>;
  hasMore: boolean;
  lastOffset: number;
}) => void;

/**
 * Fetches records grouped by date with incremental loading for the timeline view.
 *
 * Uses a timeout with the following behavior:
 * - Normal: Fetches until `minDays` complete days are loaded
 * - Timeout with 1+ complete days: Returns only complete days immediately
 * - Timeout with 0 complete days: Emits partial results each batch until at least
 *   one day is complete, so the user sees progress rather than a loading screen
 *
 * A day is "complete" when we've confirmed no more records exist for that date
 * (by seeing a record from a different date in the sorted results).
 *
 * `maxDate` bounds the window the offset counts within, so paging can be
 * anchored at an arbitrary point in history rather than always starting from
 * the newest record.
 */
/**
 * The newest `limit` days that are known to be complete, and how many records
 * that is.
 *
 * "Complete" means the fetch has already seen a record older than that day, so
 * nothing more can arrive for it. A day still at the edge of the batch is not
 * shown: rendering it would claim a day holds three records when the next batch
 * has four more.
 *
 * The record count is what the pager advances its offset by, which is why the
 * two are returned together — a caller that shows the days without counting the
 * records puts the view ahead of the offset.
 */
function takeNewestCompleteDays(
  records: ClinicalDocument<BundleEntry<FhirResource>>[],
  completeDates: Set<string>,
  limit: number,
): {
  records: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]>;
  keptCount: number;
} {
  const grouped = groupRecordsByDate(records);
  const dates = Object.keys(grouped)
    .sort(compareTimelineDateKeysDesc)
    .filter((date) => completeDates.has(date))
    .slice(0, limit);

  const kept: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]> =
    {};
  let keptCount = 0;
  for (const date of dates) {
    kept[date] = grouped[date];
    keptCount += grouped[date].length;
  }

  return { records: kept, keptCount };
}

export async function fetchRecordsUntilCompleteDays(
  db: RxDatabase<DatabaseCollections>,
  user_id: string,
  minDays: number = 5,
  existingOffset: number = 0,
  timeoutMs: number = 3000,
  onPartialResults?: PartialResultsCallback,
  emitPartialBatches = false,
  typeFilter: TimelineRecordTypeFilter = 'all',
  maxDate?: string,
): Promise<{
  records: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]>;
  hasMore: boolean;
  lastOffset: number;
}> {
  const startTime = Date.now();
  let offset = existingOffset;
  const allRecords: ClinicalDocument<BundleEntry<FhirResource>>[] = [];
  const uniqueDates = new Set<string>();
  const completeDates = new Set<string>();
  let newestDate: string | null = null;
  let hasMore = true;
  let iteration = 0;

  while (true) {
    iteration++;
    const batchStartTime = Date.now();
    const batch = await fetchRawRecords(
      db,
      user_id,
      offset,
      GROUPED_VIEW_BATCH_SIZE,
      typeFilter,
      maxDate,
    );
    const batchDuration = Date.now() - batchStartTime;
    const elapsed = Date.now() - startTime;

    console.debug('[fetchRecordsUntilCompleteDays] batch fetched', {
      iteration,
      batchSize: batch.length,
      batchDuration,
      elapsed,
      timeoutMs,
      offset,
      uniqueDates: uniqueDates.size,
      completeDates: completeDates.size,
      totalRecords: allRecords.length,
    });

    if (batch.length === 0) {
      console.debug('[fetchRecordsUntilCompleteDays] exiting: empty batch');
      hasMore = false;
      break;
    }

    for (const record of batch) {
      const dateKey = getRecordDateKey(record);
      if (newestDate && dateKey < newestDate) {
        completeDates.add(newestDate);
      }
      // The batch arrives in raw stored order, which can dip back into a day
      // it had already left (a bare `2016-05-28` follows a
      // `2016-05-28T01:00:00Z` that belongs to the 27th). A day with records
      // still arriving is not complete, whatever we concluded earlier.
      completeDates.delete(dateKey);
      newestDate = dateKey;
      uniqueDates.add(dateKey);
    }

    allRecords.push(...batch);
    offset += batch.length;

    if (emitPartialBatches && onPartialResults) {
      // Only the days this page will actually commit to.
      //
      // This used to emit every record fetched so far, which on the first
      // load-more is a 250-record batch spanning 65 days. Those 65 days were
      // merged into the view and stayed there, while the page that followed
      // committed 3 complete days and moved `groupedOffset` by thirteen
      // records. The timeline then showed five years it had never paged
      // through, ending on a day that was still half-loaded, and every
      // subsequent page re-fetched records already on screen — so the content
      // stopped growing, the sentinel never moved, and scrolling stopped
      // reaching anything older. A partial emission has to be a prefix of the
      // commit, never a preview of records the pager has not counted.
      const partial = takeNewestCompleteDays(
        allRecords,
        completeDates,
        minDays,
      );
      if (partial.keptCount > 0) {
        onPartialResults({
          records: partial.records,
          hasMore: true,
          lastOffset: existingOffset + partial.keptCount,
        });
      }
    }

    if (batch.length < GROUPED_VIEW_BATCH_SIZE) {
      console.debug('[fetchRecordsUntilCompleteDays] exiting: partial batch', {
        batchSize: batch.length,
        expectedSize: GROUPED_VIEW_BATCH_SIZE,
      });
      hasMore = false;
      break;
    }

    const timeoutExceeded = elapsed > timeoutMs;
    const hasEnoughDays = uniqueDates.size >= minDays;

    console.debug('[fetchRecordsUntilCompleteDays] exit check', {
      iteration,
      hasEnoughDays,
      timeoutExceeded,
      uniqueDates: uniqueDates.size,
      completeDates: completeDates.size,
      minDays,
    });

    if (timeoutExceeded && completeDates.size >= 1) {
      console.debug(
        '[fetchRecordsUntilCompleteDays] timeout with complete days, returning early',
        {
          completeDates: completeDates.size,
        },
      );
      const grouped = groupRecordsByDate(allRecords);
      const sortedDates = Object.keys(grouped).sort(
        compareTimelineDateKeysDesc,
      );
      const completeDatesToReturn = sortedDates.filter((d) =>
        completeDates.has(d),
      );

      const truncated: Record<
        string,
        ClinicalDocument<BundleEntry<FhirResource>>[]
      > = {};
      let keptCount = 0;
      for (const date of completeDatesToReturn) {
        truncated[date] = grouped[date];
        keptCount += grouped[date].length;
      }

      return {
        records: truncated,
        hasMore: true,
        lastOffset: existingOffset + keptCount,
      };
    }

    if (timeoutExceeded && completeDates.size === 0) {
      console.debug(
        '[fetchRecordsUntilCompleteDays] timeout with 0 complete days, emitting partial',
        {
          uniqueDates: uniqueDates.size,
          totalRecords: allRecords.length,
        },
      );
      if (onPartialResults) {
        onPartialResults({
          records: groupRecordsByDate(allRecords),
          hasMore: true,
          lastOffset: offset,
        });
      }
    }

    if (completeDates.size >= minDays) {
      console.debug(
        '[fetchRecordsUntilCompleteDays] exiting: have enough complete days',
        { completeDates: completeDates.size, minDays },
      );
      break;
    }

    if (hasEnoughDays) {
      const checkBatch = await fetchRawRecords(
        db,
        user_id,
        offset,
        1,
        typeFilter,
        maxDate,
      );
      if (checkBatch.length === 0) {
        console.debug(
          '[fetchRecordsUntilCompleteDays] exiting: no more records after exit check',
        );
        hasMore = false;
        break;
      }

      const nextDate = getRecordDateKey(checkBatch[0]);
      const sortedDates = [...uniqueDates].sort();
      const oldestDate = sortedDates[0];

      console.debug('[fetchRecordsUntilCompleteDays] date boundary check', {
        nextDate,
        oldestDate,
        willExit: nextDate !== oldestDate,
      });

      if (nextDate !== oldestDate) {
        console.debug(
          '[fetchRecordsUntilCompleteDays] exiting: date boundary reached',
        );
        break;
      }

      console.debug(
        '[fetchRecordsUntilCompleteDays] continuing: next record same date as oldest',
      );
    }
  }

  const grouped = groupRecordsByDate(allRecords);
  const sortedDates = Object.keys(grouped).sort(compareTimelineDateKeysDesc);

  if (sortedDates.length > minDays) {
    const datesToKeep = new Set(sortedDates.slice(0, minDays));
    const truncated: Record<
      string,
      ClinicalDocument<BundleEntry<FhirResource>>[]
    > = {};
    let keptCount = 0;

    for (const date of sortedDates) {
      if (datesToKeep.has(date)) {
        truncated[date] = grouped[date];
        keptCount += grouped[date].length;
      }
    }

    return {
      records: truncated,
      hasMore: true,
      lastOffset: existingOffset + keptCount,
    };
  }

  if (
    hasMore &&
    completeDates.size >= 1 &&
    completeDates.size < sortedDates.length
  ) {
    console.debug(
      '[fetchRecordsUntilCompleteDays] truncating to complete days at end',
      {
        completeDates: completeDates.size,
        totalDates: sortedDates.length,
      },
    );
    const completeDatesToReturn = sortedDates.filter((d) =>
      completeDates.has(d),
    );
    const truncated: Record<
      string,
      ClinicalDocument<BundleEntry<FhirResource>>[]
    > = {};
    let keptCount = 0;
    for (const date of completeDatesToReturn) {
      truncated[date] = grouped[date];
      keptCount += grouped[date].length;
    }
    return {
      records: truncated,
      hasMore: true,
      lastOffset: existingOffset + keptCount,
    };
  }

  return { records: grouped, hasMore, lastOffset: offset };
}

interface QueryState {
  status: QueryStatus;
  initialized: boolean;
  data: RecordsByDate | undefined;
  groupedOffset: number;
  searchPage: number;
  /** Date the user jumped to while its records are still being fetched. */
  seekingDateKey: string | undefined;
}

type QueryAction =
  | { type: 'START_INITIAL_LOAD' }
  | { type: 'START_LOAD_MORE' }
  | { type: 'START_SEEK'; dateKey: string }
  | { type: 'RECEIVE_PARTIAL_RESULTS'; records: RecordsByDate; merge: boolean }
  | {
      type: 'GROUPED_QUERY_SUCCESS';
      records: RecordsByDate;
      lastOffset: number;
      hasMore: boolean;
      merge: boolean;
    }
  | {
      type: 'SEARCH_QUERY_SUCCESS';
      records: RecordsByDate;
      page: number;
      hasMore: boolean;
      merge: boolean;
    }
  | { type: 'VECTOR_SEARCH_SUCCESS'; records: RecordsByDate }
  | { type: 'QUERY_ERROR' }
  | { type: 'RESET_PAGINATION' };

function queryReducer(state: QueryState, action: QueryAction): QueryState {
  switch (action.type) {
    case 'START_INITIAL_LOAD':
      return { ...state, status: QueryStatus.LOADING };

    case 'START_LOAD_MORE':
      return { ...state, status: QueryStatus.LOADING_MORE };

    case 'START_SEEK':
      return {
        ...state,
        status: QueryStatus.LOADING,
        groupedOffset: 0,
        seekingDateKey: action.dateKey,
      };

    case 'RECEIVE_PARTIAL_RESULTS':
      return {
        ...state,
        initialized: true,
        data: action.merge
          ? mergeRecordsByDate(state.data, action.records)
          : action.records,
      };

    case 'GROUPED_QUERY_SUCCESS':
      return {
        ...state,
        initialized: true,
        data: action.merge
          ? mergeRecordsByDate(state.data, action.records)
          : action.records,
        groupedOffset: action.lastOffset,
        seekingDateKey: undefined,
        status: action.hasMore
          ? QueryStatus.SUCCESS
          : QueryStatus.COMPLETE_HIDE_LOAD_MORE,
      };

    case 'SEARCH_QUERY_SUCCESS':
      return {
        ...state,
        initialized: true,
        data: action.merge
          ? mergeRecordsByDate(state.data, action.records)
          : action.records,
        searchPage: action.page,
        status: action.hasMore
          ? QueryStatus.SUCCESS
          : QueryStatus.COMPLETE_HIDE_LOAD_MORE,
      };

    case 'VECTOR_SEARCH_SUCCESS':
      return {
        ...state,
        initialized: true,
        data: action.records,
        status: QueryStatus.COMPLETE_HIDE_LOAD_MORE,
      };

    case 'QUERY_ERROR':
      return { ...state, status: QueryStatus.ERROR, seekingDateKey: undefined };

    case 'RESET_PAGINATION':
      return {
        ...state,
        status: QueryStatus.LOADING,
        groupedOffset: 0,
        searchPage: 0,
        seekingDateKey: undefined,
      };

    default:
      return state;
  }
}

const initialState: QueryState = {
  status: QueryStatus.IDLE,
  initialized: false,
  data: undefined,
  groupedOffset: 0,
  searchPage: 0,
  seekingDateKey: undefined,
};

async function executeGroupedQuery(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  minCompleteDays: number,
  offset: number,
  loadMore: boolean,
  typeFilter: TimelineRecordTypeFilter,
  maxDate: string | undefined,
  dispatch: React.Dispatch<QueryAction>,
) {
  console.debug('useRecordQuery: grouped view', {
    offset,
    loadMore,
    typeFilter,
    maxDate,
  });

  const result = await fetchRecordsUntilCompleteDays(
    db,
    userId,
    minCompleteDays,
    offset,
    3000,
    (partial) => {
      console.debug('useRecordQuery: received partial results', {
        days: Object.keys(partial.records).length,
        lastOffset: partial.lastOffset,
      });
      dispatch({
        type: 'RECEIVE_PARTIAL_RESULTS',
        records: partial.records,
        merge: loadMore,
      });
    },
    loadMore,
    typeFilter,
    maxDate,
  );

  console.debug('useRecordQuery: grouped result', {
    days: Object.keys(result.records).length,
    hasMore: result.hasMore,
    lastOffset: result.lastOffset,
  });

  dispatch({
    type: 'GROUPED_QUERY_SUCCESS',
    records: result.records,
    lastOffset: result.lastOffset,
    hasMore: result.hasMore,
    merge: loadMore,
  });
}

async function executeSearchQuery(
  db: RxDatabase<DatabaseCollections>,
  userId: string,
  query: string,
  page: number,
  loadMore: boolean,
  typeFilter: TimelineRecordTypeFilter,
  vectorSearchConfig: {
    vectorStorage: VectorStorage<DatabaseCollections> | undefined;
    enableVectorSearch: boolean | undefined;
    enableAISemanticSearch: boolean;
  },
  dispatch: React.Dispatch<QueryAction>,
): Promise<boolean> {
  console.debug('useRecordQuery: search query', {
    query,
    page,
    loadMore,
    typeFilter,
  });

  let records = await fetchRecords(db, userId, query, page, typeFilter);
  const hasNoResults = Object.keys(records).length === 0;

  if (hasNoResults && shouldFallbackToVectorSearch(vectorSearchConfig)) {
    dispatch({ type: 'START_INITIAL_LOAD' });

    records = (
      await fetchRecordsWithVectorSearch({
        db,
        vectorStorage:
          vectorSearchConfig.vectorStorage as VectorStorage<DatabaseCollections>,
        query,
        userId,
        numResults: 20,
        enableSearchAttachments: true,
        groupByDate: true,
        typeFilter,
      })
    ).records;

    dispatch({ type: 'VECTOR_SEARCH_SUCCESS', records });
    return true;
  }

  const recordCount = Object.values(records).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );
  const hasMore = recordCount >= PAGE_SIZE;

  console.debug('useRecordQuery: search result', {
    recordCount,
    hasMore,
    page,
  });

  dispatch({
    type: 'SEARCH_QUERY_SUCCESS',
    records,
    page,
    hasMore,
    merge: loadMore,
  });

  return false;
}

function shouldFallbackToVectorSearch(config: {
  vectorStorage: VectorStorage<DatabaseCollections> | undefined;
  enableVectorSearch: boolean | undefined;
  enableAISemanticSearch: boolean;
}): boolean {
  return !!(
    config.vectorStorage &&
    config.enableVectorSearch &&
    config.enableAISemanticSearch
  );
}

/**
 * Manages record fetching for the timeline view with two distinct modes:
 *
 * **Grouped View** (no query): Fetches records grouped by date with incremental loading.
 * Uses a 3-second timeout with the following behavior:
 * - Normal: Fetches until `minCompleteDays` complete days are loaded
 * - Timeout with 1+ complete days: Returns only complete days immediately
 * - Timeout with 0 complete days: Emits partial results while continuing to fetch
 *
 * A day is "complete" when we've confirmed no more records exist for that date
 * (by seeing a record from a different date in the sorted results).
 *
 * **Search View** (with query): Fetches records matching the query with pagination.
 * Falls back to vector search if text search returns no results and AI search is enabled.
 *
 * **Jumping** (`jumpToDate`): re-anchors the grouped pager at an arbitrary
 * date instead of the newest record, so the "Jump To" rail can reach periods
 * that have not been paged in yet. The loaded set is replaced rather than
 * merged: merging a far-off period into the current one would leave a silent
 * hole in the timeline where the skipped years should be.
 *
 * @param query - Search query string. Empty string triggers grouped view mode.
 * @param enableAISemanticSearch - Whether to fall back to vector search on empty results
 * @param minCompleteDays - Minimum number of complete days to fetch in grouped view (default: 3)
 */
export function useRecordQuery(
  query: string,
  enableAISemanticSearch?: boolean,
  typeFilter: TimelineRecordTypeFilter = 'all',
  minCompleteDays = 3,
): {
  data: RecordsByDate | undefined;
  status: QueryStatus;
  initialized: boolean;
  loadNextPage: () => void;
  /**
   * Advances every time a page is committed. The scroll loader re-arms on it:
   * without it the loader is edge-triggered on the sentinel entering view, so a
   * page that adds less content than the sentinel's 900px margin leaves the
   * sentinel in view, nothing changes, and the timeline stops paging for good.
   */
  pageCursor: number;
  jumpToDate: (dateKey: string) => void;
  seekingDateKey: string | undefined;
  showIndividualItems: boolean;
} {
  const db = useRxDb();
  const { experimental__use_openai_rag } = useLocalConfig();
  const user = useUser();
  const vectorStorage = useVectors();
  const requestIdRef = useRef(0);
  // Held in a ref, not reducer state: `execQuery` has to read the window the
  // moment a jump is requested, before a dispatch could be reflected in state.
  const groupedMaxDateRef = useRef<string | undefined>(undefined);

  const [state, dispatch] = useReducer(queryReducer, initialState);

  const isGroupedView = !query;
  const showIndividualItems = !isGroupedView;

  const execQuery = useCallback(
    async (loadMore: boolean) => {
      if (loadMore && state.status !== QueryStatus.SUCCESS) {
        return;
      }

      const thisRequestId = ++requestIdRef.current;

      const guardedDispatch: typeof dispatch = (action) => {
        if (requestIdRef.current !== thisRequestId) {
          console.debug('useRecordQuery: ignoring stale response');
          return;
        }
        dispatch(action);
      };

      guardedDispatch(
        loadMore ? { type: 'START_LOAD_MORE' } : { type: 'START_INITIAL_LOAD' },
      );

      try {
        if (isGroupedView) {
          const offset = loadMore ? state.groupedOffset : 0;
          await executeGroupedQuery(
            db,
            user.id,
            minCompleteDays,
            offset,
            loadMore,
            typeFilter,
            groupedMaxDateRef.current,
            guardedDispatch,
          );
        } else {
          const page = loadMore ? state.searchPage + 1 : 0;
          await executeSearchQuery(
            db,
            user.id,
            query,
            page,
            loadMore,
            typeFilter,
            {
              vectorStorage,
              enableVectorSearch: experimental__use_openai_rag,
              enableAISemanticSearch: !!enableAISemanticSearch,
            },
            guardedDispatch,
          );
        }
      } catch (e) {
        console.error(e);
        guardedDispatch({ type: 'QUERY_ERROR' });
      }
    },
    [
      db,
      user.id,
      query,
      isGroupedView,
      state.groupedOffset,
      state.searchPage,
      state.status,
      minCompleteDays,
      typeFilter,
      vectorStorage,
      experimental__use_openai_rag,
      enableAISemanticSearch,
    ],
  );

  const execQueryRef = useRef(execQuery);
  execQueryRef.current = execQuery;

  const loadNextPage = useDebounceCallback(
    () => execQueryRef.current(true),
    300,
  );

  const jumpToDate = useCallback((dateKey: string) => {
    groupedMaxDateRef.current = timelineDateKeyUpperBound(dateKey);
    dispatch({ type: 'START_SEEK', dateKey });
    execQueryRef.current(false);
  }, []);

  // Manual add/edit/delete bumps this tick so the timeline refreshes in
  // place instead of requiring a full page reload.
  const recordChangeTick = useRecordChangeTick();

  useEffect(() => {
    // A new query, filter or record edit starts the timeline over, so drop any
    // period the user had jumped to and page from the newest record again.
    groupedMaxDateRef.current = undefined;
    dispatch({ type: 'RESET_PAGINATION' });
    execQueryRef.current(false);
  }, [query, enableAISemanticSearch, typeFilter, recordChangeTick]);

  return {
    data: state.data,
    status: state.status,
    initialized: state.initialized,
    loadNextPage,
    pageCursor: isGroupedView ? state.groupedOffset : state.searchPage,
    jumpToDate,
    seekingDateKey: state.seekingDateKey,
    showIndividualItems,
  };
}

export function useTimelineDateKeys(
  enabled: boolean,
  typeFilter: TimelineRecordTypeFilter = 'all',
): string[] | undefined {
  const db = useRxDb();
  const user = useUser();
  const requestIdRef = useRef(0);
  const [dateKeys, setDateKeys] = useState<string[] | undefined>();

  useEffect(() => {
    if (!enabled) {
      setDateKeys(undefined);
      return;
    }

    const requestId = ++requestIdRef.current;
    setDateKeys(undefined);

    fetchTimelineDateKeys(db, user.id, typeFilter)
      .then((keys) => {
        if (requestIdRef.current === requestId) {
          setDateKeys(keys);
        }
      })
      .catch((error) => {
        console.error(error);
        if (requestIdRef.current === requestId) {
          setDateKeys(undefined);
        }
      });
  }, [db, enabled, typeFilter, user.id]);

  return dateKeys;
}
