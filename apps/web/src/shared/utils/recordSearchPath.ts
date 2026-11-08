import { isValid, parseISO } from 'date-fns';

import { Routes } from '../../Routes';
import { collectDirectory } from '../../features/directory/collectDirectory';
import { isLaboratoryObservation } from '../../features/labs/hooks/useLabsData';
import { LabDocument } from '../../features/labs/types';
import { groupLabs } from '../../features/labs/utils/labGrouping';
import { resultDetailPath } from '../../features/results/utils/resultRoute';
import { TIMELINE_QUERY_PARAM } from '../../features/timeline/timelineQueryParam';
import { getTimelineRecordElementId } from '../../features/timeline/utils/timelineAnchors';
import { getTimelineCategories } from '../../features/timeline/utils/timelineCategories';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

function filteredListPath(route: Routes, name: string): string {
  return name ? `${route}?q=${encodeURIComponent(name)}` : route;
}

/** Only offer a hit when an existing detail, list, or timeline can render it. */
export function recordSearchPath(
  document: ClinicalDocument,
): string | undefined {
  const resourceType = document.data_record.resource_type;
  const name = document.metadata?.display_name || '';

  if (isLaboratoryObservation(document as LabDocument)) {
    const group = groupLabs([document as LabDocument])[0];
    if (group) return `${Routes.Labs}/${encodeURIComponent(group.key)}`;
  }

  if (
    ['documentreference', 'documentreference_attachment'].includes(resourceType)
  ) {
    return `${Routes.Documents}/detail/${encodeURIComponent(document.metadata?.id || document.id)}`;
  }

  // These views do not require a dated Timeline card. Results addresses the
  // stored document id; the Devices list searches the same display name.
  if (resourceType === 'diagnosticreport' || resourceType === 'procedure') {
    return resultDetailPath(document.id);
  }
  if (resourceType === 'device') {
    return filteredListPath(Routes.Devices, name);
  }
  if (resourceType === 'practitioner') {
    // Directory derives the displayed name from FHIR, which can differ from
    // metadata.display_name. Reuse its mapper instead of opening an empty q.
    const provider = collectDirectory([document]).providers[0];
    return provider
      ? filteredListPath(Routes.Directory, provider.name)
      : undefined;
  }

  const date = document.metadata?.date;
  const hasTimelineDate = typeof date === 'string' && isValid(parseISO(date));
  if (
    !hasTimelineDate ||
    getTimelineCategories([document as any]).length === 0
  ) {
    // Both lists include undated entries and use display_name as their title.
    if (resourceType === 'encounter') {
      return filteredListPath(Routes.Encounters, name);
    }
    if (resourceType === 'servicerequest') {
      return filteredListPath(Routes.Referrals, name);
    }
    // Patient/provenance/directory plumbing and undated generic rows have no
    // usable Timeline target. They remain accessible through category browsing
    // where supported, rather than appearing as links to an empty timeline.
    return undefined;
  }

  // A name query activates individual cards and their record anchors. An
  // unfiltered grouped timeline does not expose every individual record id.
  if (!name) return undefined;
  const query = `?${TIMELINE_QUERY_PARAM}=${encodeURIComponent(name)}`;
  return `${Routes.Timeline}${query}#${getTimelineRecordElementId(document.id)}`;
}
