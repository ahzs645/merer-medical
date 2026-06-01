import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ManualSpecialtyDetails } from '../../manual-entry/manualSpecialtyDetails';
import { EyeLaterality, OptometryRecord } from '../types';

export type SurgeryDetail = {
  id: string;
  date?: string;
  title: string;
  surgeryType?: string;
  eye?: EyeLaterality;
  surgeon?: string;
  laserPlatform?: string;
  opticalZone?: string;
  ablationDepth?: string;
  flapThickness?: string;
  iolModel?: string;
  iolPower?: string;
  targetRefraction?: string;
  complications?: string;
  outcome?: string;
  followUp?: string;
  summary?: string;
  document: ClinicalDocument<unknown>;
};

/** Surgeries, newest first, with structured operation-note detail extracted. */
export function buildSurgeryList(records: OptometryRecord[]): SurgeryDetail[] {
  return records
    .filter((record) => record.kind === 'surgery')
    .map(getSurgeryDetail)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export function getSurgeryDetail(record: OptometryRecord): SurgeryDetail {
  const details = getSpecialtyDetails(record.document);
  const resource = getResource(record.document);

  return {
    id: record.id,
    date: record.date,
    title: record.title,
    surgeryType: details?.surgeryType || undefined,
    eye: details?.eyeSide || record.laterality,
    surgeon: details?.surgerySurgeon || resource?.performer?.[0]?.display,
    laserPlatform: details?.laserPlatform || undefined,
    opticalZone: details?.opticalZone || undefined,
    ablationDepth: details?.ablationDepth || undefined,
    flapThickness: details?.flapThickness || undefined,
    iolModel: details?.iolModel || undefined,
    iolPower: details?.iolPower || undefined,
    targetRefraction: details?.targetRefraction || undefined,
    complications: details?.surgeryComplications || undefined,
    outcome: details?.surgeryOutcome || undefined,
    followUp: details?.surgeryFollowUp || undefined,
    summary: record.summary,
    document: record.document,
  };
}

function getSpecialtyDetails(
  document: ClinicalDocument<unknown>,
): ManualSpecialtyDetails | undefined {
  const metadata = document.metadata as
    | { manual_specialty_details?: ManualSpecialtyDetails }
    | undefined;
  return metadata?.manual_specialty_details;
}

function getResource(document: ClinicalDocument<unknown>): any {
  const raw = document.data_record.raw as any;
  return raw?.resource || raw || {};
}
