import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Disclosure } from '@headlessui/react';
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  BeakerIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import { RecordPageHeader } from '../../shared/components/records/RecordPageHeader';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { EmbeddedAttachmentViewer } from '../timeline/components/document-reference/EmbeddedAttachmentViewer';
import {
  ObservationResultsTable,
  countAbnormal,
} from '../timeline/components/ObservationResultsTable';
import { ProvenancePanel } from '../provenance/ProvenancePanel';
import { ManualRecordActions } from '../manual-entry/ManualRecordActions';
import { ManualRecordModal } from '../manual-entry/ManualRecordModal';
import type { ManualRecordKind } from '../manual-entry/manualRecordTypes';
import { getTimelineRecordElementId } from '../timeline/utils/timelineAnchors';

// One-tap entry points so the most common records skip the type picker.
const QUICK_ADD: { kind: ManualRecordKind; label: string }[] = [
  { kind: 'lab', label: 'Lab' },
  { kind: 'medicationstatement', label: 'Medication' },
  { kind: 'condition', label: 'Condition' },
  { kind: 'vital', label: 'Vital' },
  { kind: 'encounter', label: 'Encounter' },
];

// Non-measurement record types are shown as compact links grouped by kind.
const RECORD_GROUPS: {
  key: string;
  title: string;
  icon: typeof BeakerIcon;
  types: string[];
}[] = [
  {
    key: 'conditions',
    title: 'Conditions',
    icon: ExclamationCircleIcon,
    types: ['condition'],
  },
  {
    key: 'medications',
    title: 'Medications',
    icon: ClipboardDocumentListIcon,
    types: [
      'medicationstatement',
      'medicationrequest',
      'medicationorder',
      'list',
    ],
  },
  {
    key: 'allergies',
    title: 'Allergies',
    icon: ExclamationTriangleIcon,
    types: ['allergyintolerance'],
  },
  {
    key: 'histories',
    title: 'Family & social history',
    icon: UsersIcon,
    types: ['familymemberhistory'],
  },
  {
    key: 'encounters',
    title: 'Encounters',
    icon: CalendarDaysIcon,
    types: ['encounter'],
  },
];

