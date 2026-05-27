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
import { ShowDocumentResultsAttachmentExpandable } from '../../timeline/components/document-reference/ShowDocumentReferenceAttachmentExpandable';
import { ShowDocumentResultsExpandable } from '../../timeline/components/document-reference/ShowDocumentReferenceResultsExpandable';
import { ImagingItem } from '../types';
import { formatDate } from '../utils/imagingRecords';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function ImagingItemCard({ item }: { item: ImagingItem }) {
  const Icon = item.type === 'diagnosticreport' ? DocumentTextIcon : PhotoIcon;
  const [expanded, setExpanded] = useState(false);
  const { t } = useInterfaceLanguage();

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="block w-full rounded-md bg-white p-4 text-left shadow-sm ring-1 ring-gray-200 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary-50 p-2 text-primary-700">
            <Icon className="h-5 w-5" />
          </div>
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
              {item.attachmentType && <Badge>{item.attachmentType}</Badge>}
              {item.categories.includes('dental') && (
                <Badge>{t('Dental')}</Badge>
              )}
            </div>
            {item.summary && (
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-700">
                {item.summary}
              </p>
            )}
            <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700">
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Open record
            </div>
          </div>
        </div>
      </button>
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
  const detailRows = [
    ['Date', formatDate(item.date)],
    ['Type', item.type],
    ['Modality', item.modality],
    ['Body site', item.bodySite],
    ['Attachment', item.attachmentType],
    ['FHIR id', resource?.id],
    ['Status', resource?.status],
    ['Description', resource?.description],
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
        </div>
      </div>
    </Modal>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
      {children}
    </span>
  );
}
