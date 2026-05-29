import { memo, useState } from 'react';

import { ClinicalDocument } from '../../../../models/clinical-document/ClinicalDocument.type';
import { formatTime } from '../../../../shared/utils/dateFormatters';
import { getFhirResource } from '../../../../shared/utils/fhirResource';
import { CardBase } from '../../../connections/components/CardBase';
import { useConnectionDoc } from '../../../connections/hooks/useConnectionDoc';
import { SkeletonLoadingText } from '../skeletons/SkeletonLoadingText';
import { Modal } from '../../../../shared/components/Modal';
import { ModalHeader } from '../../../../shared/components/ModalHeader';
import { TimelineCardCategoryTitle } from '../TimelineCardCategoryTitle';
import { TimelineCardTitle } from '../TimelineCardTitle';
import { OpenableCardIcon } from '../OpenableCardIcon';

export const ConsentCard = memo(function ConsentCard({
  item,
}: {
  item: ClinicalDocument;
}) {
  const conn = useConnectionDoc(item.connection_record_id);
  const [expanded, setExpanded] = useState(false);
  const resource = getFhirResource<any>(item);
  const detail =
    resource?.scope?.text ||
    resource?.category?.[0]?.text ||
    resource?.sourceAttachment?.title;

  return (
    <>
      <CardBase isFocusable onClick={() => setExpanded((x) => !x)}>
        <div className="min-w-0 flex-1">
          <div className="items-top flex justify-between">
            <TimelineCardCategoryTitle title="Consent" color="text-rose-700" />
            <OpenableCardIcon />
          </div>
          <TimelineCardTitle>{item.metadata?.display_name}</TimelineCardTitle>
          <p className="truncate text-xs font-medium text-gray-800 md:text-sm">
            {formatTime(item.metadata?.date)}
          </p>
          {conn?.get('name') ? (
            <p className="truncate text-xs font-medium text-gray-700 md:text-sm">
              {conn?.get('name')}
            </p>
          ) : (
            <SkeletonLoadingText />
          )}
          {detail && (
            <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs font-medium text-gray-700 md:text-sm">
              {detail}
            </p>
          )}
        </div>
      </CardBase>
      <Modal open={expanded} setOpen={setExpanded}>
        <div className="flex flex-col">
          <ModalHeader
            title={item.metadata?.display_name || 'Consent'}
            subtitle={formatTime(item.metadata?.date)}
            setClose={() => setExpanded(false)}
          />
          <div className="max-h-full scroll-py-3 p-3">
            <div className="space-y-4 rounded-lg border border-solid border-gray-200 p-4 text-sm text-gray-900">
              <DetailRow label="Status" value={resource?.status} />
              <DetailRow label="Scope" value={resource?.scope?.text} />
              <DetailRow
                label="Category"
                value={resource?.category
                  ?.map((category: any) => category.text || category.coding?.[0]?.display)
                  .filter(Boolean)
                  .join(', ')}
              />
              <DetailRow label="Source" value={resource?.sourceAttachment?.title} />
              {resource?.policyText && (
                <div>
                  <div className="mb-1 font-semibold text-gray-700">Directive text</div>
                  <p className="whitespace-pre-line rounded-md bg-gray-50 p-3 leading-6 text-gray-800">
                    {resource.policyText}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
});

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="font-semibold text-gray-700">{label}</div>
      <div className="col-span-2">{value}</div>
    </div>
  );
}
