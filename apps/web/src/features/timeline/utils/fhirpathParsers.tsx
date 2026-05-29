import { BundleEntry, Observation } from 'fhir/r2';
import * as fhirpath from 'fhirpath';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { getFhirResource } from '../../../shared/utils/fhirResource';

export function getReferenceRangeString(
  item: ClinicalDocument<BundleEntry<Observation>>,
) {
  return fhirpath.evaluate(
    getFhirResource(item),
    'referenceRange.text',
  )?.[0];
}

export function getReferenceRangeLow(
  item: ClinicalDocument<BundleEntry<Observation>>,
) {
  return fhirpath.evaluate(
    getFhirResource(item),
    'referenceRange.low',
  )?.[0];
}

export function getReferenceRangeHigh(
  item: ClinicalDocument<BundleEntry<Observation>>,
) {
  return fhirpath.evaluate(
    getFhirResource(item),
    'referenceRange.high',
  )?.[0];
}

export function getValueUnit(
  item: ClinicalDocument<BundleEntry<Observation>>,
): string | undefined {
  return (
    fhirpath.evaluate(
      getFhirResource(item),
      'valueQuantity.unit',
    )?.[0] || undefined
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
  return fhirpath.evaluate(
    getFhirResource(item),
    'interpretation.text',
  )?.[0];
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

  if (low && high && value && !isNaN(low) && !isNaN(high) && !isNaN(value)) {
    return value < low || value > high;
  }
  return false;
}
