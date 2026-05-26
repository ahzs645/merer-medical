import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ImagingItem } from '../../imaging/types';
import { DentalRecord, DentalRecordKind, ToothSurface } from '../types';

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
  const text = searchableText(document).toLowerCase();
  return DENTAL_TERMS.some((term) => text.includes(term));
}

export function mapDentalDocument(
  document: ClinicalDocument<unknown>,
): DentalRecord {
  const text = searchableText(document);
  return {
    id: document.id,
    document,
    kind: inferDentalKind(document, text),
    title: getTitle(document),
    date: document.metadata?.date,
    toothNumbers: extractToothNumbers(text),
    surfaces: extractSurfaces(text),
    summary: getSummary(document),
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
    images: imaging.length,
  };
}

export function filterDentalImaging(items: ImagingItem[]) {
  return items.filter((item) => item.categories.includes('dental'));
}

function inferDentalKind(
  document: ClinicalDocument<unknown>,
  text: string,
): DentalRecordKind {
  const resourceType = document.data_record.resource_type;
  const normalized = text.toLowerCase();

  if (
    resourceType === 'procedure' &&
    CLEANING_TERMS.some((term) => normalized.includes(term))
  ) {
    return 'cleaning';
  }
  if (ORTHODONTIC_TERMS.some((term) => normalized.includes(term))) {
    return 'orthodontic';
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

function getSummary(document: ClinicalDocument<unknown>) {
  const resource = getResource(document);
  return (
    resource?.conclusion ||
    resource?.note?.[0]?.text ||
    resource?.text?.div
      ?.replace(/<[^>]+>/g, ' ')
      ?.replace(/\s+/g, ' ')
      ?.trim()
  );
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
  ]
    .filter(Boolean)
    .join(' ');
}

function getResource(document: ClinicalDocument<unknown>): any {
  const raw = document.data_record.raw as any;
  return raw?.resource || raw || {};
}
