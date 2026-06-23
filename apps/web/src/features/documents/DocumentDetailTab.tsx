import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  UsersIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { EmbeddedAttachmentViewer } from '../timeline/components/document-reference/EmbeddedAttachmentViewer';
import { ProvenancePanel } from '../provenance/ProvenancePanel';
import { ManualRecordActions } from '../manual-entry/ManualRecordActions';
import { getTimelineRecordElementId } from '../timeline/utils/timelineAnchors';

type LinkGroup = {
  key: string;
  title: string;
  icon: typeof BeakerIcon;
  types: string[];
};

// "Measurements & results" first so the values a document produced are front
// and centre, then the rest of the clinical record it touches.
const LINK_GROUPS: LinkGroup[] = [
  {
    key: 'measures',
    title: 'Measurements & results',
    icon: BeakerIcon,
    types: ['observation'],
  },
  {
    key: 'reports',
    title: 'Reports & panels',
    icon: DocumentTextIcon,
    types: ['diagnosticreport'],
  },
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

function timelineLink(doc: ClinicalDocument): string {
  if (!doc.id)
    return `${AppRoutes.Timeline}#${safeFormatDate(doc.metadata?.date, 'MMM-dd-yyyy', '')}`;
  return `${AppRoutes.Timeline}#${getTimelineRecordElementId(doc.id)}`;
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
      const resource = getFhirResource<any>(doc);
      const attachmentUrl = resource?.content?.[0]?.attachment?.url;

      const [attachmentRow, connRow, reportRows, allRows] = await Promise.all([
        attachmentUrl
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
      // Records that point back via metadata.source_document_id.
      for (const row of allRows) {
        const record = row.toMutableJSON() as ClinicalDocument;
        if (getMetaString(record, 'source_document_id') === decodedId) {
          byId.set(record.id, record);
        }
      }
      // Reports that reference this document's attachment via presentedForm.
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
  }, [db, decodedId, user.id]);

  const resource = document ? getFhirResource<any>(document) : undefined;
  const attachmentMeta = resource?.content?.[0]?.attachment;
  const title =
    document?.metadata?.display_name ||
    attachmentMeta?.title ||
    getMetaString(document || ({} as ClinicalDocument), 'source_image') ||
    'Document';

  const groups = useMemo(() => {
    return LINK_GROUPS.map((group) => ({
      ...group,
      records: linked.filter((record) =>
        group.types.includes(record.data_record?.resource_type),
      ),
    })).filter((group) => group.records.length > 0);
  }, [linked]);
  const groupedIds = new Set(groups.flatMap((g) => g.records.map((r) => r.id)));
  const otherRecords = linked.filter((r) => !groupedIds.has(r.id));

  return (
    <AppPage
      banner={
        <div className="bg-primary-800 px-4 py-5 text-white sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-3">
            <Link
              to={AppRoutes.Documents}
              className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-100 hover:text-white"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              All documents
            </Link>
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="h-7 w-7 shrink-0" />
              <h1 className="text-2xl font-semibold">{title}</h1>
            </div>
            <p className="text-sm text-primary-100">
              {safeFormatDate(document?.metadata?.date, 'PP', '')}
              {linked.length
                ? ` · ${linked.length} linked record${linked.length === 1 ? '' : 's'}`
                : ''}
            </p>
          </div>
        </div>
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <Placeholder text="Loading document…" />
          ) : status === 'missing' || !document ? (
            <Placeholder text="This document could not be found." />
          ) : (
            <>
              {document && (
                <div className="rounded-md bg-white p-2 shadow-sm ring-1 ring-gray-200">
                  <ManualRecordActions item={document} />
                </div>
              )}

              <ProvenancePanel document={document} connection={connection} />

              <section className="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-gray-200">
                <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">
                  Document
                </div>
                {attachment || attachmentMeta?.data ? (
                  <EmbeddedAttachmentViewer
                    attachment={{
                      contentType:
                        attachment?.data_record.content_type ||
                        attachmentMeta?.contentType,
                      raw: attachment?.data_record.raw || attachmentMeta?.data,
                      title,
                    }}
                  />
                ) : (
                  <p className="p-4 text-sm text-gray-700">
                    This record has metadata but no embedded file.
                  </p>
                )}
              </section>

              <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
                <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Squares2X2Icon className="h-5 w-5 text-primary-700" />
                  Linked records
                  <span className="font-normal text-gray-500">
                    ({linked.length})
                  </span>
                </h2>
                {linked.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-600">
                    Nothing is linked to this document yet.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-4">
                    {groups.map((group) => {
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
                    {otherRecords.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">
                          Other ({otherRecords.length})
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {otherRecords.map((record) => (
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
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
      {text}
    </div>
  );
}
