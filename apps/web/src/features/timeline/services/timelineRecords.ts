import { format, parseISO } from 'date-fns';
import { BundleEntry, FhirResource } from 'fhir/r2';
import { MangoQuerySelector, RxDatabase, RxDocument } from 'rxdb';
import { IVSSimilaritySearchParams, VectorStorage } from '@mere/vector-storage';

import { DatabaseCollections } from '../../../app/providers/DatabaseCollections';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { TimelineRecordTypeFilter } from '../types';

export const PAGE_SIZE = 50;

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
        'data_record.resource_type':
          typeFilter === 'all'
            ? {
                $nin: ['patient', 'provenance'],
              }
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
      groupedRecords[minDate] = [...(groupedRecords[minDate] ?? []), mutableDoc];
      return;
    }

    const date = item.get('metadata')?.date
      ? format(parseISO(item.get('metadata')?.date), 'yyyy-MM-dd')
      : '-1';
    groupedRecords[date] = [...(groupedRecords[date] ?? []), mutableDoc];
  });

  try {
    return {
      records: Object.keys(groupedRecords)
        .sort((a, b) => {
          const aDate = parseISO(a);
          const bDate = parseISO(b);
          if (aDate > bDate) return -1;
          if (aDate < bDate) return 1;
          return 0;
        })
        .reduce(
          (obj, key) => {
            obj[key] = groupedRecords[key];
            return obj;
          },
          {} as Record<
            string,
            ClinicalDocument<BundleEntry<FhirResource>>[]
          >,
        ),
      idsOfMostRelatedChunksFromSemanticSearch: ids,
    };
  } catch (e) {
    console.error(e);
  }

  return {
    records: groupedRecords,
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
    'data_record.resource_type': {
      $nin: [
        'patient',
        'documentreference_attachment',
        'provenance',
      ],
    },
    'metadata.date': { $nin: [null, undefined, ''] },
  };

  if (typeFilter !== 'all') {
    selector['data_record.resource_type'] = typeFilter;
  }

  if (parsedQuery) {
    if (typeFilter === 'all') {
      selector['data_record.resource_type']['$nin'] = [
        'patient',
        'documentreference_attachment',
        'provenance',
      ];
    }
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

  (list as unknown as RxDocument<
    ClinicalDocument<BundleEntry<FhirResource>>
  >[]).forEach((item) => {
    if (item.get('metadata')?.date === undefined) {
      console.warn('Date is undefined for object:', item.toJSON());
      return;
    }

    const date = item.get('metadata')?.date
      ? format(parseISO(item.get('metadata')?.date), 'yyyy-MM-dd')
      : '-1';
    groupedRecords[date] = [
      ...(groupedRecords[date] ?? []),
      item.toMutableJSON() as ClinicalDocument<BundleEntry<FhirResource>>,
    ];
  });

  return groupedRecords;
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
