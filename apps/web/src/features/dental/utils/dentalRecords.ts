import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ImagingItem } from '../../imaging/types';
import {
  DentalRecord,
  DentalRecordDetails,
  DentalRecordKind,
  DentalToothSurfaceModel,
  ToothSurface,
} from '../types';

const DENTAL_TERMS = [
  'bitewing',
  'bruxism',
  'caries',
  'cbct',
  'crown',
  'dental',
  'dentition',
  'endodontic',
  'gingiva',
  'implant',
  'intraoral',
  'aligner',
  'braces',
  'cephalometric',
  'malocclusion',
  'mandible',
  'maxilla',
  'odontogram',
  'oral',
  'panoramic',
  'periapical',
  'periodontal',
  'pulp',
  'root canal',
  'orthodontic',
  'orthodontist',
  'retainer',
  'overbite',
  'overjet',
  'crossbite',
  'scaling',
  'cleaning',
  'prophylaxis',
  'hygiene',
  'fluoride',
  'recall',
  'tooth',
  'teeth',
];

const PERIO_TERMS = [
  'attachment loss',
  'bleeding',
  'calculus',
  'furcation',
  'gingival',
  'mobility',
  'periodontal',
  'plaque',
  'pocket',
  'probing',
  'recession',
  'suppuration',
];

const REFERRAL_TERMS = ['referral', 'consult', 'oral surgery'];
const SURGERY_TERMS = [
  'bone graft',
  'extraction',
  'implant surgery',
  'oral surgery',
  'post-op',
  'postoperative',
  'sinus lift',
  'surgical',
  'wisdom tooth',
];
const ORTHODONTIC_TERMS = [
  'aligner',
  'angle class',
  'appliance',
  'braces',
  'bracket',
  'cephalometric',
  'class i',
  'class ii',
  'class iii',
  'crossbite',
  'elastics',
  'expander',
  'malocclusion',
  'midline',
  'orthodontic',
  'orthodontist',
  'overbite',
  'overjet',
  'retainer',
  'wire change',
];
const CLEANING_TERMS = [
  'cleaning',
  'prophylaxis',
  'hygiene',
  'scaling',
  'root planing',
  'periodontal maintenance',
  'fluoride',
  'recall',
];

