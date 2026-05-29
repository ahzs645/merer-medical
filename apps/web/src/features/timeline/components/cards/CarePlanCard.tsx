import { BundleEntry, CarePlan } from 'fhir/r4';
import { formatTime } from '../../../../shared/utils/dateFormatters';
import { ClinicalDocument } from '../../../../models/clinical-document/ClinicalDocument.type';
import { useConnectionDoc } from '../../../connections/hooks/useConnectionDoc';
import { SkeletonLoadingText } from '../skeletons/SkeletonLoadingText';
import { CardBase } from '../../../connections/components/CardBase';
import { TimelineCardTitle } from '../TimelineCardTitle';
import { memo, useState } from 'react';
import { TimelineCardCategoryTitle } from '../TimelineCardCategoryTitle';
import { OpenableCardIcon } from '../OpenableCardIcon';
import { ShowCarePlanDetailsExpandable } from '../expandables/ShowCarePlanDetailsExpandable';
import { ManualRecordActions } from '../../../manual-entry/ManualRecordActions';
import { getManualRecordNote } from '../../../../shared/utils/manualRecordUtils';
import { getFhirResource } from '../../../../shared/utils/fhirResource';

export const CarePlanCard = memo(function CarePlanCard({
  item,
}: {
  item: ClinicalDocument<BundleEntry<CarePlan>>;
}) {
  const conn = useConnectionDoc(item.connection_record_id);
  const [expanded, setExpanded] = useState(false);
  const carePlan = getFhirResource<CarePlan>(item);
  const manualNote = getManualRecordNote(item);

  return (
    <>
      <CardBase
        isFocusable
        onClick={() => {
          setExpanded((x) => !x);
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="items-top flex justify-between">
            <TimelineCardCategoryTitle
              title="Care Plan"
              color="text-indigo-600"
            />
            <OpenableCardIcon />
          </div>

          <TimelineCardTitle>
            {item.metadata?.display_name || carePlan?.title}
          </TimelineCardTitle>
          <p className="truncate text-xs font-medium text-gray-800 md:text-sm">
            {formatTime(item.metadata?.date)}
          </p>
          {carePlan?.status && (
            <p className="truncate text-xs font-medium text-gray-600 md:text-sm capitalize">
              {carePlan.status}
            </p>
          )}
          {conn?.get('name') ? (
            <p className="truncate text-xs font-medium text-gray-700 md:text-sm">
              {conn?.get('name')}
            </p>
          ) : (
            <SkeletonLoadingText />
          )}
          {manualNote && (
            <p className="mt-2 whitespace-pre-line rounded-md bg-slate-50 p-2 text-xs font-medium text-gray-700 md:text-sm">
              {manualNote}
            </p>
          )}
          <ManualRecordActions item={item} />
        </div>
      </CardBase>
      <ShowCarePlanDetailsExpandable
        item={item}
        expanded={expanded}
        setExpanded={setExpanded}
      />
    </>
  );
});
