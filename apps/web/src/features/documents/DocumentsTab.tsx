import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  DocumentMagnifyingGlassIcon,
  DocumentPlusIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { BundleEntry, DiagnosticReport, DocumentReference } from 'fhir/r2';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import { Modal } from '../../shared/components/Modal';
import { ModalHeader } from '../../shared/components/ModalHeader';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { EmbeddedAttachmentViewer } from '../timeline/components/document-reference/EmbeddedAttachmentViewer';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { ProvenancePanel } from '../provenance/ProvenancePanel';

type DocumentRecord = ClinicalDocument<BundleEntry<DocumentReference>>;
type AttachmentRecord = ClinicalDocument<string | Blob>;
type ReportRecord = ClinicalDocument<BundleEntry<DiagnosticReport>>;

type DocumentItem = {
  document: DocumentRecord;
  attachment?: AttachmentRecord;
  connection?: ConnectionDocument;
  linkedReports: ReportRecord[];
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
          ) : filteredItems.length > 0 ? (
            <>
              <DocumentActionCards />
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

function DocumentActionCards() {
  const { t } = useInterfaceLanguage();
  const cards = [
    {
      title: 'Letters and referrals',
      description: 'Provider letters, referral notes, and correspondence.',
      icon: ClipboardDocumentListIcon,
    },
    {
      title: 'Consents and forms',
      description: 'Signed forms, consent documents, and uploaded PDFs.',
      icon: ShieldCheckIcon,
    },
    {
      title: 'Related records',
      description: 'Open documents with linked reports and provenance.',
      icon: DocumentMagnifyingGlassIcon,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
          >
            <Icon className="h-6 w-6 text-primary-700" />
            <h2 className="mt-2 text-sm font-semibold text-gray-900">
              {t(card.title)}
            </h2>
            <p className="mt-1 text-sm text-gray-600">{t(card.description)}</p>
          </div>
        );
      })}
    </div>
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
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let isMounted = true;

    async function fetchDocuments() {
      setStatus('loading');
      const [documentDocs, attachmentDocs, reportDocs, connectionDocs] =
        await Promise.all([
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
      const connectionsById = new Map(
        connectionDocs.map((doc) => {
          const item = doc.toMutableJSON() as ConnectionDocument;
          return [item.id, item] as const;
        }),
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
            connection: connectionsById.get(document.connection_record_id),
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
  const [expanded, setExpanded] = useState(false);
  const attachment = item.attachment;
  const resource = getFhirResource<any>(item.document);
  const attachmentMetadata = resource?.content?.[0]?.attachment;

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full bg-white p-4 text-left hover:bg-primary-50"
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
            <div className="mb-3">
              <ProvenancePanel
                document={item.document}
                connection={item.connection}
              />
            </div>
            <RelatedLinksPanel item={item} />
            <div className="rounded-lg border border-solid border-gray-200">
              {attachment || attachmentMetadata?.data ? (
                <EmbeddedAttachmentViewer
                  attachment={{
                    contentType:
                      attachment?.data_record.content_type ||
                      attachmentMetadata?.contentType,
                    raw:
                      attachment?.data_record.raw || attachmentMetadata?.data,
                    title:
                      attachmentMetadata?.title ||
                      item.document.metadata?.display_name,
                  }}
                />
              ) : (
                <div className="space-y-3 p-4 text-sm text-gray-700">
                  <p>
                    {t('The source record has metadata but no embedded file.')}
                  </p>
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

function RelatedLinksPanel({ item }: { item: DocumentItem }) {
  const { t } = useInterfaceLanguage();
  const links = [
    {
      label: 'View source in timeline',
      to: getTimelineDateLink(item.document.metadata?.date),
    },
    {
      label: 'Open audit log',
      to: AppRoutes.AuditLog,
    },
    {
      label: 'Sharing and export',
      to: AppRoutes.Sharing,
    },
    ...item.linkedReports.map((report) => ({
      label: report.metadata?.display_name || 'Linked report',
      to: getTimelineDateLink(report.metadata?.date),
    })),
  ];

  return (
    <section className="mb-3 rounded-md border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">
        {t('Related links')}
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={`${link.label}-${link.to}`}
            to={link.to}
            className="rounded-md bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-primary-50 hover:text-primary-700"
          >
            {t(link.label)}
          </Link>
        ))}
      </div>
    </section>
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

function getTimelineDateLink(date?: string): string {
  if (!date) return AppRoutes.Timeline;
  return `${AppRoutes.Timeline}#${safeFormatDate(date, 'MMM-dd-yyyy', '')}`;
}
