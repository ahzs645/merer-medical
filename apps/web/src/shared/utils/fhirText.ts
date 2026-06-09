/** Lightweight readers for FHIR CodeableConcept / Coding shapes. */

type FhirRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is FhirRecord {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** First human-readable text from a string / CodeableConcept / Coding / array. */
export function firstText(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(firstText).find(Boolean);
  if (!isRecord(value)) return undefined;
  const coding = value['coding'];
  return (
    asString(value['text']) ||
    asString(value['display']) ||
    asString(value['code']) ||
    (Array.isArray(coding) ? coding.map(firstText).find(Boolean) : undefined)
  );
}

/** All `code` strings from a CodeableConcept (or array of them). */
export function conceptCodes(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(conceptCodes);
  if (!isRecord(value)) return [];
  const coding = value['coding'];
  if (!Array.isArray(coding)) return [];
  return coding
    .filter(isRecord)
    .map((c) => asString(c['code']))
    .filter((c): c is string => Boolean(c));
}

/** Start string from a date string or a Period. */
export function periodStart(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (isRecord(value)) return asString(value['start']);
  return undefined;
}
