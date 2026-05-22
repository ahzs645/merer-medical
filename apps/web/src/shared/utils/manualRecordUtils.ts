import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

type ManualRawResource = {
  fullUrl?: string;
  resource?: {
    note?: Array<{ text?: string }>;
    text?: { div?: string };
    valueQuantity?: { value?: number | string; unit?: string };
    referenceRange?: Array<{
      low?: { value?: number | string; unit?: string };
      high?: { value?: number | string; unit?: string };
      text?: string;
    }>;
    interpretation?: { text?: string; coding?: Array<{ display?: string }> };
  };
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
  const value = raw.resource?.valueQuantity?.value;
  if (value === undefined || value === '') return undefined;
  const unit = raw.resource?.valueQuantity?.unit;
  return `${value}${unit ? ` ${unit}` : ''}`;
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
