import { BundleEntry, Observation } from 'fhir/r2';
import * as fhirpath from 'fhirpath';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { getFhirResource } from '../../../shared/utils/fhirResource';

export function getReferenceRangeString(
  item: ClinicalDocument<BundleEntry<Observation>>,
) {
  return fhirpath.evaluate(getFhirResource(item), 'referenceRange.text')?.[0];
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
  return fhirpath.evaluate(getFhirResource(item), 'referenceRange.low')?.[0];
}

export function getReferenceRangeHigh(
  item: ClinicalDocument<BundleEntry<Observation>>,
) {
  return fhirpath.evaluate(getFhirResource(item), 'referenceRange.high')?.[0];
}

export function getValueUnit(
  item: ClinicalDocument<BundleEntry<Observation>>,
): string | undefined {
  return (
    fhirpath.evaluate(getFhirResource(item), 'valueQuantity.unit')?.[0] ||
    undefined
  );
}

export function getValueQuantity(
  item: ClinicalDocument<BundleEntry<Observation>>,
): number | undefined {
  const val: number | undefined = fhirpath.evaluate(
    getFhirResource(item),
    'valueQuantity.value',
  )?.[0];

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
    fhirpath.evaluate(resource, 'valueString')?.[0] ||
    fhirpath.evaluate(resource, 'valueCodeableConcept.text')?.[0] ||
    fhirpath.evaluate(resource, 'valueCodeableConcept.coding.display')?.[0] ||
    fhirpath.evaluate(resource, 'dataAbsentReason.text')?.[0] ||
    fhirpath.evaluate(resource, 'dataAbsentReason.coding.display')?.[0] ||
    fhirpath.evaluate(resource, 'dataAbsentReason.coding.code')?.[0]
  );
}

export function getComments(item: ClinicalDocument<BundleEntry<Observation>>) {
  return fhirpath.evaluate(getFhirResource(item), 'comments')?.[0];
}

export function getInterpretationText(
  item: ClinicalDocument<BundleEntry<Observation>>,
) {
  return fhirpath.evaluate(getFhirResource(item), 'interpretation.text')?.[0];
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
