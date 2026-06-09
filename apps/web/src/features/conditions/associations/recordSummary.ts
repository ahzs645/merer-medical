import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { getFhirResource } from '../../../shared/utils/fhirResource';

type FhirRecord = Record<string, unknown>;

export interface RecordSummary {
  name: string;
  date?: string;
  /** Plain code strings (any system). */
  codes: string[];
  /** LOINC codes only. */
  loinc: string[];
}

function isRecord(value: unknown): value is FhirRecord {
  return typeof value === 'object' && value !== null;
}

function str(value: unknown): string | undefined {
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
    str(value['text']) ||
    str(value['display']) ||
    str(value['code']) ||
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
    .map((c) => str(c['code']))
    .filter((c): c is string => Boolean(c));
}

function loincCodes(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const coding = value['coding'];
  if (!Array.isArray(coding)) return [];
  return coding
    .filter(isRecord)
    .filter((c) =>
      String(c['system'] || '')
        .toLowerCase()
        .includes('loinc'),
    )
    .map((c) => str(c['code']))
    .filter((c): c is string => Boolean(c));
}

function getDate(
  resource: FhirRecord,
  document: ClinicalDocument,
): string | undefined {
  const candidates = [
    resource['effectiveDateTime'],
    isRecord(resource['effectivePeriod'])
      ? resource['effectivePeriod']['start']
      : undefined,
    resource['issued'],
    isRecord(resource['performedPeriod'])
      ? resource['performedPeriod']['start']
      : undefined,
    resource['performedDateTime'],
    resource['onsetDateTime'],
    resource['recordedDate'],
    resource['dateRecorded'],
    isRecord(resource['period']) ? resource['period']['start'] : undefined,
    isRecord(resource['authoredOn']) ? undefined : resource['authoredOn'],
    document.metadata?.date,
  ];
  return candidates.map(str).find(Boolean);
}

/** Pull the medication concept off any of the medication resource variants. */
function medicationConcept(resource: FhirRecord): unknown {
  return (
    resource['medicationCodeableConcept'] ||
    resource['medication'] ||
    (isRecord(resource['medicationReference'])
      ? resource['medicationReference']['display']
      : undefined)
  );
}

export function summarizeRecord(
  document: ClinicalDocument,
  resourceType: string,
): RecordSummary {
  const resource = getFhirResource<FhirRecord>(document);
  const isMedication = resourceType.startsWith('medication');
  const concept = isMedication ? medicationConcept(resource) : resource['code'];

  const name =
    document.metadata?.display_name ||
    firstText(concept) ||
    firstText(resource['code']) ||
    'Untitled record';

  const codes = [
    ...conceptCodes(isMedication ? concept : resource['code']),
    ...conceptCodes(resource['category']),
  ];

  const loinc = [
    ...(document.metadata?.loinc_coding ?? []),
    ...loincCodes(resource['code']),
  ];

  return {
    name,
    date: getDate(resource, document),
    codes: Array.from(new Set(codes)),
    loinc: Array.from(new Set(loinc)),
  };
}

/**
 * Condition references that a CarePlan / Goal addresses. Returns both the
 * referenced id (trailing `Condition/{id}`) and the display text, so we can
 * match against a stored condition by either.
 */
export function addressedConditionRefs(
  document: ClinicalDocument,
): { id?: string; display?: string }[] {
  const resource = getFhirResource<FhirRecord>(document);
  const addresses = resource['addresses'];
  if (!Array.isArray(addresses)) return [];
  return addresses.filter(isRecord).map((ref) => {
    const reference = str(ref['reference']);
    const id = reference?.match(/Condition\/([^/]+)$/)?.[1];
    return { id, display: str(ref['display']) };
  });
}
