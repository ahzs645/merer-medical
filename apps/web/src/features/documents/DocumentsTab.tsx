import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRightIcon,
  DocumentMagnifyingGlassIcon,
  DocumentPlusIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { BundleEntry, DiagnosticReport, DocumentReference } from 'fhir/r2';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import { ErrorPanel } from '../../shared/components/StatusPanel';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { useRecordChangeTick } from '../../shared/utils/recordChangeSignal';

type DocumentRecord = ClinicalDocument<BundleEntry<DocumentReference>>;
type AttachmentRecord = ClinicalDocument<string | Blob>;
type ReportRecord = ClinicalDocument<BundleEntry<DiagnosticReport>>;

type DocumentItem = {
  document: DocumentRecord;
  attachment?: AttachmentRecord;
  connection?: ConnectionDocument;
  linkedReports: ReportRecord[];
  linkedRecords: ClinicalDocument[];
};

type DocumentSection = {
  key: string;
  title: string;
  description: string;
  items: DocumentItem[];
};

export function DocumentsTab() {
  const { t } = useInterfaceLanguage();
  const [query, setQuery] = useState('');
  const { items, status, error } = useDocumentsData();

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;

    return items.filter((item) =>
      [
        item.document.metadata?.display_name,
        getMetadataString(item.document, 'source_image'),
        item.attachment?.metadata?.display_name,
        item.attachment?.data_record.content_type,
        ...item.linkedReports.map((report) => report.metadata?.display_name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [items, query]);
  const sections = useMemo(
    () => buildDocumentSections(filteredItems),
    [filteredItems],
  );

  return (
    <AppPage
      banner={
        <DocumentsHeader
          totalCount={items.length}
          query={query}
          setQuery={setQuery}
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
              {t('Loading documents...')}
            </div>
          ) : status === 'error' ? (
            <ErrorPanel error={error} />
          ) : filteredItems.length > 0 ? (
            <>
              {sections.map((section) => (
                <DocumentSectionList key={section.key} section={section} />
              ))}
            </>
          ) : (
            <div className="rounded-md bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('No matching documents')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {t(
                  'Imported PDFs, images, and clinical documents will appear here when they are synced or added.',
                )}
              </p>
              <Link
                to={`${AppRoutes.AddRecord}?type=document`}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
              >
                <DocumentPlusIcon className="h-5 w-5" />
                {t('Upload document')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function DocumentSectionList({ section }: { section: DocumentSection }) {
  const { t } = useInterfaceLanguage();

  if (section.items.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-gray-200">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {t(section.title)}
            </h2>
            <p className="text-sm text-gray-600">{t(section.description)}</p>
          </div>
          <span className="text-sm font-medium text-gray-500">
            {section.items.length} {t('items')}
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {section.items.map((item) => (
          <DocumentItemCard key={item.document.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function useDocumentsData() {
  const db = useRxDb();
  const user = useUser();
  // Refetch when a manual record is added, edited, or deleted.
  const recordChangeTick = useRecordChangeTick();
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchDocuments() {
      setStatus('loading');
      setError(null);
      const [
        documentDocs,
        attachmentDocs,
        reportDocs,
        connectionDocs,
        allDocs,
      ] = await Promise.all([
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': 'documentreference',
            },
            sort: [{ 'metadata.date': 'desc' }],
          })
          .exec(),
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': 'documentreference_attachment',
            },
          })
          .exec(),
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': 'diagnosticreport',
            },
          })
          .exec(),
        db.connection_documents
          .find({
            selector: {
              user_id: user.id,
            },
          })
          .exec(),
        db.clinical_documents.find({ selector: { user_id: user.id } }).exec(),
      ]);

      if (!isMounted) return;

      // Records that point back to a document via metadata.source_document_id,
      // grouped by the document they reference.
      const linkedRecordsByDocId = new Map<string, ClinicalDocument[]>();
      for (const doc of allDocs) {
        const record = doc.toMutableJSON() as ClinicalDocument;
        const sourceId = (record.metadata as Record<string, unknown>)?.[
          'source_document_id'
        ];
        if (typeof sourceId !== 'string' || !sourceId) continue;
        const list = linkedRecordsByDocId.get(sourceId) ?? [];
        list.push(record);
        linkedRecordsByDocId.set(sourceId, list);
      }

      const attachmentsByMetadataId = new Map(
        attachmentDocs.map((doc) => {
          const item = doc.toMutableJSON() as AttachmentRecord;
          return [item.metadata?.id, item] as const;
        }),
      );
      const reports = reportDocs.map(
        (doc) => doc.toMutableJSON() as ReportRecord,
      );
      const connectionsById = new Map(
        connectionDocs.map((doc) => {
          const item = doc.toMutableJSON() as ConnectionDocument;
          return [item.id, item] as const;
        }),
      );

      const referencedAttachmentIds = new Set<string>();
      const wrappedItems = documentDocs.map((doc) => {
        const document = doc.toMutableJSON() as DocumentRecord;
        const resource = getFhirResource<any>(document);
        const attachmentUrl = resource?.content?.[0]?.attachment?.url;
        if (attachmentUrl) referencedAttachmentIds.add(attachmentUrl);
        const attachment = attachmentUrl
          ? attachmentsByMetadataId.get(attachmentUrl)
          : undefined;
        return {
          document,
          attachment,
          connection: connectionsById.get(document.connection_record_id),
          linkedReports: reports.filter((report) =>
            reportUsesAttachment(report, attachmentUrl),
          ),
          linkedRecords:
            linkedRecordsByDocId.get(document.metadata?.id || '') || [],
        };
      });

      // Manually uploaded files are standalone `documentreference_attachment`
      // records with no DocumentReference wrapper. Surface them as documents in
      // their own right (skipping embedded source attachments already wrapped).
      const standaloneItems: DocumentItem[] = attachmentDocs
        .map((doc) => doc.toMutableJSON() as AttachmentRecord)
        .filter(
          (att) =>
            att.metadata?.id && !referencedAttachmentIds.has(att.metadata.id),
        )
        .map((att) => ({
          document: att as unknown as DocumentRecord,
          attachment: att,
          connection: connectionsById.get(att.connection_record_id),
          linkedReports: [],
          linkedRecords: linkedRecordsByDocId.get(att.metadata?.id || '') || [],
        }));

      setItems([...wrappedItems, ...standaloneItems]);
      setStatus('success');
    }

    fetchDocuments().catch((e) => {
      if (!isMounted) return;
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus('error');
    });

    return () => {
      isMounted = false;
    };
  }, [db, user.id, recordChangeTick]);

  return { items, status, error };
}

