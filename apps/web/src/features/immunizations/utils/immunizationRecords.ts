import { inferVaccineGroup } from '@mere/immunization-forecast';

import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ImmunizationRecord } from '../types';

/**
 * Only the fields we actually read off an Immunization resource. Sources mix
 * FHIR DSTU2 and R4 (e.g. R4's `protocolApplied`), so a single FHIR type from
 * the `fhir` package would not line up — this captures the read surface, with
 * every field optional because portals populate them inconsistently.
 */
type ImmunizationResource = {
  date?: string;
  status?: string;
  lotNumber?: string;
  manufacturer?: { display?: string };
  performer?: { display?: string };
  vaccineCode?: {
    text?: string;
    coding?: Array<{ display?: string }>;
  };
  protocolApplied?: Array<{ doseNumberPositiveInt?: number }>;
  note?: Array<{ text?: string }>;
};

export function mapImmunizationDocument(
  document: ClinicalDocument<unknown>,
): ImmunizationRecord {
  const resource = getResource(document);
  const vaccineName = getVaccineName(document);
  const searchable = [vaccineName, JSON.stringify(resource?.vaccineCode || '')]
    .filter(Boolean)
    .join(' ');

  return {
    id: document.id,
    document,
    vaccineKey: inferVaccineGroup({
      vaccineCode: searchable,
      vaccineName,
    }),
    vaccineName,
    date: document.metadata?.date || resource?.date,
    lotNumber: resource?.lotNumber,
    manufacturer: resource?.manufacturer?.display,
    performer: resource?.performer?.display,
    status: resource?.status,
    doseNumber: resource?.protocolApplied?.[0]?.doseNumberPositiveInt,
    summary: resource?.note?.[0]?.text,
  };
}

export function buildImmunizationCounts(records: ImmunizationRecord[]) {
  return {
    total: records.length,
    vaccineTypes: new Set(records.map((record) => record.vaccineKey)).size,
    boostersTracked: records.filter((record) =>
      ['covid-19', 'influenza', 'tdap-td'].includes(record.vaccineKey),
    ).length,
  };
}

function getVaccineName(document: ClinicalDocument<unknown>) {
  const resource = getResource(document);
  return (
    document.metadata?.display_name ||
    resource?.vaccineCode?.text ||
    resource?.vaccineCode?.coding?.[0]?.display ||
    'Immunization'
  );
}

function getResource(
  document: ClinicalDocument<unknown>,
): ImmunizationResource {
  // Some sources nest the resource under `data_record.resource`; others store
  // the resource as the `data_record` itself. Fall back to the latter.
  const wrapper = document.data_record as unknown as {
    resource?: ImmunizationResource;
  } & ImmunizationResource;
  return wrapper?.resource || wrapper;
}
