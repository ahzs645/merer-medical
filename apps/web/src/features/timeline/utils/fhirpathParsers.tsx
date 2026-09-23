import { BundleEntry, Observation, Quantity } from 'fhir/r2';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { getFhirResource } from '../../../shared/utils/fhirResource';
import { fhirPathFirst } from '../../../shared/utils/fhirPathValues';

export function getReferenceRangeString(
  item: ClinicalDocument<BundleEntry<Observation>>,
) {
  return fhirPathFirst<string>(getFhirResource(item), 'referenceRange.text');
}

export function getReferenceRangeDisplay(
  item: ClinicalDocument<BundleEntry<Observation>>,
): string | undefined {
  const resource = getFhirResource<any>(item);
  const range = resource?.referenceRange?.[0];
  if (!range) return undefined;
  if (range.text) return range.text;

  const low = range.low?.value;
  const high = range.high?.value;
  const unit = range.low?.unit || range.high?.unit || getValueUnit(item);
  if (low !== undefined && high !== undefined) {
    return `${low} - ${high}${unit ? ` ${unit}` : ''}`;
  }
  if (low !== undefined) return `>= ${low}${unit ? ` ${unit}` : ''}`;
  if (high !== undefined) return `<= ${high}${unit ? ` ${unit}` : ''}`;
  return undefined;
}

export function getReferenceRangeLow(
  item: ClinicalDocument<BundleEntry<Observation>>,
) {
  return fhirPathFirst<Quantity>(getFhirResource(item), 'referenceRange.low');
}

export function getReferenceRangeHigh(
  item: ClinicalDocument<BundleEntry<Observation>>,
) {
  return fhirPathFirst<Quantity>(getFhirResource(item), 'referenceRange.high');
}

export function getValueUnit(
  item: ClinicalDocument<BundleEntry<Observation>>,
): string | undefined {
  return (
    fhirPathFirst<string>(getFhirResource(item), 'valueQuantity.unit') ||
    undefined
  );
}

export function getValueQuantity(
  item: ClinicalDocument<BundleEntry<Observation>>,
): number | undefined {
  const val: number | undefined = fhirPathFirst<number>(
    getFhirResource(item),
    'valueQuantity.value',
  );

  return val;
}

function formatValueQuantity(
  item: ClinicalDocument<BundleEntry<Observation>>,
): string | undefined {
  const val: number | undefined = getValueQuantity(item);
  if (val && val?.toString().length > 5) {
    return Number.isInteger(val) ? `${val}` : val?.toPrecision(5);
  }
  return undefined;
}

export function getValueString(
  item: ClinicalDocument<BundleEntry<Observation>>,
) {
  const resource = getFhirResource(item);
  return (
    fhirPathFirst<string>(resource, 'valueString') ||
    fhirPathFirst<string>(resource, 'valueCodeableConcept.text') ||
    fhirPathFirst<string>(resource, 'valueCodeableConcept.coding.display') ||
    fhirPathFirst<string>(resource, 'dataAbsentReason.text') ||
    fhirPathFirst<string>(resource, 'dataAbsentReason.coding.display') ||
    fhirPathFirst<string>(resource, 'dataAbsentReason.coding.code')
  );
}

export function getComments(item: ClinicalDocument<BundleEntry<Observation>>) {
  return fhirPathFirst<string>(getFhirResource(item), 'comments');
}

export function getInterpretationText(
  item: ClinicalDocument<BundleEntry<Observation>>,
) {
  return fhirPathFirst<string>(getFhirResource(item), 'interpretation.text');
}

export type ObservationInterpretationFlag =
  | 'normal'
  | 'low'
  | 'high'
  | 'abnormal'
  | 'borderline';

export function getObservationInterpretationFlag(
  item: ClinicalDocument<BundleEntry<Observation>>,
): ObservationInterpretationFlag {
  const resource = getFhirResource<any>(item);
  const interpretationValues = [
    ...(Array.isArray(resource?.interpretation) ? resource.interpretation : []),
  ]
    .flatMap((interpretation) => [
      interpretation?.text,
      ...(interpretation?.coding || []).flatMap((coding: any) => [
        coding?.code,
        coding?.display,
      ]),
    ])
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\b(low|below|decreased|l)\b/.test(interpretationValues)) return 'low';
  if (/\b(high|above|elevated|increased|h)\b/.test(interpretationValues)) {
    return 'high';
  }
  if (/\b(borderline|indeterminate)\b/.test(interpretationValues)) {
    return 'borderline';
  }
  if (/\b(abnormal|positive|detected|a)\b/.test(interpretationValues)) {
    return 'abnormal';
  }

  return isOutOfRangeResult(item) ? 'abnormal' : 'normal';
}
/**
 * Takes a RxDocument of type ClinicalDocument<Observation> and returns true if the value is out of reference range
 * @param item
 */

export function isOutOfRangeResult(
  item: ClinicalDocument<BundleEntry<Observation>>,
): boolean {
  const resource = getFhirResource<any>(item);
  const low = resource?.referenceRange?.[0]?.low?.value;
  const high = resource?.referenceRange?.[0]?.high?.value;
  const value = resource?.valueQuantity?.value;

  if (
    low !== undefined &&
    high !== undefined &&
    value !== undefined &&
    !isNaN(Number(low)) &&
    !isNaN(Number(high)) &&
    !isNaN(Number(value))
  ) {
    return value < low || value > high;
  }
  return false;
}