function DocumentsHeader({
  totalCount,
  query,
  setQuery,
}: {
  totalCount: number;
  query: string;
  setQuery: (query: string) => void;
}) {
  const { language, t } = useInterfaceLanguage();
  const isRtl = language === 'ar';

  return (
    <div className="bg-primary-800 px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="h-7 w-7" />
            <h1 className="text-2xl font-semibold">{t('Documents')}</h1>
          </div>
          <p className="mt-1 text-sm text-primary-100">
            {totalCount} {t('documents')}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row md:max-w-2xl">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">{t('Search documents')}</span>
            <MagnifyingGlassIcon
              className={`pointer-events-none absolute top-2.5 h-5 w-5 text-gray-400 ${
                isRtl ? 'right-3' : 'left-3'
              }`}
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Search documents, source files, reports')}
              className={`block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm ${
                isRtl ? 'pl-3 pr-10' : 'pl-10 pr-3'
              }`}
            />
          </label>
          <Link
            to={`${AppRoutes.AddRecord}?type=document`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-inset ring-primary-100 hover:bg-primary-50"
          >
            <DocumentPlusIcon className="h-5 w-5" />
            {t('Upload document')}
          </Link>
        </div>
      </div>
    </div>
  );
}

function DocumentItemCard({ item }: { item: DocumentItem }) {
  const { t } = useInterfaceLanguage();
  const attachment = item.attachment;
  const resource = getFhirResource<any>(item.document);
  const attachmentMetadata = resource?.content?.[0]?.attachment;
  const detailLink = `${AppRoutes.Documents}/detail/${encodeURIComponent(
    item.document.metadata?.id || item.document.id,
  )}`;

  return (
    <Link
      to={detailLink}
      className="flex items-center gap-3 bg-white px-4 py-3 hover:bg-primary-50"
    >
      <DocumentMagnifyingGlassIcon className="h-5 w-5 shrink-0 text-primary-700" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-gray-900">
          {item.document.metadata?.display_name ||
            attachmentMetadata?.title ||
            t('Untitled document')}
        </h2>
        <p className="truncate text-xs text-gray-500">
          {safeFormatDate(item.document.metadata?.date, 'PP', '')}
          {attachmentMetadata?.title ||
          getMetadataString(item.document, 'source_image')
            ? ` · ${attachmentMetadata?.title || getMetadataString(item.document, 'source_image')}`
            : ''}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-1.5 text-xs font-medium sm:flex">
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
          {(
            attachment?.data_record.content_type ||
            attachmentMetadata?.contentType ||
            'meta'
          )
            .toString()
            .replace('application/', '')
            .replace('image/', '')}
        </span>
        {item.linkedReports.length > 0 && (
          <span className="rounded bg-primary-50 px-1.5 py-0.5 text-primary-700">
            {item.linkedReports.length} {t('reports')}
          </span>
        )}
        {item.linkedRecords.length > 0 && (
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
            {item.linkedRecords.length} {t('records')}
          </span>
        )}
      </div>
      <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-400" />
    </Link>
  );
}

function buildDocumentSections(items: DocumentItem[]): DocumentSection[] {
  const letters: DocumentItem[] = [];
  const forms: DocumentItem[] = [];
  const reports: DocumentItem[] = [];
  const other: DocumentItem[] = [];

  for (const item of items) {
    const text = [
      item.document.metadata?.display_name,
      item.attachment?.metadata?.display_name,
      getMetadataString(item.document, 'source_image'),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (/\b(letter|message|correspondence|referral)\b/.test(text)) {
      letters.push(item);
    } else if (
      /\b(consent|form|signed|authorization|questionnaire)\b/.test(text)
    ) {
      forms.push(item);
    } else if (
      item.linkedReports.length > 0 ||
      /\b(report|result|visit|summary)\b/.test(text)
    ) {
      reports.push(item);
    } else {
      other.push(item);
    }
  }

  return [
    {
      key: 'letters',
      title: 'Letters and referrals',
      description: 'Inbox-style clinical correspondence separated from files.',
      items: letters,
    },
    {
      key: 'forms',
      title: 'Consents and forms',
      description: 'Forms, signed documents, and authorization paperwork.',
      items: forms,
    },
    {
      key: 'reports',
      title: 'Reports and visit records',
      description: 'Documents linked to reports, visits, or result summaries.',
      items: reports,
    },
    {
      key: 'other',
      title: 'Other documents',
      description: 'General uploaded or imported files.',
      items: other,
    },
  ];
}

function reportUsesAttachment(report: ReportRecord, attachmentUrl?: string) {
  const resource = getFhirResource<any>(report);
  const presentedForms = resource?.presentedForm || [];
  if (attachmentUrl) {
    return presentedForms.some((form: any) => form.url === attachmentUrl);
  }
  return false;
}

function getMetadataString(
  document: ClinicalDocument<unknown>,
  key: string,
): string | undefined {
  const value = (document.metadata as Record<string, unknown> | undefined)?.[
    key
  ];
  return typeof value === 'string' ? value : undefined;
}
