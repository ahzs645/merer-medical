import { BundleEntry, Condition } from 'fhir/r2';
import { formatTime } from '../../../../shared/utils/dateFormatters';
import { ClinicalDocument } from '../../../../models/clinical-document/ClinicalDocument.type';
import { useConnectionDoc } from '../../../connections/hooks/useConnectionDoc';
import { SkeletonLoadingText } from '../skeletons/SkeletonLoadingText';
import { CardBase } from '../../../connections/components/CardBase';
import { TimelineCardTitle } from '../TimelineCardTitle';
import { memo } from 'react';
import { TimelineCardCategoryTitle } from '../TimelineCardCategoryTitle';
import { getManualRecordNote } from '../../../../shared/utils/manualRecordUtils';
import { ManualRecordActions } from '../../../manual-entry/ManualRecordActions';

export const ConditionCard = memo(function ConditionCard({
  item,
}: {
  item: ClinicalDocument<BundleEntry<Condition>>;
}) {
  const conn = useConnectionDoc(item.connection_record_id);
  const manualNote = getManualRecordNote(item);

  return (
    <CardBase>
      <div className="min-w-0 flex-1">
        <TimelineCardCategoryTitle title="Condition" color="text-green-600" />

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
        {manualNote && (
          <p className="mt-2 whitespace-pre-line rounded-md bg-slate-50 p-2 text-xs font-medium text-gray-700 md:text-sm">
            {manualNote}
          </p>
        )}
        <ManualRecordActions item={item} />
      </div>
    </CardBase>
  );
});