const SURFACE_PATTERN = /\b(MOD|MO|DO|MID|MOB|MOL|M|O|I|D|B|F|L)\b/g;
const TOOTH_PATTERN =
  /\b(?:tooth|teeth|#|no\.?|number)?\s*(3[0-2]|[1-2][0-9]|[1-9])\b/gi;

export function isDentalDocument(document: ClinicalDocument<unknown>): boolean {
  const details = getDentalDetails(document);
  if (details?.specialty === 'dental') return true;

  const text = searchableText(document).toLowerCase();
  return DENTAL_TERMS.some((term) => text.includes(term));
}

export function mapDentalDocument(
  document: ClinicalDocument<unknown>,
): DentalRecord {
  const text = searchableText(document);
  const details = getDentalDetails(document);
  return {
    id: document.id,
    document,
    kind: inferDentalKind(document, text, details),
    title: getTitle(document),
    date: document.metadata?.date,
    toothNumbers: getToothNumbers(details, text),
    surfaces: getSurfaces(details, text),
    summary: getSummary(document, details),
    details,
    dentalModel: buildDentalToothSurfaceModel(details, text),
  };
}

export function buildRecordsByTooth(records: DentalRecord[]) {
  const recordsByTooth = new Map<string, DentalRecord[]>();

  for (const record of records) {
    for (const tooth of record.toothNumbers) {
      recordsByTooth.set(tooth, [...(recordsByTooth.get(tooth) || []), record]);
    }
  }

  return recordsByTooth;
}

export function buildDentalCounts(
  records: DentalRecord[],
  imaging: ImagingItem[],
) {
  return {
    conditions: records.filter((record) => record.kind === 'condition').length,
    cleanings: records.filter((record) => record.kind === 'cleaning').length,
    orthodontics: records.filter((record) => record.kind === 'orthodontic')
      .length,
    findings: records.filter((record) => record.kind === 'finding').length,
    procedures: records.filter((record) => record.kind === 'procedure').length,
    treatmentPlan: records.filter((record) => record.kind === 'treatmentPlan')
      .length,
    perio: records.filter((record) => record.kind === 'perio').length,
    notes: records.filter((record) => record.kind === 'note').length,
    referrals: records.filter((record) => record.kind === 'referral').length,
    surgery: records.filter((record) => record.kind === 'surgery').length,
    images: imaging.length,
  };
}

export function filterDentalImaging(items: ImagingItem[]) {
  return items.filter((item) => item.categories.includes('dental'));
}

function inferDentalKind(
  document: ClinicalDocument<unknown>,
  text: string,
  details?: DentalRecordDetails,
): DentalRecordKind {
  const resourceType = document.data_record.resource_type;
  const normalized = text.toLowerCase();
  const subtype = details?.subtype;

  if (subtype) {
    if (subtype === 'cleaning') return 'cleaning';
    if (subtype === 'treatmentPlan' || subtype === 'orthodonticTreatmentPlan') {
      return 'treatmentPlan';
    }
    if (subtype === 'imaging') return 'image';
    if (
      [
        'oralSurgeryConsult',
        'oralSurgeryProcedure',
        'extraction',
        'implantSurgery',
        'postOpSurgery',
      ].includes(subtype)
    ) {
      return 'surgery';
    }
    if (
      subtype.startsWith('orthodontic') ||
      ['alignerCase', 'cephalometricAnalysis', 'retention'].includes(subtype)
    ) {
      return 'orthodontic';
    }
    if (subtype === 'condition') return 'condition';
    if (subtype === 'procedure') return 'procedure';
    if (subtype === 'finding') return 'finding';
  }

  if (
    resourceType === 'procedure' &&
    CLEANING_TERMS.some((term) => normalized.includes(term))
  ) {
    return 'cleaning';
  }
  if (ORTHODONTIC_TERMS.some((term) => normalized.includes(term))) {
    return 'orthodontic';
  }
  if (SURGERY_TERMS.some((term) => normalized.includes(term))) {
    return 'surgery';
  }
  if (PERIO_TERMS.some((term) => normalized.includes(term))) return 'perio';
  if (REFERRAL_TERMS.some((term) => normalized.includes(term))) {
    return 'referral';
  }
  if (
    normalized.includes('treatment plan') ||
    normalized.includes('planned') ||
    resourceType === 'servicerequest'
  ) {
    return 'treatmentPlan';
  }
  if (resourceType === 'condition') return 'condition';
  if (resourceType === 'procedure') return 'procedure';
  if (resourceType === 'observation') return 'finding';
  if (resourceType === 'documentreference') return 'note';
  return 'finding';
}

function extractToothNumbers(text: string): string[] {
  const teeth = new Set<string>();
  for (const match of text.matchAll(TOOTH_PATTERN)) {
    const tooth = Number(match[1]);
    if (tooth >= 1 && tooth <= 32) {
      teeth.add(`${tooth}`);
    }
  }
  return [...teeth];
}

function extractSurfaces(text: string): ToothSurface[] {
  const surfaces = new Set<ToothSurface>();
  for (const match of text.toUpperCase().matchAll(SURFACE_PATTERN)) {
    for (const surface of match[1].split('')) {
      if (['M', 'O', 'I', 'D', 'B', 'F', 'L'].includes(surface)) {
        surfaces.add(surface as ToothSurface);
      }
    }
  }
  return [...surfaces];
}

function getTitle(document: ClinicalDocument<unknown>) {
  const resource = getResource(document);
  return (
    document.metadata?.display_name ||
    resource?.code?.text ||
    resource?.code?.coding?.[0]?.display ||
    resource?.type?.text ||
    resource?.description ||
    document.data_record.resource_type
  );
}

function getSummary(
  document: ClinicalDocument<unknown>,
  details?: DentalRecordDetails,
) {
  const resource = getResource(document);
  const summary =
    resource?.conclusion ||
    resource?.note?.[0]?.text ||
    resource?.text?.div
      ?.replace(/<[^>]+>/g, ' ')
      ?.replace(/\s+/g, ' ')
      ?.trim();

  if (summary) return summary;

  return [
    details?.dentalStatus && `Status: ${details.dentalStatus}`,
    details?.dentalSeverity && `Severity: ${details.dentalSeverity}`,
    details?.procedureCode && `Code: ${details.procedureCode}`,
    details?.dentalProvider && `Provider: ${details.dentalProvider}`,
    details?.dentalLocation && `Location: ${details.dentalLocation}`,
    details?.dentalFollowUp && `Follow-up: ${details.dentalFollowUp}`,
    details?.dentalRecall && `Recall: ${details.dentalRecall}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

function searchableText(document: ClinicalDocument<unknown>): string {
  const resource = getResource(document);
  return [
    document.metadata?.display_name,
    document.metadata?.loinc_coding?.join(' '),
    document.data_record.resource_type,
    JSON.stringify(resource?.code || ''),
    JSON.stringify(resource?.category || ''),
    JSON.stringify(resource?.bodySite || ''),
    JSON.stringify(resource?.reasonCode || ''),
    JSON.stringify(resource?.note || ''),
    JSON.stringify(resource?.text || ''),
    JSON.stringify(resource?.procedureCode || ''),
    JSON.stringify(resource?.description || ''),
    JSON.stringify(getDentalDetails(document) || ''),
  ]
    .filter(Boolean)
    .join(' ');
}

function getResource(document: ClinicalDocument<unknown>): any {
  const raw = document.data_record.raw as any;
  return raw?.resource || raw || {};
}

function getDentalDetails(
  document: ClinicalDocument<unknown>,
): DentalRecordDetails | undefined {
  const details = document.metadata?.manual_specialty_details as
    | DentalRecordDetails
    | undefined;
  const specialty = document.metadata?.manual_specialty || details?.specialty;

  if (specialty !== 'dental') return details;
  return { ...details, specialty: 'dental' };
}

function getToothNumbers(
  details: DentalRecordDetails | undefined,
  text: string,
): string[] {
  const teeth = new Set<string>();
  addToothList(teeth, details?.toothNumber);
  addToothList(teeth, details?.dentalTeeth);
  addToothRange(teeth, details?.toothRange);

  if (teeth.size === 0) {
    extractToothNumbers(text).forEach((tooth) => teeth.add(tooth));
  }

  return [...teeth].sort((a, b) => Number(a) - Number(b));
}

function getSurfaces(
  details: DentalRecordDetails | undefined,
  text: string,
): ToothSurface[] {
  const surfaces = new Set<ToothSurface>();

  for (const surface of details?.dentalSurfaces || []) {
    if (isToothSurface(surface)) surfaces.add(surface);
  }

  if (surfaces.size === 0) {
    extractSurfaces(text).forEach((surface) => surfaces.add(surface));
  }

  return [...surfaces];
}

function buildDentalToothSurfaceModel(
  details: DentalRecordDetails | undefined,
  text: string,
): DentalToothSurfaceModel {
  const teeth = getToothNumbers(details, text);
  return {
    numberingSystem: details?.numberingSystem || 'universal',
    dentition: details?.dentition,
    teeth,
    surfaces: getSurfaces(details, text),
    quadrant: details?.dentalQuadrant,
    arch: details?.dentalArch,
    status: details?.dentalStatus,
    source:
      details?.sourceSystem || details?.sourceTable || details?.sourceId
        ? {
            system: details.sourceSystem || 'manual',
            table: details.sourceTable,
            id: details.sourceId,
            confidence: details.mappingConfidence || 'medium',
          }
        : undefined,
  };
}

function addToothList(teeth: Set<string>, value?: string) {
  if (!value) return;
  for (const match of value.matchAll(/\b(3[0-2]|[1-2][0-9]|[1-9])\b/g)) {
    teeth.add(`${Number(match[1])}`);
  }
}

function addToothRange(teeth: Set<string>, value?: string) {
  const match = value?.match(
    /\b(3[0-2]|[1-2][0-9]|[1-9])\s*-\s*(3[0-2]|[1-2][0-9]|[1-9])\b/,
  );
  if (!match) return;

  const start = Number(match[1]);
  const end = Number(match[2]);
  const low = Math.min(start, end);
  const high = Math.max(start, end);

  for (let tooth = low; tooth <= high; tooth += 1) {
    teeth.add(`${tooth}`);
  }
}

function isToothSurface(surface: string): surface is ToothSurface {
  return ['M', 'O', 'I', 'D', 'B', 'F', 'L'].includes(surface);
}
