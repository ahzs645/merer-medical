import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

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
  };
  return (
    raw.fullUrl?.startsWith('manual:') ||
    item.metadata?.id?.startsWith('manual:') ||
    false
  );
}

export function getManualRecordNote(
  item: ClinicalDocument,
): string | undefined {
  if (!isManualRecord(item)) {
    return undefined;
  }

  const raw = item.data_record.raw as ManualRawResource;
  const noteText = raw.resource?.note?.find((note) => note.text)?.text;
  const fallbackText = raw.resource?.text?.div;
  const text = noteText || fallbackText;
  return text?.trim() ? text.trim() : undefined;
}

export function getManualObservationValue(
  item: ClinicalDocument,
): string | undefined {
  if (!isManualRecord(item)) return undefined;
  const raw = item.data_record.raw as ManualRawResource;
  const absentReason =
    raw.resource?.dataAbsentReason?.text ||
    raw.resource?.dataAbsentReason?.coding?.find(
      (coding) => coding.display || coding.code,
    )?.display ||
    raw.resource?.dataAbsentReason?.coding?.find(
      (coding) => coding.display || coding.code,
    )?.code;
  if (absentReason) return absentReason;

  const codedValue =
    raw.resource?.valueCodeableConcept?.text ||
    raw.resource?.valueCodeableConcept?.coding?.find((coding) => coding.display)
      ?.display;
  if (codedValue) return codedValue;

  if (raw.resource?.valueString) return raw.resource.valueString;

  const value = raw.resource?.valueQuantity?.value;
  if (value === undefined || value === '') return undefined;
  const unit = raw.resource?.valueQuantity?.unit;
  const comparator = raw.resource?.valueQuantity?.comparator || '';
  return `${comparator}${value}${unit ? ` ${unit}` : ''}`;
}

export function getManualObservationRange(
  item: ClinicalDocument,
): string | undefined {
  if (!isManualRecord(item)) return undefined;
  const raw = item.data_record.raw as ManualRawResource;
  const range = raw.resource?.referenceRange?.[0];
  if (!range) return undefined;
  if (range.text?.trim()) return range.text.trim();
  const low = range.low?.value;
  const high = range.high?.value;
  const unit =
    range.low?.unit || range.high?.unit || raw.resource?.valueQuantity?.unit;
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
  const raw = item.data_record.raw as ManualRawResource;
  return (
    raw.resource?.interpretation?.text ||
    raw.resource?.interpretation?.coding?.find((coding) => coding.display)
      ?.display
  );
}

export function getManualMedicationParts(
  item: ClinicalDocument,
): ManualMedicationParts {
  const empty = { dose: '', frequency: '', route: '' };
  if (!isManualRecord(item)) return empty;
  const raw = item.data_record.raw as ManualRawResource;
  const dosage = raw.resource?.dosage?.[0];
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
