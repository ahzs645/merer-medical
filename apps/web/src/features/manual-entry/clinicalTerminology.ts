import {
  DomainTerminologyEntry,
  TerminologyDomain,
  TerminologyLanguage,
  TerminologyLookupMode,
  TerminologyProfile,
  getTerminologyDisplay,
  searchTerminologyEntries,
} from '../terminology/terminologyService';

export type TerminologyRecordKind =
  | 'condition'
  | 'medicationstatement'
  | 'immunization'
  | 'procedure'
  | 'allergyintolerance'
  | 'encounter'
  | 'lab'
  | 'vital';

export type TerminologyEntry = DomainTerminologyEntry & {
  kind: TerminologyRecordKind;
  display: string;
};

export type ManualObservationValueKind =
  | 'quantity'
  | 'string'
  | 'coded'
  | 'absent';

export type ManualObservationComparator = '<' | '<=' | '>' | '>=';

export type ManualObservationAbsentReason =
  | 'pending'
  | 'not-performed'
  | 'unknown'
  | 'not-applicable';

export type ManualObservationValue =
  | {
      kind: 'quantity';
      value: number;
      unit?: string;
      comparator?: ManualObservationComparator;
    }
  | {
      kind: 'string';
      value: string;
      unit?: string;
    }
  | {
      kind: 'coded';
      text: string;
      code?: string;
      system?: string;
      display?: string;
    }
  | {
      kind: 'absent';
      reason: ManualObservationAbsentReason;
      text?: string;
    };

export type LabResultRow = {
  id: string;
  title: string;
  valueKind: ManualObservationValueKind;
  comparator: string;
  value: string;
  unit: string;
  rangeLow: string;
  rangeHigh: string;
  rangeText: string;
  interpretation: string;
  absentReason: ManualObservationAbsentReason;
  terminology?: TerminologyEntry;
};

export function terminologyKindToDomain(
  kind: TerminologyRecordKind,
): TerminologyDomain {
  switch (kind) {
    case 'medicationstatement':
      return 'medication';
    case 'allergyintolerance':
      return 'allergy';
    default:
      return kind;
  }
}

export function domainToTerminologyKind(
  domain: TerminologyDomain,
): TerminologyRecordKind {
  switch (domain) {
    case 'medication':
      return 'medicationstatement';
    case 'allergy':
      return 'allergyintolerance';
    default:
      return domain;
  }
}

export function toManualTerminologyEntry(
  entry: DomainTerminologyEntry,
  language: TerminologyLanguage,
): TerminologyEntry {
  return {
    ...entry,
    kind: domainToTerminologyKind(entry.domain),
    display: getTerminologyDisplay(entry, language),
  };
}

export async function searchTerminology({
  kind,
  query,
  profile,
  language,
  lookupMode,
  remoteEnabled,
}: {
  kind: TerminologyRecordKind;
  query: string;
  profile: TerminologyProfile;
  language: TerminologyLanguage;
  lookupMode?: TerminologyLookupMode;
  remoteEnabled?: boolean;
}): Promise<TerminologyEntry[]> {
  const entries = await searchTerminologyEntries({
    profile,
    language,
    lookupMode,
    remoteEnabled,
    domain: terminologyKindToDomain(kind),
    query,
  });
  return entries.map((entry) => toManualTerminologyEntry(entry, language));
}
