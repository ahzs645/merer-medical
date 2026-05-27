import {
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { BundleEntry, DocumentReference } from 'fhir/r2';
import { useState } from 'react';

import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { Modal } from '../../../shared/components/Modal';
import { ModalHeader } from '../../../shared/components/ModalHeader';
import { isManualRecord } from '../../../shared/utils/manualRecordUtils';
import { ManualRecordActions } from '../../manual-entry/ManualRecordActions';
import { ShowDocumentResultsAttachmentExpandable } from '../../timeline/components/document-reference/ShowDocumentReferenceAttachmentExpandable';
import { ShowDocumentResultsExpandable } from '../../timeline/components/document-reference/ShowDocumentReferenceResultsExpandable';
import { ImagingItem } from '../types';
import { formatDate } from '../utils/imagingRecords';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function ImagingItemCard({ item }: { item: ImagingItem }) {
  const Icon = item.type === 'diagnosticreport' ? DocumentTextIcon : PhotoIcon;
  const [expanded, setExpanded] = useState(false);
  const { t } = useInterfaceLanguage();
  const canManageRecord = isManualRecord(item.document as ClinicalDocument);
  const thumbnailUrl = getInlineImageUrl(item.document as ClinicalDocument);

  return (
    <>
      <article className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="block w-full text-left transition hover:text-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <div className="flex items-start gap-3">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-md border border-gray-200 object-cover"
              />
            ) : (
              <div className="rounded-md bg-primary-50 p-2 text-primary-700">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <h2 className="break-words text-base font-semibold text-gray-900">
                  {item.title}
                </h2>
                <span className="shrink-0 text-sm text-gray-500">
                  {formatDate(item.date)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{item.type}</Badge>
                {item.modality && <Badge>{item.modality}</Badge>}
                {item.bodySite && <Badge>{item.bodySite}</Badge>}
                {item.laterality && <Badge>{item.laterality}</Badge>}
                {item.studyType && <Badge>{item.studyType}</Badge>}
                {item.attachmentType && <Badge>{item.attachmentType}</Badge>}
                {item.categories.includes('dental') && (
                  <Badge>{t('Dental')}</Badge>
                )}
                {item.categories.includes('optometry') && (
                  <Badge>{t('Eye care')}</Badge>
                )}
              </div>
              {item.summary && (
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-700">
                  {item.summary}
                </p>
              )}
              {item.findings.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.findings.slice(0, 4).map((finding) => (
                    <Badge key={`${finding.label}-${finding.value}`}>
                      {finding.label}
                      {finding.value ? `: ${finding.value}` : ''}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700">
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                {t('Open record')}
              </div>
            </div>
          </div>
        </button>
        {canManageRecord && (
          <ManualRecordActions item={item.document as ClinicalDocument} />
        )}
      </article>
      {item.type === 'documentreference' ? (
        <ShowDocumentResultsExpandable
          item={
            item.document as ClinicalDocument<BundleEntry<DocumentReference>>
          }
          expanded={expanded}
          setExpanded={setExpanded}
        />
      ) : item.type === 'documentreference_attachment' ? (
        <ShowDocumentResultsAttachmentExpandable
          item={item.document as ClinicalDocument<string | Blob>}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      ) : (
        <ImagingRecordDetailsModal
          item={item}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      )}
    </>
  );
}

function ImagingRecordDetailsModal({
  item,
  expanded,
  setExpanded,
}: {
  item: ImagingItem;
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const raw = item.document.data_record.raw as any;
  const resource = raw?.resource || raw || {};
  const imagingStudy = getImagingStudyDetails(resource);
  const detailRows = [
    ['Date', formatDate(item.date)],
    ['Type', item.type],
    ['Modality', item.modality],
    ['Body site', item.bodySite],
    ['Laterality', item.laterality],
    ['Study / report type', item.studyType],
    ['Accession ID', item.accessionId],
    ['Study ID', item.studyId],
    ['Attachment', item.attachmentType],
    ['FHIR id', resource?.id],
    ['Status', resource?.status],
    ['Description', resource?.description],
    ['Series count', imagingStudy.seriesCount],
    ['Instance count', imagingStudy.instanceCount],
    ['Endpoint', imagingStudy.endpoint],
    ['Study UID', imagingStudy.studyUid],
  ].filter(([, value]) => Boolean(value));

  return (
    <Modal open={expanded} setOpen={setExpanded}>
      <div className="flex flex-col">
        <ModalHeader title={item.title} setClose={() => setExpanded(false)} />
        <div className="p-4">
          <dl className="grid gap-3 rounded-md border border-gray-200 bg-white p-4 sm:grid-cols-2">
            {detailRows.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {label}
                </dt>
                <dd className="mt-1 break-words text-sm text-gray-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {item.summary && (
            <div className="mt-4 rounded-md border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                {item.summary}
              </p>
            </div>
          )}
          {imagingStudy.series.length > 0 && (
            <div className="mt-4 rounded-md border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">Series</h3>
              <div className="mt-3 grid gap-3">
                {imagingStudy.series.map((series) => (
                  <div
                    key={`${series.uid || series.number || series.description}`}
                    className="rounded-md border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="text-sm font-semibold text-gray-900">
                      {series.description || series.uid || 'Series'}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {series.modality && <Badge>{series.modality}</Badge>}
                      {series.bodySite && <Badge>{series.bodySite}</Badge>}
                      {series.instances !== undefined && (
                        <Badge>{series.instances} instances</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {item.findings.length > 0 && (
            <div className="mt-4 rounded-md border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Structured findings
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {item.findings.map((finding) => (
                  <div
                    key={`${finding.label}-${finding.value}-${finding.bodySite}`}
                    className="rounded-md border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="text-sm font-semibold text-gray-900">
                      {finding.label}
                    </div>
                    {finding.value && (
                      <div className="mt-1 text-sm text-gray-700">
                        {finding.value}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {finding.bodySite && <Badge>{finding.bodySite}</Badge>}
                      {finding.category && <Badge>{finding.category}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function getInlineImageUrl(document: ClinicalDocument) {
  if (
    !document.data_record.content_type.startsWith('image/') ||
    typeof document.data_record.raw !== 'string'
  ) {
    return undefined;
  }

  return document.data_record.raw.startsWith('data:')
    ? document.data_record.raw
    : `data:${document.data_record.content_type};base64,${document.data_record.raw}`;
}

function getImagingStudyDetails(resource: any) {
  const series = Array.isArray(resource?.series)
    ? resource.series.map((series: any) => ({
        uid: series.uid,
        number: series.number,
        description: series.description,
        modality:
          series.modality?.display ||
          series.modality?.code ||
          series.modality?.coding?.[0]?.display ||
          series.modality?.coding?.[0]?.code,
        bodySite:
          series.bodySite?.display ||
          series.bodySite?.text ||
          series.bodySite?.coding?.[0]?.display,
        instances: Array.isArray(series.instance)
          ? series.instance.length
          : series.numberOfInstances,
      }))
    : [];
  const instanceCount = series.reduce(
    (count: number, seriesItem: { instances?: number }) =>
      count + (seriesItem.instances || 0),
    0,
  );

  return {
    series,
    seriesCount: series.length || resource?.numberOfSeries,
    instanceCount: instanceCount || resource?.numberOfInstances,
    endpoint:
      resource?.endpoint?.[0]?.reference || resource?.endpoint?.[0]?.url,
    studyUid: resource?.uid,
  };
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
      {children}
    </span>
  );
}
