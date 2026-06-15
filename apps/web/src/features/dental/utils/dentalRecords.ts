import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ImagingItem } from '../../imaging/types';
import {
  DentalRecord,
  DentalRecordDetails,
  DentalRecordKind,
  DentalToothSurfaceModel,
  ToothSurface,
} from '../types';
import { ALL_TEETH, findToothByNotation } from './dentalReferenceData';

export const DENTAL_CLAIM_RESOURCE_TYPES = [
  'coverage',
  'explanationofbenefit',
  'claim',
  'claimresponse',
] as const;

// Terms used to recognise a document as dental. These are matched on word
// boundaries (see `matchesDentalTerm`), so deliberately generic words that
// collide with other specialties (e.g. "oral", "hygiene" — which match
// optometry notes like "lid hygiene") are intentionally excluded. Prefer
// dental-specific phrasing such as "oral surgery" over bare "oral".
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
  'gingival',
  'implant',
  'intraoral',
  'aligner',
  'braces',
  'cephalometric',
  'malocclusion',
  'mandible',
  'maxilla',
  'odontogram',
  'oral surgery',
  'panoramic',
  'periapical',
  'periodontal',
  'periodontitis',
  'pulp',
  'root canal',
  'orthodontic',
  'orthodontist',
  'retainer',
  'overbite',
  'overjet',
  'crossbite',
  'scaling',
  'prophylaxis',
  'fluoride varnish',
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

// Multi-letter surface notations (MOD, MO, DO, …) are unambiguous and can be
// extracted from free text anywhere. Single-letter surfaces (M, O, I, …) are
// only trusted when the surrounding text is clearly about tooth surfaces,
// otherwise notes like "Class I malocclusion" produce a phantom "I" surface.
const SURFACE_COMBO_PATTERN = /\b(MOD|MOB|MOL|MID|MO|DO)\b/g;
const SINGLE_SURFACE_PATTERN = /\b([MOIDBFL])\b/g;
const SURFACE_CONTEXT_PATTERN =
  /\b(surfaces?|tooth|teeth|restoration|filling|amalgam|composite|caries|cavity)\b/i;

// A tooth number is only extracted from free text when it is preceded by an
// explicit marker ("tooth", "teeth", "#", "no.", "number"). Without this the
// extractor treats every number 1-32 as a tooth, so aligner tray counts
// ("trays 1 to 24") and cephalometric values ("ANB 4") become phantom teeth.
// The captured group also allows comma / "and" / range lists so that
// "Teeth 4, 18" and "tooth 1-4" resolve to all referenced teeth.
const TOOTH_NUMBER = '(?:3[0-2]|[12][0-9]|[1-9])';
const TOOTH_MARKER_PATTERN = new RegExp(
  `(?:#|\\b(?:tooth|teeth)(?:\\s*(?:no\\.?|number))?)\\s*[:#]?\\s*(${TOOTH_NUMBER}(?:\\s*(?:,|and|&|-|–|to)\\s*${TOOTH_NUMBER})*)`,
  'gi',
);

const dentalTermMatchers = DENTAL_TERMS.map(
  (term) =>
    new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
);

function matchesDentalTerm(text: string): boolean {
  return dentalTermMatchers.some((matcher) => matcher.test(text));
}

