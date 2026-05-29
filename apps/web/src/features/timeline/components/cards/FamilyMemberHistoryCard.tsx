import { memo } from 'react';

import { ClinicalDocument } from '../../../../models/clinical-document/ClinicalDocument.type';
import { formatTime } from '../../../../shared/utils/dateFormatters';
import { getFhirResource } from '../../../../shared/utils/fhirResource';
import { CardBase } from '../../../connections/components/CardBase';
import { useConnectionDoc } from '../../../connections/hooks/useConnectionDoc';
import { SkeletonLoadingText } from '../skeletons/SkeletonLoadingText';
import { TimelineCardCategoryTitle } from '../TimelineCardCategoryTitle';
import { TimelineCardTitle } from '../TimelineCardTitle';

export const FamilyMemberHistoryCard = memo(function FamilyMemberHistoryCard({
  item,
}: {
  item: ClinicalDocument;
}) {
  const conn = useConnectionDoc(item.connection_record_id);
  const resource = getFhirResource<any>(item);
  const relationship = resource?.relationship?.text;
  const conditions = (resource?.condition || [])
    .map((condition: any) => condition?.code?.text)
    .filter(Boolean);
  const details = [
    relationship,
    resource?.deceasedBoolean ? 'Deceased' : undefined,
    conditions.length ? conditions.join(', ') : undefined,
  ].filter(Boolean);

  return (
    <CardBase>
      <div className="min-w-0 flex-1">
        <TimelineCardCategoryTitle
          title="Family History"
          color="text-amber-700"
        />
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
        {details.length > 0 && (
          <p className="mt-2 whitespace-pre-line rounded-md bg-slate-50 p-2 text-xs font-medium text-gray-700 md:text-sm">
            {details.join(' - ')}
          </p>
        )}
      </div>
    </CardBase>
  );
});
