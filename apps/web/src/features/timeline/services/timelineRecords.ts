import { BundleEntry, FhirResource } from 'fhir/r2';
import { MangoQuerySelector, RxDatabase, RxDocument } from 'rxdb';
import { IVSSimilaritySearchParams, VectorStorage } from '@mere/vector-storage';

import { DatabaseCollections } from '../../../app/providers/DatabaseCollections';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { TimelineRecordTypeFilter } from '../types';
import {
  compareTimelineDateKeysDesc,
  timelineDateKey,
} from '../utils/timelineDates';

export const PAGE_SIZE = 50;

/**
 * Reference master-data surfaced in the Providers & locations directory, plus
 * app plumbing, rather than dated events worth a card.
 *
 * `careplan` is deliberately absent: the grouped card renders a "Care Plans"
 * section, the type filter offers "Care plans", and the Records section links
 * to them, so excluding them here only made the category unreachable from the
 * unfiltered timeline.
 */
export const NON_TIMELINE_RESOURCE_TYPES = [
  'patient',
  'provenance',
  'location',
  'practitioner',
  'organization',
];

/**
 * Text search hides the same types the grouped timeline does — nothing renders
 * a `location` or `practitioner`, so matching one only produced a blank card —
 * plus attachment chunks, whose display name is the parent document's and
 * would list every result twice. Semantic search keeps attachments on purpose:
 * matching inside an attachment's text is the whole point of it.
 */
const NON_SEARCHABLE_RESOURCE_TYPES = [
  ...NON_TIMELINE_RESOURCE_TYPES,
  'documentreference_attachment',
];

export async function fetchRecordsWithVectorSearch({
  db,
  vectorStorage,
  query,
  userId,
  numResults = 10,
  enableSearchAttachments = false,
  groupByDate = true,
  typeFilter = 'all',
}: {
  db: RxDatabase<DatabaseCollections>;
  vectorStorage: VectorStorage<any>;
  query?: string;
  userId?: string;
  numResults?: number;
  enableSearchAttachments?: boolean;
  groupByDate?: boolean;
  typeFilter?: TimelineRecordTypeFilter;
}): Promise<{
  records: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]>;
  idsOfMostRelatedChunksFromSemanticSearch: string[];
}> {
  if (!query) {
    return {
      records: {},
      idsOfMostRelatedChunksFromSemanticSearch: [],
    };
  }

  let searchParams: IVSSimilaritySearchParams = {
    query,
    k: numResults,
  };

  const includeFilter: Record<string, any> = {};
  if (userId) {
    includeFilter['user_id'] = userId;
  }

  if (!enableSearchAttachments) {
    searchParams = {
      ...searchParams,
      filterOptions: {
        include: {
          metadata: includeFilter,
        },
        exclude: {
          metadata: {
            category: 'documentreference_attachment',
          },
        },
      },
    };
  } else if (userId) {
    searchParams = {
      ...searchParams,
      filterOptions: {
        include: {
          metadata: includeFilter,
        },
      },
    };
  }

  const results = await vectorStorage.similaritySearch(searchParams);
  const filteredItems = results.similarItems;
  const ids = filteredItems.map((item) => item.id);
  const docIdToChunks = new Map<string, { id: string; metadata?: any }[]>();

  filteredItems.forEach((item) => {
    const documentId = item.metadata?.['documentId'];
    if (documentId) {
      if (!docIdToChunks.has(documentId)) {
        docIdToChunks.set(documentId, []);
      }
      docIdToChunks.get(documentId)!.push({
        id: item.id,
        metadata: item.metadata,
      });
    }
  });

  const docs = await db.clinical_documents
    .find({
      selector: {
        id: { $in: [...docIdToChunks.keys()] },
        // Attachments stay in — searching their text is the reason semantic
        // search exists — but the directory types are dropped for the same
        // reason as everywhere else: no card renders them.
        'data_record.resource_type':
          typeFilter === 'all'
            ? { $nin: NON_TIMELINE_RESOURCE_TYPES }
            : typeFilter,
      },
    })
    .exec();

  const lst = docs as unknown as RxDocument<
    ClinicalDocument<BundleEntry<FhirResource>>
  >[];

  if (!groupByDate) {
    return {
      records: {
        [new Date(0).toISOString()]: lst.map((item) =>
          withMatchedChunks(item, docIdToChunks),
        ),
      },
      idsOfMostRelatedChunksFromSemanticSearch: ids,
    };
  }

  const groupedRecords: Record<
    string,
    ClinicalDocument<BundleEntry<FhirResource>>[]
  > = {};

  lst.forEach((item) => {
    const mutableDoc = withMatchedChunks(item, docIdToChunks);

    if (item.get('metadata')?.date === undefined) {
      console.warn('Date is undefined for object:', item.toJSON());
      const minDate = new Date(0).toISOString();
      groupedRecords[minDate] = [
        ...(groupedRecords[minDate] ?? []),
        mutableDoc,
      ];
      return;
    }

    const date = item.get('metadata')?.date
      ? timelineDateKey(item.get('metadata')?.date)
      : '-1';
    groupedRecords[date] = [...(groupedRecords[date] ?? []), mutableDoc];
  });

  return {
    records: sortRecordsByDateKeyDesc(groupedRecords),
    idsOfMostRelatedChunksFromSemanticSearch: ids,
  };
}

