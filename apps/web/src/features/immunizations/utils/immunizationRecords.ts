import { inferVaccineGroup } from '@mere/immunization-forecast';

import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ImmunizationRecord } from '../types';

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
    covid: records.filter((record) => record.vaccineKey === 'covid-19').length,
    influenza: records.filter((record) => record.vaccineKey === 'influenza')
      .length,
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

function getResource(document: ClinicalDocument<unknown>): any {
  return (document.data_record as any)?.resource || document.data_record;
}
