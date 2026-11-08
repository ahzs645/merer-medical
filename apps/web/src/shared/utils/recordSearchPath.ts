import { Routes } from '../../Routes';
import { isLaboratoryObservation } from '../../features/labs/hooks/useLabsData';
import { LabDocument } from '../../features/labs/types';
import { groupLabs } from '../../features/labs/utils/labGrouping';
import { TIMELINE_QUERY_PARAM } from '../../features/timeline/timelineQueryParam';
import { getTimelineRecordElementId } from '../../features/timeline/utils/timelineAnchors';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

/** Use the record's existing detail view, or its exact card in the timeline. */
export function recordSearchPath(document: ClinicalDocument): string {
  if (isLaboratoryObservation(document as LabDocument)) {
    const group = groupLabs([document as LabDocument])[0];
    if (group) return `${Routes.Labs}/${encodeURIComponent(group.key)}`;
  }

  if (
    ['documentreference', 'documentreference_attachment'].includes(
      document.data_record.resource_type,
    )
  ) {
    return `${Routes.Documents}/detail/${encodeURIComponent(document.metadata?.id || document.id)}`;
  }

  const name = document.metadata?.display_name || '';
  const query = name
    ? `?${TIMELINE_QUERY_PARAM}=${encodeURIComponent(name)}`
    : '';
  return `${Routes.Timeline}${query}#${getTimelineRecordElementId(document.id)}`;
}
