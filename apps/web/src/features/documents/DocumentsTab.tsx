import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { BundleEntry, DiagnosticReport, DocumentReference } from 'fhir/r2';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import { Modal } from '../../shared/components/Modal';
import { ModalHeader } from '../../shared/components/ModalHeader';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { EmbeddedAttachmentViewer } from '../timeline/components/document-reference/EmbeddedAttachmentViewer';
import { getFhirResource } from '../../shared/utils/fhirResource';

type DocumentRecord = ClinicalDocument<BundleEntry<DocumentReference>>;
type AttachmentRecord = ClinicalDocument<string | Blob>;
type ReportRecord = ClinicalDocument<BundleEntry<DiagnosticReport>>;

type DocumentItem = {
  document: DocumentRecord;
  attachment?: AttachmentRecord;
  linkedReports: ReportRecord[];
};

export function DocumentsTab() {
  const { t } = useInterfaceLanguage();
  const [query, setQuery] = useState('');
  const { items, status } = useDocumentsData();

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
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <DocumentItemCard key={item.document.id} item={item} />
            ))
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
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function useDocumentsData() {
  const db = useRxDb();
  const user = useUser();
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let isMounted = true;

    async function fetchDocuments() {
      setStatus('loading');
      const [documentDocs, attachmentDocs, reportDocs] = await Promise.all([
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
      ]);

      if (!isMounted) return;

      const attachmentsByMetadataId = new Map(
        attachmentDocs.map((doc) => {
          const item = doc.toMutableJSON() as AttachmentRecord;
          return [item.metadata?.id, item] as const;
        }),
      );
      const reports = reportDocs.map(
        (doc) => doc.toMutableJSON() as ReportRecord,
      );

      setItems(
        documentDocs.map((doc) => {
          const document = doc.toMutableJSON() as DocumentRecord;
          const resource = getFhirResource<any>(document);
          const attachmentUrl = resource?.content?.[0]?.attachment?.url;
          const attachment = attachmentUrl
            ? attachmentsByMetadataId.get(attachmentUrl)
            : undefined;
          return {
            document,
            attachment,
            linkedReports: reports.filter((report) =>
              reportUsesAttachment(report, attachmentUrl),
            ),
          };
        }),
      );
      setStatus('success');
    }

    fetchDocuments();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  return { items, status };
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
    <div className="bg-primary-700 px-4 py-5 text-white sm:px-6 lg:px-8">
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
        <label className="relative block w-full min-w-0 md:max-w-xl">
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
      </div>
    </div>
  );
}

function DocumentItemCard({ item }: { item: DocumentItem }) {
  const { t } = useInterfaceLanguage();
  const [expanded, setExpanded] = useState(false);
  const attachment = item.attachment;
  const resource = getFhirResource<any>(item.document);
  const attachmentMetadata = resource?.content?.[0]?.attachment;

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full rounded-md bg-white p-4 text-left shadow-sm ring-1 ring-gray-200 hover:ring-primary-300"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-primary-700">
              <DocumentMagnifyingGlassIcon className="h-5 w-5 shrink-0" />
              <h2 className="truncate text-base font-semibold">
                {item.document.metadata?.display_name ||
                  attachmentMetadata?.title ||
                  t('Untitled document')}
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {safeFormatDate(item.document.metadata?.date, 'PP', '')}
            </p>
            <p className="mt-1 break-words text-xs text-gray-500">
              {attachmentMetadata?.title ||
                getMetadataString(item.document, 'source_image')}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 text-xs font-medium">
            <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
              {attachment?.data_record.content_type ||
                attachmentMetadata?.contentType ||
                t('metadata only')}
            </span>
            <span
              className={`rounded px-2 py-1 ${
                attachment
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {attachment ? t('Embedded') : t('Not embedded')}
            </span>
            <span className="rounded bg-primary-50 px-2 py-1 text-primary-700">
              {item.linkedReports.length} {t('linked reports')}
            </span>
          </div>
        </div>
        {item.linkedReports.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.linkedReports.map((report) => (
              <Link
                key={report.id}
                to={getTimelineDateLink(report.metadata?.date)}
                onClick={(event) => event.stopPropagation()}
                className="rounded bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-primary-50 hover:text-primary-700"
              >
                {report.metadata?.display_name || t('Linked report')}
              </Link>
            ))}
          </div>
        )}
      </button>
      <Modal open={expanded} setOpen={setExpanded}>
        <div className="flex flex-col">
          <ModalHeader
            title={
              item.document.metadata?.display_name ||
              attachmentMetadata?.title ||
              t('Document')
            }
            setClose={() => setExpanded(false)}
          />
          <div className="max-h-full scroll-py-3 p-3">
            <div className="rounded-lg border border-solid border-gray-200">
              {attachment || attachmentMetadata?.data ? (
                <EmbeddedAttachmentViewer
                  attachment={{
                    contentType:
                      attachment?.data_record.content_type ||
                      attachmentMetadata?.contentType,
                    raw: attachment?.data_record.raw || attachmentMetadata?.data,
                    title:
                      attachmentMetadata?.title ||
                      item.document.metadata?.display_name,
                  }}
                />
              ) : (
                <div className="space-y-3 p-4 text-sm text-gray-700">
                  <p>{t('The source record has metadata but no embedded file.')}</p>
                  <p className="break-words">
                    {attachmentMetadata?.url || item.document.metadata?.id}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
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

function getTimelineDateLink(date?: string): string {
  if (!date) return AppRoutes.Timeline;
  return `${AppRoutes.Timeline}#${safeFormatDate(date, 'MMM-dd-yyyy', '')}`;
}
