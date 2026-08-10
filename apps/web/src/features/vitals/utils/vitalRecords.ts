import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { getFhirResource } from '../../../shared/utils/fhirResource';
import { isManualRecord } from '../../../shared/utils/manualRecordUtils';

type CategoryLike = { coding?: Array<{ code?: string }>; text?: string };

/**
 * The one place the Vitals page decides what a vital sign is.
 *
 * Two ways in. A synced Observation says so in its FHIR category. A vital typed
 * by hand says so in `manual_kind`, because the manual builder wrote no
 * category at all on vitals until recently: a hand-entered "Body weight 72 kg"
 * showed on the Timeline and on none of Vitals, Labs or All results. Fixing the
 * builder only helps records saved after the upgrade, so the ones already in
 * someone's database are matched on the marker they do carry.
 */
export function isVitalSignObservation(document: ClinicalDocument): boolean {
  if (document.data_record?.resource_type !== 'observation') return false;

  const resource = getFhirResource<{
    category?: CategoryLike[] | CategoryLike;
  }>(document);
  // FHIR models Observation.category as an array, but some stored/imported
  // records carry a single CodeableConcept object instead. Normalize both
  // shapes to an array so `.some` never throws on the object form.
  const raw = resource?.category;
  const categories = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const hasVitalSignsCategory = categories.some((category) =>
    (category.coding || []).some((coding) => coding.code === 'vital-signs'),
  );
  if (hasVitalSignsCategory) return true;

  return (
    isManualRecord(document) &&
    getManualKind(document) === 'vital' &&
    !isSpecialtyRecord(document)
  );
}

function getManualKind(document: ClinicalDocument): string | undefined {
  const raw = document.data_record?.raw as
    | { manual_kind?: string }
    | string
    | undefined;
  return raw && typeof raw === 'object' ? raw.manual_kind : undefined;
}

/**
 * Dental tooth findings and optometry IOP / acuity entries are stored as
 * vital-kind Observations as well, and they already have tabs of their own.
 * The category-less fallback is here to un-hide general vitals, not to move
 * records out from under the pages that show them today.
 */
function isSpecialtyRecord(document: ClinicalDocument): boolean {
  const specialty =
    document.metadata?.manual_specialty ||
    (
      document.metadata?.manual_specialty_details as
        | { specialty?: string }
        | undefined
    )?.specialty;
  return specialty === 'dental' || specialty === 'optometry';
}
