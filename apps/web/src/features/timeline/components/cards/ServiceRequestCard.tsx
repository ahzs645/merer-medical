import { memo } from 'react';
import { BundleEntry, ServiceRequest } from 'fhir/r4';

import { ClinicalDocument } from '../../../../models/clinical-document/ClinicalDocument.type';
import { CardBase } from '../../../connections/components/CardBase';
import { useConnectionDoc } from '../../../connections/hooks/useConnectionDoc';
import { formatTime } from '../../../../shared/utils/dateFormatters';
import { formatDisplayText } from '../../../../shared/utils/StyleUtils';
import { SkeletonLoadingText } from '../skeletons/SkeletonLoadingText';
import { TimelineCardCategoryTitle } from '../TimelineCardCategoryTitle';
import { TimelineCardTitle } from '../TimelineCardTitle';

/**
 * `servicerequest` had no card at all, so a referral — synced from a provider
 * or, since referrals became addable by hand, typed by the reader — rendered as
 * an empty box on its date. The type is not in `NON_TIMELINE_RESOURCE_TYPES`
 * either, so it was being fetched and laid out with nothing to draw.
 */
export const ServiceRequestCard = memo(function ServiceRequestCard({
  item,
}: {
  item: ClinicalDocument<BundleEntry<ServiceRequest>>;
}) {
  const conn = useConnectionDoc(item.connection_record_id);
  const request = item.data_record.raw.resource;
  // Who it is to, when there is anyone: a referral's whole point is the
  // destination, and it is the one field a bare title usually omits.
  const performer = request?.performer?.[0]?.display;

  return (
    <CardBase>
      <div className="min-w-0 flex-1">
        <TimelineCardCategoryTitle title="Referral" color="text-sky-700" />
        <TimelineCardTitle>{item.metadata?.display_name}</TimelineCardTitle>
        <p className="truncate text-xs font-medium text-gray-800 md:text-sm">
          {formatTime(item.metadata?.date)}
        </p>
        {request?.status && (
          <p className="truncate text-xs font-medium text-gray-600 md:text-sm">
            {formatDisplayText(request.status)}
          </p>
        )}
        {performer && (
          <p className="truncate text-xs font-medium text-gray-700 md:text-sm">
            {performer}
          </p>
        )}
        {conn?.get('name') ? (
          <p className="truncate text-xs font-medium text-gray-700 md:text-sm">
            {conn?.get('name')}
          </p>
        ) : (
          <SkeletonLoadingText />
        )}
      </div>
    </CardBase>
  );
});