export function isDentalDocument(document: ClinicalDocument<unknown>): boolean {
  const details = getDentalDetails(document);
  if (details?.specialty === 'dental') return true;

  return matchesDentalTerm(searchableText(document));
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

export function isClaimResourceType(resourceType: string): boolean {
  return (DENTAL_CLAIM_RESOURCE_TYPES as readonly string[]).includes(
    resourceType,
  );
}

// Coverage / claim / EOB documents do not always carry dental-specific terms,
// so they may not pass `isDentalDocument`. Recognise them by resource type (or
// manual claim metadata) so the dental claims panel can surface them.
export function isDentalClaimDocument(
  document: ClinicalDocument<unknown>,
): boolean {
  if (isClaimResourceType(document.data_record.resource_type)) return true;
  const details = getDentalDetails(document);
  return (
    !!details?.claimStatus ||
    !!details?.carrierName ||
    !!details?.eobAttachment
  );
}

// Pull claim/coverage fields from manual specialty details first, then fall
// back to the underlying FHIR Coverage / ExplanationOfBenefit resource.
export function extractClaimFields(document: ClinicalDocument<unknown>) {
  const details = getDentalDetails(document);
  const resource = getResource(document);
  const planClass =
    resource?.class?.find?.(
      (entry: any) => entry?.type?.coding?.[0]?.code === 'plan',
    ) || resource?.class?.[0];

  return {
    status: details?.claimStatus || resource?.status,
    carrier:
      details?.carrierName ||
      resource?.insurer?.display ||
      resource?.payor?.[0]?.display,
    plan: details?.planName || planClass?.name || planClass?.value,
    subscriberId: details?.subscriberId || resource?.subscriberId,
    annualMaximum: details?.annualMaximum,
    deductible: details?.deductible,
    patientPortion: details?.patientPortion,
    eobAttachment: details?.eobAttachment,
  };
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
  for (const match of text.matchAll(TOOTH_MARKER_PATTERN)) {
    addToothRun(teeth, match[1]);
  }
  return [...teeth];
}

// Parse the number run that follows a tooth marker, e.g. "4, 18" or "1-4".
function addToothRun(teeth: Set<string>, run: string) {
  for (const part of run.split(/\s*(?:,|and|&)\s*/i)) {
    const range = part.match(
      /(3[0-2]|[12][0-9]|[1-9])\s*(?:-|–|to)\s*(3[0-2]|[12][0-9]|[1-9])/i,
    );
    if (range) {
      addToothRange(teeth, `${range[1]}-${range[2]}`);
      continue;
    }
    const single = part.match(/\b(3[0-2]|[12][0-9]|[1-9])\b/);
    if (single) teeth.add(`${Number(single[1])}`);
  }
}

function extractSurfaces(text: string): ToothSurface[] {
  const surfaces = new Set<ToothSurface>();
  const upper = text.toUpperCase();

  for (const match of upper.matchAll(SURFACE_COMBO_PATTERN)) {
    for (const surface of match[1].split('')) {
      if (isToothSurface(surface)) surfaces.add(surface);
    }
  }

  if (SURFACE_CONTEXT_PATTERN.test(text)) {
    for (const match of upper.matchAll(SINGLE_SURFACE_PATTERN)) {
      if (isToothSurface(match[1])) surfaces.add(match[1]);
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
  const numberingSystem = details?.numberingSystem;
  const teeth = new Set<string>();
  addToothList(teeth, details?.toothNumber, numberingSystem);
  addToothList(teeth, details?.dentalTeeth, numberingSystem);
  addToothRange(teeth, details?.toothRange);

  if (teeth.size === 0) {
    extractToothNumbers(text).forEach((tooth) => teeth.add(tooth));
  }

  return [...teeth].sort(compareTeeth);
}

// Records may number teeth with Universal, FDI, or Palmer notation. Normalize
// each token to its Universal identifier so the chart, timeline, and grouping
// logic all key off a single system. When the record declares its numbering
// system we resolve against that field first to avoid collisions (e.g. FDI 11
// must not be read as Universal 11).
function normalizeTooth(
  token: string,
  numberingSystem?: DentalRecordDetails['numberingSystem'],
): string | undefined {
  const value = token.trim();
  if (!value) return undefined;
  const normalized = value.toUpperCase();

  if (numberingSystem === 'fdi') {
    const byFdi = ALL_TEETH.find((tooth) => tooth.fdi === normalized);
    if (byFdi) return byFdi.universal;
  }
  if (numberingSystem === 'palmer') {
    const byPalmer = ALL_TEETH.find(
      (tooth) => tooth.palmer.toUpperCase() === normalized,
    );
    if (byPalmer) return byPalmer.universal;
  }

  const byUniversal = ALL_TEETH.find(
    (tooth) => tooth.universal.toUpperCase() === normalized,
  );
  if (byUniversal) return byUniversal.universal;

  const byNotation = findToothByNotation(value);
  if (byNotation) return byNotation.universal;

  // Fall back to a bare Universal number embedded in a noisier token (e.g.
  // "#14" or "14MOD") to preserve the previous regex-based extraction.
  if (numberingSystem !== 'fdi' && numberingSystem !== 'palmer') {
    const numeric = normalized.match(/(?:3[0-2]|[12][0-9]|[1-9])/);
    if (numeric) {
      const universal = `${Number(numeric[0])}`;
      if (ALL_TEETH.some((tooth) => tooth.universal === universal)) {
        return universal;
      }
    }
  }

  return undefined;
}

// Universal teeth are numbered 1-32 (permanent) and lettered A-T (deciduous).
// Sort numeric identifiers first, then letters, so mixed dentition stays stable.
function compareTeeth(a: string, b: string): number {
  const numericA = Number(a);
  const numericB = Number(b);
  const aIsNumber = !Number.isNaN(numericA);
  const bIsNumber = !Number.isNaN(numericB);
  if (aIsNumber && bIsNumber) return numericA - numericB;
  if (aIsNumber) return -1;
  if (bIsNumber) return 1;
  return a.localeCompare(b);
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

function addToothList(
  teeth: Set<string>,
  value?: string,
  numberingSystem?: DentalRecordDetails['numberingSystem'],
) {
  if (!value) return;
  for (const token of value.split(/[\s,&]+/)) {
    const normalized = normalizeTooth(token, numberingSystem);
    if (normalized) teeth.add(normalized);
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