function getMetaString(doc: ClinicalDocument, key: string): string | undefined {
  const value = (doc.metadata as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'string' ? value : undefined;
}

function resourceId(doc: ClinicalDocument): string | undefined {
  return getFhirResource<any>(doc)?.id;
}

function timelineLink(doc: ClinicalDocument): string {
  if (!doc.id)
    return `${AppRoutes.Timeline}#${safeFormatDate(doc.metadata?.date, 'MMM-dd-yyyy', '')}`;
  return `${AppRoutes.Timeline}#${getTimelineRecordElementId(doc.id)}`;
}

function makeBlobUrl(raw: unknown, contentType?: string): string | undefined {
  try {
    if (raw instanceof Blob) return URL.createObjectURL(raw);
    if (typeof raw !== 'string' || !raw) return undefined;
    const bytes = atob(raw);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
    return URL.createObjectURL(
      new Blob([arr], { type: contentType || 'application/octet-stream' }),
    );
  } catch {
    return undefined;
  }
}

export function DocumentDetailTab() {
  const db = useRxDb();
  const user = useUser();
  const { documentId } = useParams<{ documentId: string }>();
  const decodedId = documentId ? decodeURIComponent(documentId) : '';

  const [document, setDocument] = useState<ClinicalDocument | null>(null);
  const [attachment, setAttachment] = useState<ClinicalDocument | null>(null);
  const [connection, setConnection] = useState<
    ConnectionDocument | undefined
  >();
  const [linked, setLinked] = useState<ClinicalDocument[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>(
    'loading',
  );
  const [query, setQuery] = useState('');
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<ManualRecordKind | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const openAdd = (kind?: ManualRecordKind) => {
    setAddType(kind);
    setAddOpen(true);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus('loading');
      const docRow = await db.clinical_documents
        .findOne({ selector: { user_id: user.id, 'metadata.id': decodedId } })
        .exec();
      if (cancelled) return;
      if (!docRow) {
        setStatus('missing');
        return;
      }
      const doc = docRow.toMutableJSON() as ClinicalDocument;
      // A manually uploaded file is itself a `documentreference_attachment`
      // (no DocumentReference wrapper); treat it as both the document and its
      // own embedded file so it can be viewed and have records linked to it.
      const isAttachmentDoc =
        doc.data_record?.resource_type === 'documentreference_attachment';
      const resource = getFhirResource<any>(doc);
      const attachmentUrl = isAttachmentDoc
        ? doc.metadata?.id
        : resource?.content?.[0]?.attachment?.url;

      const [attachmentRow, connRow, reportRows, allRows] = await Promise.all([
        isAttachmentDoc
          ? Promise.resolve(docRow)
          : attachmentUrl
            ? db.clinical_documents
                .findOne({
                  selector: { user_id: user.id, 'metadata.id': attachmentUrl },
                })
                .exec()
            : Promise.resolve(null),
        db.connection_documents
          .findOne({ selector: { id: doc.connection_record_id } })
          .exec(),
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': 'diagnosticreport',
            },
          })
          .exec(),
        db.clinical_documents.find({ selector: { user_id: user.id } }).exec(),
      ]);
      if (cancelled) return;

      const byId = new Map<string, ClinicalDocument>();
      for (const row of allRows) {
        const record = row.toMutableJSON() as ClinicalDocument;
        if (getMetaString(record, 'source_document_id') === decodedId) {
          byId.set(record.id, record);
        }
      }
      if (attachmentUrl) {
        for (const row of reportRows) {
          const record = row.toMutableJSON() as ClinicalDocument;
          const res = getFhirResource<any>(record);
          if (
            (res?.presentedForm || []).some(
              (f: any) => f?.url === attachmentUrl,
            )
          ) {
            byId.set(record.id, record);
          }
        }
      }

      setDocument(doc);
      setAttachment(
        attachmentRow
          ? (attachmentRow.toMutableJSON() as ClinicalDocument)
          : null,
      );
      setConnection(
        connRow ? (connRow.toMutableJSON() as ConnectionDocument) : undefined,
      );
      setLinked(Array.from(byId.values()));
      setStatus('ready');
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [db, decodedId, user.id, refreshKey]);

  const resource = document ? getFhirResource<any>(document) : undefined;
  const attachmentMeta = resource?.content?.[0]?.attachment;
  const isAttachmentDoc =
    document?.data_record?.resource_type === 'documentreference_attachment';
  const attachmentUrl: string | undefined = isAttachmentDoc
    ? document?.metadata?.id
    : attachmentMeta?.url;
  const title =
    document?.metadata?.display_name ||
    attachmentMeta?.title ||
    getMetaString(document || ({} as ClinicalDocument), 'source_image') ||
    'Document';

  const rawBytes = attachment?.data_record.raw || attachmentMeta?.data;
  const contentType =
    attachment?.data_record.content_type || attachmentMeta?.contentType;
  const openDoc = (download: boolean) => {
    const url = makeBlobUrl(rawBytes, contentType);
    if (!url) return;
    if (download) {
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = title || 'document';
      anchor.click();
    } else {
      window.open(url, '_blank', 'noopener');
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  // ---- Partition linked records into panels + measures + other ----
  const { panels, otherMeasures, recordGroups, measureCount, abnormalCount } =
    useMemo(() => {
      const observations = linked.filter(
        (d) => d.data_record?.resource_type === 'observation',
      );
      const reports = linked.filter(
        (d) => d.data_record?.resource_type === 'diagnosticreport',
      );
      const obsByResId = new Map<string, ClinicalDocument>();
      observations.forEach((obs) => {
        const id = resourceId(obs);
        if (id) obsByResId.set(id, obs);
      });

      const claimed = new Set<string>();
      const builtPanels = reports
        .map((report) => {
          const res = getFhirResource<any>(report);
          const members: ClinicalDocument[] = [];
          for (const entry of res?.result || []) {
            const ref = entry?.reference?.split('/')?.[1];
            const obs = ref ? obsByResId.get(ref) : undefined;
            if (obs && !claimed.has(obs.id)) {
              claimed.add(obs.id);
              members.push(obs);
            }
          }
          return { report, members };
        })
        .sort((a, b) => b.members.length - a.members.length);

      const ungrouped = observations.filter((obs) => !claimed.has(obs.id));

      const groups = RECORD_GROUPS.map((group) => ({
        ...group,
        records: linked.filter((r) =>
          group.types.includes(r.data_record?.resource_type),
        ),
      })).filter((group) => group.records.length > 0);

      return {
        panels: builtPanels,
        otherMeasures: ungrouped,
        recordGroups: groups,
        measureCount: observations.length,
        abnormalCount: countAbnormal(observations),
      };
    }, [linked]);

  const normalizedQuery = query.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    if (!normalizedQuery) return [];
    return linked
      .filter((d) => d.data_record?.resource_type === 'observation')
      .filter((d) =>
        (d.metadata?.display_name || '')
          .toLowerCase()
          .includes(normalizedQuery),
      );
  }, [linked, normalizedQuery]);

  return (
    <AppPage
      banner={
        <RecordPageHeader
          title={title}
          icon={DocumentTextIcon}
          backLink={{ to: AppRoutes.Documents, label: 'All documents' }}
          count={
            <>
              {safeFormatDate(document?.metadata?.date, 'PP', '')}
              {linked.length
                ? ` · ${linked.length} linked record${linked.length === 1 ? '' : 's'}`
                : ''}
            </>
          }
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <Placeholder text="Loading document…" />
          ) : status === 'missing' || !document ? (
            <Placeholder text="This document could not be found." />
          ) : (
            <>
              {/* Summary stats — only the ones this document actually has.
                  Measurements, Abnormal and Panels are lab vocabulary, and a
                  consent form has none of them, so a signed PDF opened on four
                  cards reading 0, 0, 0, 0 before anything true about it. */}
              {linked.length > 0 || measureCount > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Linked records" value={linked.length} />
                  {measureCount > 0 ? (
                    <Stat label="Measurements" value={measureCount} />
                  ) : null}
                  {measureCount > 0 ? (
                    <Stat
                      label="Abnormal"
                      value={abnormalCount}
                      tone={abnormalCount > 0 ? 'danger' : 'default'}
                    />
                  ) : null}
                  {panels.length > 0 ? (
                    <Stat label="Panels" value={panels.length} />
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-12">
                {/* Document sidebar — stays beside the measurements */}
                <aside className="lg:col-span-5">
                  <div className="flex flex-col gap-4 lg:sticky lg:top-4">
                    {document && (
                      <div className="rounded-md bg-white p-2 shadow-sm ring-1 ring-gray-200">
                        <ManualRecordActions item={document} explainReadOnly />
                      </div>
                    )}

                    <section className="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-gray-200">
                      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-2">
                        <span className="text-sm font-semibold text-gray-900">
                          Document
                        </span>
                        {rawBytes && (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => openDoc(false)}
                              className="inline-flex items-center gap-1 rounded-md border border-primary-200 px-2 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                            >
                              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => openDoc(true)}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                              Download
                            </button>
                          </div>
                        )}
                      </div>
                      {attachment || attachmentMeta?.data ? (
                        <EmbeddedAttachmentViewer
                          attachment={{
                            contentType,
                            raw: rawBytes,
                            title,
                          }}
                        />
                      ) : (
                        <p className="p-4 text-sm text-gray-700">
                          This record has metadata but no embedded file.
                        </p>
                      )}
                    </section>

                    <ProvenancePanel
                      document={document}
                      connection={connection}
                    />
                  </div>
                </aside>

                {/* Measurements + other records. A section, not a `main` —
                    the app shell owns the page landmark. */}
                <section className="flex flex-col gap-4 lg:col-span-7">
                  {/* Add a record straight from the document, auto-linked */}
                  <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">
                          Records from this document
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-600">
                          Add a record while reading the document — it links
                          back here automatically.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAdd(undefined)}
                        className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add linked record
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {QUICK_ADD.map((quick) => (
                        <button
                          key={quick.kind}
                          type="button"
                          onClick={() => openAdd(quick.kind)}
                          className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                        >
                          + {quick.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Measurements */}
                  {measureCount > 0 && (
                    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                          <BeakerIcon className="h-5 w-5 text-primary-700" />
                          Measurements &amp; results
                          <span className="font-normal text-gray-500">
                            ({measureCount})
                          </span>
                        </h2>
                        <div className="flex w-full items-center gap-2 sm:w-auto">
                          <button
                            type="button"
                            onClick={() => setAbnormalOnly((v) => !v)}
                            aria-pressed={abnormalOnly}
                            className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                              abnormalOnly
                                ? 'border-red-300 bg-red-50 text-red-700'
                                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            Abnormal only
                            {abnormalCount ? ` (${abnormalCount})` : ''}
                          </button>
                          <label className="relative block w-full sm:w-56">
                            <MagnifyingGlassIcon className="pointer-events-none absolute start-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                              type="search"
                              value={query}
                              onChange={(event) => setQuery(event.target.value)}
                              placeholder="Find a measurement"
                              className="block w-full rounded-md border-0 py-1.5 ps-8 pe-3 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500"
                            />
                          </label>
                        </div>
                      </div>

                      {normalizedQuery ? (
                        <div className="mt-3">
                          <p className="mb-2 text-xs font-medium text-gray-500">
                            {searchMatches.length} match
                            {searchMatches.length === 1 ? '' : 'es'} for “
                            {query}”
                          </p>
                          <ObservationResultsTable
                            items={searchMatches}
                            abnormalOnly={abnormalOnly}
                          />
                        </div>
                      ) : (
                        <div className="mt-3 flex flex-col gap-3">
                          {panels
                            .filter(
                              ({ members }) =>
                                !abnormalOnly || countAbnormal(members) > 0,
                            )
                            .map(({ report, members }) => (
                              <PanelDisclosure
                                key={`${report.id}-${abnormalOnly}`}
                                title={report.metadata?.display_name || 'Panel'}
                                date={report.metadata?.date}
                                members={members}
                                to={timelineLink(report)}
                                abnormalOnly={abnormalOnly}
                                defaultOpen={abnormalOnly}
                              />
                            ))}
                          {otherMeasures.length > 0 &&
                            (!abnormalOnly ||
                              countAbnormal(otherMeasures) > 0) && (
                              <PanelDisclosure
                                key={`other-${abnormalOnly}`}
                                title="Other measurements"
                                members={otherMeasures}
                                abnormalOnly={abnormalOnly}
                                defaultOpen={abnormalOnly}
                              />
                            )}
                        </div>
                      )}
                    </section>
                  )}

                  {/* Other linked records */}
                  {recordGroups.length > 0 && (
                    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
                      <h2 className="text-base font-semibold text-gray-900">
                        Other linked records
                      </h2>
                      <div className="mt-3 flex flex-col gap-4">
                        {recordGroups.map((group) => {
                          const Icon = group.icon;
                          return (
                            <div key={group.key}>
                              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                <Icon className="h-4 w-4 text-gray-500" />
                                {group.title}
                                <span className="font-normal text-gray-500">
                                  ({group.records.length})
                                </span>
                              </h3>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {group.records.map((record) => (
                                  <Link
                                    key={record.id}
                                    to={timelineLink(record)}
                                    className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-primary-50 hover:text-primary-700"
                                  >
                                    {record.metadata?.display_name ||
                                      record.data_record?.resource_type}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {linked.length === 0 && (
                    <Placeholder text="Nothing is linked to this document yet." />
                  )}
                </section>
              </div>

              <ManualRecordModal
                key={addType || 'picker'}
                open={addOpen}
                onClose={() => setAddOpen(false)}
                initialRecordType={addType}
                linkedDocumentId={decodedId}
                linkedAttachmentId={attachmentUrl}
                onSaved={() => setRefreshKey((key) => key + 1)}
              />
            </>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function PanelDisclosure({
  title,
  date,
  members,
  to,
  abnormalOnly = false,
  defaultOpen = false,
}: {
  title: string;
  date?: string;
  members: ClinicalDocument[];
  to?: string;
  abnormalOnly?: boolean;
  defaultOpen?: boolean;
}) {
  const abnormal = useMemo(() => countAbnormal(members), [members]);
  return (
    <Disclosure defaultOpen={defaultOpen}>
      {({ open }) => (
        <div className="overflow-hidden rounded-md border border-gray-200">
          <Disclosure.Button className="flex w-full items-center justify-between gap-2 bg-gray-50 px-3 py-2 text-start hover:bg-gray-100">
            <span className="flex min-w-0 items-center gap-2">
              <ChevronRightIcon
                className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                  open ? 'rotate-90' : ''
                }`}
              />
              <span className="truncate text-sm font-semibold text-gray-900">
                {title}
              </span>
              {date && (
                <span className="hidden text-xs text-gray-500 sm:inline">
                  {safeFormatDate(date, 'PP', '')}
                </span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
              {abnormal > 0 && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">
                  {abnormal} abnormal
                </span>
              )}
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                {members.length} result{members.length === 1 ? '' : 's'}
              </span>
            </span>
          </Disclosure.Button>
          <Disclosure.Panel className="p-3">
            <ObservationResultsTable
              items={members}
              abnormalOnly={abnormalOnly}
            />
            {to && (
              <Link
                to={to}
                className="mt-2 inline-block text-xs font-semibold text-primary-700 hover:text-primary-800"
              >
                Open panel in timeline →
              </Link>
            )}
          </Disclosure.Panel>
        </div>
      )}
    </Disclosure>
  );
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'danger';
}) {
  return (
    <div className="rounded-md bg-white p-3 shadow-sm ring-1 ring-gray-200">
      <p
        className={`text-2xl font-bold ${
          tone === 'danger' && value > 0 ? 'text-red-700' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
      <p className="text-xs font-medium text-gray-500">{label}</p>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
      {text}
    </div>
  );
}
