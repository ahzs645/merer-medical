import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import {
  getManualObservationInterpretation,
  getManualObservationRange,
  getManualObservationValue,
} from '../../shared/utils/manualRecordUtils';
import {
  ManualObservationAbsentReason,
  ManualObservationValueKind,
} from './clinicalTerminology';
import { ManualRecordKind } from './manualRecordTypes';

export function normalizeAbsentReason(
  reason?: string,
): ManualObservationAbsentReason {
  switch (reason?.toLowerCase()) {
    case 'not-performed':
    case 'not performed':
      return 'not-performed';
    case 'not-applicable':
    case 'not applicable':
    case 'n/a':
      return 'not-applicable';
    case 'unknown':
      return 'unknown';
    case 'pending':
    default:
      return 'pending';
  }
}

export function getManualRecordKind(doc: ClinicalDocument): ManualRecordKind {
  const raw = doc.data_record.raw as { manual_kind?: ManualRecordKind };
  if (raw.manual_kind) return raw.manual_kind;
  if (doc.data_record.resource_type === 'observation') return 'lab';
  if (doc.data_record.resource_type === 'documentreference_attachment') {
    return 'document';
  }
  if (doc.data_record.resource_type === 'visionprescription') {
    return 'visionprescription';
  }
  return doc.data_record.resource_type as ManualRecordKind;
}

/**
 * Read-side counterparts to the builders in manualFhirDocument.ts: these
 * reconstruct form field values from a stored manual record so the edit
 * form can hydrate. Keeping parse and build side by side makes round-trip
 * drift easier to spot. The returned keys intentionally match the form
 * controller's field-group shapes so they can be applied as one patch.
 */

export type ParsedManualObservationFields = {
  valueKind: ManualObservationValueKind;
  comparator: string;
  rangeText: string;
  interpretation: string;
  absentReason?: ManualObservationAbsentReason;
  value?: string;
  unit?: string;
  rangeLow?: string;
  rangeHigh?: string;
};

export function parseManualObservationFields(
  doc: ClinicalDocument,
): ParsedManualObservationFields {
  const rawObservation = doc.data_record.raw as {
    resource?: {
      valueQuantity?: { comparator?: string };
      valueString?: string;
      valueCodeableConcept?: { text?: string };
      dataAbsentReason?: {
        coding?: Array<{ code?: string }>;
        text?: string;
      };
      referenceRange?: Array<{ text?: string }>;
    };
  };

  const parsed: ParsedManualObservationFields = {
    valueKind: 'quantity',
    comparator: rawObservation.resource?.valueQuantity?.comparator || '',
    rangeText: rawObservation.resource?.referenceRange?.[0]?.text || '',
    interpretation: getManualObservationInterpretation(doc) || '',
  };

  if (rawObservation.resource?.dataAbsentReason) {
    parsed.valueKind = 'absent';
    parsed.absentReason = normalizeAbsentReason(
      rawObservation.resource.dataAbsentReason.coding?.[0]?.code ||
        rawObservation.resource.dataAbsentReason.text,
    );
  } else if (rawObservation.resource?.valueCodeableConcept) {
    parsed.valueKind = 'coded';
  } else if (rawObservation.resource?.valueString) {
    parsed.valueKind = 'string';
  }

  const observationValue = getManualObservationValue(doc);
  if (observationValue) {
    const [first, ...rest] = observationValue.split(' ');
    parsed.value = first;
    parsed.unit = rest.join(' ');
  }

  const range = getManualObservationRange(doc);
  if (range?.includes('-')) {
    const [low, highWithUnit] = range.split('-');
    const [high] = highWithUnit.trim().split(' ');
    parsed.rangeLow = low.trim();
    parsed.rangeHigh = high.trim();
  }

  return parsed;
}

export type ParsedManualCoverageFields = {
  coverageMemberId: string;
  coveragePlanType: string;
  coverageRelationship: string;
  coverageStatus: 'active' | 'cancelled';
  coveragePeriodStart: string;
  coveragePeriodEnd: string;
  coverageGroupNumber: string;
  coveragePhone: string;
  coverageAddress: string;
};

export function parseManualCoverageFields(
  doc: ClinicalDocument,
): ParsedManualCoverageFields | undefined {
  if (doc.data_record.resource_type !== 'coverage') return undefined;
  const coverageResource = (
    doc.data_record.raw as {
      resource?: {
        subscriberId?: string;
        status?: string;
        type?: { text?: string };
        relationship?: { text?: string };
        period?: { start?: string; end?: string };
        class?: Array<{ type?: { text?: string }; value?: string }>;
      };
    }
  ).resource;
  const coverageClass = (name: string) =>
    coverageResource?.class?.find(
      (entry) => entry.type?.text?.toLowerCase() === name,
    )?.value || '';

  return {
    coverageMemberId: coverageResource?.subscriberId || '',
    coveragePlanType: coverageResource?.type?.text || '',
    coverageRelationship: coverageResource?.relationship?.text || '',
    coverageStatus:
      coverageResource?.status === 'cancelled' ? 'cancelled' : 'active',
    coveragePeriodStart: (coverageResource?.period?.start || '').slice(0, 10),
    coveragePeriodEnd: (coverageResource?.period?.end || '').slice(0, 10),
    coverageGroupNumber: coverageClass('group'),
    coveragePhone: coverageClass('phone'),
    coverageAddress: coverageClass('address'),
  };
}

export function parseManualFamilyRelationship(doc: ClinicalDocument): string {
  if (doc.data_record.resource_type !== 'familymemberhistory') return '';
  const familyResource = (
    doc.data_record.raw as {
      resource?: { relationship?: { text?: string } };
    }
  ).resource;
  return familyResource?.relationship?.text || '';
}
