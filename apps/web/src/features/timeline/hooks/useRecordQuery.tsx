import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
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
  PAGE_SIZE,
} from '../services/timelineRecords';
import { getTimelineCategories } from '../utils/timelineCategories';
import { timelineDateKeyUpperBound } from '../utils/timelineDates';

export const GROUPED_VIEW_BATCH_SIZE = 250;

/**
 * Reference master-data surfaced in the Providers & locations directory, plus
 * app plumbing, rather than dated events worth a card.
 *
 * `careplan` is deliberately absent: the grouped card renders a "Care Plans"
 * section, the type filter offers "Care plans", and the Records section links
 * to them, so excluding them here only made the category unreachable from the
 * unfiltered timeline.
 */
const NON_TIMELINE_RESOURCE_TYPES = [
  'patient',
  'provenance',
  'location',
  'practitioner',
  'organization',
];

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
  return format(parseISO(record.metadata.date), 'yyyy-MM-dd');
}

export function groupRecordsByDate(
  records: ClinicalDocument<BundleEntry<FhirResource>>[],
): Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]> {
  const grouped: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]> =
    {};

  for (const record of records) {
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
      sort: [{ 'metadata.date': 'desc' }],
    })
    .exec();

  const byDateKey = new Map<
    string,
    ClinicalDocument<BundleEntry<FhirResource>>[]
  >();
  for (const doc of docs) {
    const date = doc.get('metadata')?.date;
    if (!date) continue;
    const dateKey = format(parseISO(date), 'yyyy-MM-dd');
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

  return [...byDateKey.entries()]
    .filter(([, items]) => getTimelineCategories(items).length > 0)
    .map(([dateKey]) => dateKey);
}

export function mergeRecordsByDate(
  existing:
    | Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]>
    | undefined,
  incoming: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]>,
): Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]> {
  if (!existing) return incoming;
  const merged = { ...existing };
  for (const [dateKey, records] of Object.entries(incoming)) {
    if (!merged[dateKey]) {
      merged[dateKey] = records;
      continue;
    }

    const existingIds = new Set(merged[dateKey].map((record) => record.id));
    merged[dateKey] = [
      ...merged[dateKey],
      ...records.filter((record) => !existingIds.has(record.id)),
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
      newestDate = dateKey;
      uniqueDates.add(dateKey);
    }

    allRecords.push(...batch);
    offset += batch.length;

    if (emitPartialBatches && onPartialResults) {
      onPartialResults({
        records: groupRecordsByDate(allRecords),
        hasMore: true,
        lastOffset: offset,
      });
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
      const sortedDates = Object.keys(grouped).sort((a, b) =>
        b.localeCompare(a),
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
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

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
