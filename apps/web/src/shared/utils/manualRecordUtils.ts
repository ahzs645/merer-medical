import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { getFhirResource } from './fhirResource';

type ManualRawResource = {
  fullUrl?: string;
  resource?: {
    note?: Array<{ text?: string }>;
    text?: { div?: string };
    valueQuantity?: {
      value?: number | string;
      unit?: string;
      comparator?: string;
    };
    valueString?: string;
    valueCodeableConcept?: {
      text?: string;
      coding?: Array<{ display?: string }>;
    };
    dataAbsentReason?: {
      text?: string;
      coding?: Array<{ display?: string; code?: string }>;
    };
    referenceRange?: Array<{
      low?: { value?: number | string; unit?: string };
      high?: { value?: number | string; unit?: string };
      text?: string;
    }>;
    interpretation?: { text?: string; coding?: Array<{ display?: string }> };
    dosage?: Array<{
      text?: string;
      route?: { text?: string };
      timing?: { code?: { text?: string } };
    }>;
  };
};

export type ManualMedicationParts = {
  dose: string;
  frequency: string;
  route: string;
};

export function isManualRecord(item: ClinicalDocument): boolean {
  const raw = item.data_record.raw as {
    fullUrl?: string;
    source_file?: string;
  };
  return (
    raw.fullUrl?.startsWith('manual:') ||
    item.connection_record_id?.startsWith('c-') ||
    item.metadata?.id?.startsWith('manual:') ||
    Boolean(
      (item.metadata as Record<string, unknown> | undefined)?.['source_file'],
    ) ||
    false
  );
}

export function getManualRecordNote(
  item: ClinicalDocument,
): string | undefined {
  if (!isManualRecord(item)) {
    return undefined;
  }

  const resource = getFhirResource<ManualRawResource['resource']>(item);
  const noteText = resource?.note?.find((note) => note.text)?.text;
  const fallbackText = resource?.text?.div;
  const text = noteText || fallbackText;
  return text?.trim() ? text.trim() : undefined;
}

export function getManualObservationValue(
  item: ClinicalDocument,
): string | undefined {
  if (!isManualRecord(item)) return undefined;
  const resource = getFhirResource<ManualRawResource['resource']>(item);
  const absentReason =
    resource?.dataAbsentReason?.text ||
    resource?.dataAbsentReason?.coding?.find(
      (coding) => coding.display || coding.code,
    )?.display ||
    resource?.dataAbsentReason?.coding?.find(
      (coding) => coding.display || coding.code,
    )?.code;
  if (absentReason) return absentReason;

  const codedValue =
    resource?.valueCodeableConcept?.text ||
    resource?.valueCodeableConcept?.coding?.find((coding) => coding.display)
      ?.display;
  if (codedValue) return codedValue;

  if (resource?.valueString) return resource.valueString;

  const value = resource?.valueQuantity?.value;
  if (value === undefined || value === '') return undefined;
  const unit = resource?.valueQuantity?.unit;
  const comparator = resource?.valueQuantity?.comparator || '';
  return `${comparator}${value}${unit ? ` ${unit}` : ''}`;
}

export function getManualObservationRange(
  item: ClinicalDocument,
): string | undefined {
  if (!isManualRecord(item)) return undefined;
  const resource = getFhirResource<ManualRawResource['resource']>(item);
  const range = resource?.referenceRange?.[0];
  if (!range) return undefined;
  if (range.text?.trim()) return range.text.trim();
  const low = range.low?.value;
  const high = range.high?.value;
  const unit =
    range.low?.unit || range.high?.unit || resource?.valueQuantity?.unit;
  if (low === undefined && high === undefined) return undefined;
  if (low !== undefined && high !== undefined)
    return `${low}-${high}${unit ? ` ${unit}` : ''}`;
  if (low !== undefined) return `>= ${low}${unit ? ` ${unit}` : ''}`;
  return `<= ${high}${unit ? ` ${unit}` : ''}`;
}

export function getManualObservationInterpretation(
  item: ClinicalDocument,
): string | undefined {
  if (!isManualRecord(item)) return undefined;
  const resource = getFhirResource<ManualRawResource['resource']>(item);
  return (
    resource?.interpretation?.text ||
    resource?.interpretation?.coding?.find((coding) => coding.display)
      ?.display
  );
}

export function getManualMedicationParts(
  item: ClinicalDocument,
): ManualMedicationParts {
  const empty = { dose: '', frequency: '', route: '' };
  if (!isManualRecord(item)) return empty;
  const resource = getFhirResource<ManualRawResource['resource']>(item);
  const dosage = resource?.dosage?.[0];
  if (!dosage) return empty;
  return {
    dose: dosage.text?.trim() || '',
    frequency: dosage.timing?.code?.text?.trim() || '',
    route: dosage.route?.text?.trim() || '',
  };
}

export function getManualMedicationDetail(
  item: ClinicalDocument,
): string | undefined {
  const { dose, frequency, route } = getManualMedicationParts(item);
  const parts = [
    dose && `Dose: ${dose}`,
    frequency && `Frequency: ${frequency}`,
    route && `Route: ${route}`,
  ].filter(Boolean);
  return parts.length ? parts.join(' • ') : undefined;
}