export async function fetchRecords(
  db: RxDatabase<DatabaseCollections>,
  user_id: string,
  query?: string,
  page?: number,
  typeFilter: TimelineRecordTypeFilter = 'all',
): Promise<Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]>> {
  const parsedQuery = query?.trim() === '' ? undefined : query;
  let selector: MangoQuerySelector<ClinicalDocument<unknown>> = {
    user_id: user_id,
    'data_record.resource_type': { $nin: NON_SEARCHABLE_RESOURCE_TYPES },
    'metadata.date': { $nin: [null, undefined, ''] },
  };

  if (typeFilter !== 'all') {
    selector['data_record.resource_type'] = typeFilter;
  }

  if (parsedQuery) {
    selector = {
      ...selector,
      'metadata.display_name': { $regex: `.*${parsedQuery}.*`, $options: 'si' },
    };
  }

  const list = await db.clinical_documents
    .find({
      selector,
      sort: [{ 'metadata.date': 'desc' }],
    })
    .skip(page ? page * PAGE_SIZE : 0)
    .limit(PAGE_SIZE)
    .exec();

  const groupedRecords: Record<
    string,
    ClinicalDocument<BundleEntry<FhirResource>>[]
  > = {};

  (
    list as unknown as RxDocument<ClinicalDocument<BundleEntry<FhirResource>>>[]
  ).forEach((item) => {
    if (item.get('metadata')?.date === undefined) {
      console.warn('Date is undefined for object:', item.toJSON());
      return;
    }

    const date = item.get('metadata')?.date
      ? timelineDateKey(item.get('metadata')?.date)
      : '-1';
    groupedRecords[date] = [
      ...(groupedRecords[date] ?? []),
      item.toMutableJSON() as ClinicalDocument<BundleEntry<FhirResource>>,
    ];
  });

  return sortRecordsByDateKeyDesc(groupedRecords);
}

/**
 * Rebuilds the map newest day first. The grouping key is the local day while
 * the database sorts the raw stored date string, and the two disagree wherever
 * a date-only and a timestamped record share a UTC day — so the day order has
 * to come from the keys, not from the order the rows arrived in.
 */
function sortRecordsByDateKeyDesc(
  groupedRecords: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]>,
): Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]> {
  const sorted: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]> =
    {};
  for (const dateKey of Object.keys(groupedRecords).sort(
    compareTimelineDateKeysDesc,
  )) {
    sorted[dateKey] = groupedRecords[dateKey];
  }
  return sorted;
}

function withMatchedChunks(
  item: RxDocument<ClinicalDocument<BundleEntry<FhirResource>>>,
  docIdToChunks: Map<string, { id: string; metadata?: any }[]>,
) {
  const docId = item.get('id');
  const mutableDoc = item.toMutableJSON() as ClinicalDocument<
    BundleEntry<FhirResource>
  > & { matchedChunks?: { id: string; metadata?: any }[] };

  if (docIdToChunks.has(docId)) {
    mutableDoc.matchedChunks = docIdToChunks.get(docId);
  }

  return mutableDoc;
}
