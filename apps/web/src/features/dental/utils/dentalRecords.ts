import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ImagingItem } from '../../imaging/types';
import {
  DentalNumberingSystem,
  DentalRecord,
  DentalRecordDetails,
  DentalRecordKind,
  DentalRecordStatus,
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
  'dental',
  'dentition',
  'endodontic',
  'gingiva',
  'gingival',
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
//
// A number is one or two digits and must not run on into another digit:
// without that, "tooth 36" (FDI, lower left first molar) was read as tooth 3
// and "#2024-118" as tooth 20. Which system a number is in is decided in
// `resolveToothNumber`, not here.
const TOOTH_NUMBER = '\\d{1,2}(?!\\d)';
const TOOTH_MARKER_PATTERN = new RegExp(
  `(?:#|\\b(?:tooth|teeth)(?:\\s*(?:no\\.?|number))?)\\s*[:#]?\\s*(${TOOTH_NUMBER}(?:\\s*(?:,|and|&|-|–|to)\\s*${TOOTH_NUMBER})*)`,
  'gi',
);

/** FHIR code systems whose codes are FDI tooth numbers. */
const FDI_TOOTH_SYSTEMS = [
  'http://terminology.hl7.org/codesystem/ex-tooth',
  'https://www.fdiworlddental.org',
];
const SURFACE_SYSTEMS = [
  'http://terminology.hl7.org/codesystem/fdi-surface',
  'http://terminology.hl7.org/codesystem/ex-surface',
];

// Words that are dental only in company: "implant" is also a pacemaker,
// cochlear or contraceptive implant, and "crown" the crown-rump length of an
// obstetric ultrasound. They count only alongside a tooth number or another
// dental word.
const SUPPORTING_TERMS = ['crown', 'implant', 'filling', 'abutment', 'veneer'];
const supportingTermMatchers = SUPPORTING_TERMS.map(
  (term) => new RegExp(`\\b${term}\\b(?!-rump)`, 'i'),
);

const dentalTermMatchers = DENTAL_TERMS.map(
  (term) =>
    new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
);

function matchesDentalTerm(text: string): boolean {
  if (dentalTermMatchers.some((matcher) => matcher.test(text))) return true;
  return (
    supportingTermMatchers.some((matcher) => matcher.test(text)) &&
    extractToothNumbers(text).length > 0
  );
}

export function isDentalDocument(document: ClinicalDocument<unknown>): boolean {
  const details = getDentalDetails(document);
  if (details?.specialty === 'dental') return true;

  return matchesDentalTerm(searchableText(document));
}

export type DentalMappingOptions = {
  /**
   * How to read a bare tooth number from 11 to 32, which is a valid tooth in
   * both systems. Records that declare their own `numberingSystem`, and
   * numbers that only exist in one system (33–48, 51–85), ignore it.
   */
  numbering?: DentalNumberingSystem;
  /** Why `numbering` is what it is, shown beside the teeth. */
  numberingBasis?: 'source' | 'reader';
};

/**
 * The tooth numbers a record writes in prose, as written — before deciding
 * which system they are in. Records that code their teeth or declare their
 * numbering have nothing to infer, so they give none.
 */
export function freeTextToothTokens(
  document: ClinicalDocument<unknown>,
): string[] {
  const details = getDentalDetails(document);
  if (details?.numberingSystem || getCodedTeeth(document).length > 0) return [];
  const tokens: string[] = [];
  for (const match of searchableText(document).matchAll(TOOTH_MARKER_PATTERN)) {
    tokens.push(...(match[1].match(/\d{1,2}/g) || []));
  }
  return tokens;
}

/**
 * Which system a source writes teeth in, judged from the numbers it uses.
 * Many numbers exist in only one system: 1–10 and 19, 20, 29, 30 are teeth
 * only in Universal; 33–48 and 51–85 only in FDI. A source whose records use
 * only one kind tells you how to read its ambiguous 11–32 too. A source with
 * both, or neither, decides nothing.
 */
export function inferSourceNumbering(
  tokens: string[],
): DentalNumberingSystem | undefined {
  let universal = 0;
  let fdi = 0;
  for (const token of tokens) {
    const number = Number(token);
    if (!Number.isInteger(number) || number < 1) continue;
    const isFdiTooth = isFdi(`${number}`);
    const isUniversalTooth = number <= 32;
    if (isUniversalTooth && !isFdiTooth) universal += 1;
    else if (isFdiTooth && !isUniversalTooth) fdi += 1;
  }
  if (fdi > 0 && universal === 0) return 'fdi';
  if (universal > 0 && fdi === 0) return 'universal';
  return undefined;
}

export function mapDentalDocument(
  document: ClinicalDocument<unknown>,
  options: DentalMappingOptions = {},
): DentalRecord {
  const text = searchableText(document);
  const details = getDentalDetails(document);
  const declared =
    details?.numberingSystem === 'fdi' ||
    details?.numberingSystem === 'universal'
      ? details.numberingSystem
      : undefined;
  const numbering = declared || options.numbering;
  const kind = inferDentalKind(document, text, details);
  const toothNumbers = getToothNumbers(document, details, text, numbering);
  const surfaces = getSurfaces(document, details, text);
  return {
    id: document.id,
    document,
    kind,
    status: inferRecordStatus(document, kind, details),
    title: getTitle(document),
    date: document.metadata?.date,
    toothNumbers,
    surfaces,
    summary: getSummary(document, details),
    details,
    dentalModel: buildDentalToothSurfaceModel(details, toothNumbers, surfaces),
    numbering: {
      system: numbering === 'fdi' ? 'fdi' : 'universal',
      basis: declared ? 'record' : options.numberingBasis || 'reader',
    },
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
// so they may not pass `isDentalDocument`. They used to qualify by resource
// type alone, which listed a medical "Extended Health" plan and a cancelled
// medical plan under "Claims and EOBs" on the dental page. Now a coverage,
// claim or EOB counts when something in it says dental: its type, class,
// payor or insurer, a dental procedure code (CDT D-codes, Canadian USC&LS
// five-digit codes), or manual claim metadata.
const DENTAL_COVERAGE_PATTERN =
  /\bdental\b|\bdentist|\bcdcp\b|canadian dental care plan|\bodontolog|\bortho(?:dontic)?\b|"code":"D\d{4}"/i;

export function isDentalClaimDocument(
  document: ClinicalDocument<unknown>,
): boolean {
  const details = getDentalDetails(document);
  if (
    details?.specialty === 'dental' &&
    (!!details?.claimStatus ||
      !!details?.carrierName ||
      !!details?.eobAttachment)
  ) {
    return true;
  }
  if (!isClaimResourceType(document.data_record.resource_type)) return false;
  const resource = getResource(document);
  const text = [
    document.metadata?.display_name,
    JSON.stringify(resource?.type || ''),
    JSON.stringify(resource?.class || ''),
    JSON.stringify(resource?.payor || ''),
    JSON.stringify(resource?.insurer || ''),
    JSON.stringify(resource?.item || ''),
    JSON.stringify(resource?.subType || ''),
  ].join(' ');
  return DENTAL_COVERAGE_PATTERN.test(text);
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

const IMAGING_TERMS = [
  'bitewing',
  'cbct',
  'cephalometric radiograph',
  'cone beam',
  'intraoral photo',
  'intraoral scan',
  'panoramic',
  'periapical',
  'photograph',
  'radiograph',
  'x-ray',
  'xray',
];

const SUBTYPE_KINDS: Record<string, DentalRecordKind> = {
  cleaning: 'cleaning',
  treatmentPlan: 'treatmentPlan',
  orthodonticTreatmentPlan: 'treatmentPlan',
  imaging: 'image',
  perio: 'perio',
  referral: 'referral',
  // A recall is a due date. It is read by the Recall panel through its
  // `recallDueDate`; as a record it is neither a visit nor an open issue.
  recall: 'note',
  oralSurgeryConsult: 'surgery',
  oralSurgeryProcedure: 'surgery',
  extraction: 'surgery',
  implantSurgery: 'surgery',
  postOpSurgery: 'surgery',
  alignerCase: 'orthodontic',
  cephalometricAnalysis: 'orthodontic',
  retention: 'orthodontic',
  condition: 'condition',
  procedure: 'procedure',
  finding: 'finding',
};

/**
 * What a record is. The resource type decides first, and keywords only
 * choose within it: matching keywords across every type in a fixed order made
 * a treatment-plan PDF that mentions "bleeding" a perio measurement, a CBCT
 * study an "active finding", and a completed crown prep whose note said
 * "delivery planned" a proposed treatment.
 */
function inferDentalKind(
  document: ClinicalDocument<unknown>,
  text: string,
  details?: DentalRecordDetails,
): DentalRecordKind {
  const resourceType = document.data_record.resource_type;
  const normalized = text.toLowerCase();
  const has = (terms: string[]) =>
    terms.some((term) => normalized.includes(term));
  const subtype = details?.subtype;

  if (subtype) {
    // A procedure entered or exported as planned is planned treatment.
    if (
      subtype === 'procedure' &&
      getResource(document)?.status === 'preparation'
    ) {
      return 'treatmentPlan';
    }
    if (SUBTYPE_KINDS[subtype]) return SUBTYPE_KINDS[subtype];
    if (subtype.startsWith('orthodontic')) return 'orthodontic';
  }

  switch (resourceType) {
    case 'imagingstudy':
    case 'media':
      return 'image';
    case 'diagnosticreport':
      return has(IMAGING_TERMS) ? 'image' : 'finding';
    case 'documentreference':
    case 'documentreference_attachment':
      if (hasImageAttachment(document)) return 'image';
      if (has(ORTHODONTIC_TERMS)) return 'orthodontic';
      return 'note';
    case 'condition':
      return has(ORTHODONTIC_TERMS) ? 'orthodontic' : 'condition';
    case 'observation':
      if (has(ORTHODONTIC_TERMS)) return 'orthodontic';
      return has(PERIO_TERMS) ? 'perio' : 'finding';
    case 'procedure': {
      if (getResource(document)?.status === 'preparation') {
        return 'treatmentPlan';
      }
      if (has(ORTHODONTIC_TERMS)) return 'orthodontic';
      if (has(SURGERY_TERMS)) return 'surgery';
      if (has(CLEANING_TERMS)) return 'cleaning';
      return 'procedure';
    }
    case 'servicerequest':
      if (has(SURGERY_TERMS)) return 'surgery';
      if (has(REFERRAL_TERMS)) return 'referral';
      return 'treatmentPlan';
    case 'careplan':
      return has(ORTHODONTIC_TERMS) ? 'orthodontic' : 'treatmentPlan';
    case 'encounter':
      if (has(ORTHODONTIC_TERMS)) return 'orthodontic';
      if (has(CLEANING_TERMS)) return 'cleaning';
      return 'note';
    default:
      return 'note';
  }
}

function hasImageAttachment(document: ClinicalDocument<unknown>): boolean {
  const resource = getResource(document);
  const attachments = [
    ...(Array.isArray(resource?.content)
      ? resource.content.map((content: any) => content?.attachment)
      : []),
    resource?.attachment,
  ].filter(Boolean);
  return attachments.some(
    (attachment: any) =>
      /^(image|model)\//i.test(attachment?.contentType || '') ||
      /\.(stl|ply|obj|jpe?g|png|dcm)(?:$|[?#])/i.test(
        `${attachment?.title || ''} ${attachment?.url || ''}`,
      ),
  );
}

const codeOf = (value: any): string | undefined =>
  (value?.coding?.[0]?.code || value?.text || value)?.toString().toLowerCase();

/**
 * Where a record stands. A status somebody typed or a practice system
 * exported (`dentalStatus`, `treatmentStatus`) is read first, because the
 * manual form writes a fixed FHIR status whatever was typed; then the FHIR
 * status; then the kind's usual meaning.
 */
function inferRecordStatus(
  document: ClinicalDocument<unknown>,
  kind: DentalRecordKind,
  details?: DentalRecordDetails,
): DentalRecordStatus {
  const stated = [details?.dentalStatus, details?.treatmentStatus]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (stated) {
    if (/entered.in.error|cancel|declin|revoked|deleted|abandon/.test(stated))
      return 'cancelled';
    if (/resolv|healed|inactive|remission|no longer/.test(stated))
      return 'resolved';
    if (
      /\b(complete|completed|done|existing|performed|delivered)\b/.test(stated)
    )
      return 'done';
    if (/plan|propos|scheduled|accepted|booked|referred|pending/.test(stated))
      return 'planned';
    if (/\bactive\b|ongoing|present|open/.test(stated)) {
      return kind === 'treatmentPlan' ? 'planned' : 'open';
    }
  }

  const resource = getResource(document);
  const resourceType = document.data_record.resource_type;
  if (codeOf(resource?.verificationStatus)?.match(/entered-in-error|refuted/)) {
    return 'cancelled';
  }
  const status = codeOf(resource?.status);
  switch (resourceType) {
    case 'condition': {
      const clinical = codeOf(resource?.clinicalStatus);
      if (clinical?.match(/resolved|inactive|remission/)) return 'resolved';
      if (clinical?.match(/active|recurrence|relapse/)) return 'open';
      break;
    }
    case 'procedure':
      if (status === 'completed') return 'done';
      if (status?.match(/preparation|in-progress|on-hold/)) return 'planned';
      if (status?.match(/not-done|stopped|entered-in-error/))
        return 'cancelled';
      break;
    case 'servicerequest':
    case 'careplan':
      if (status === 'completed') return 'done';
      if (status?.match(/revoked|entered-in-error/)) return 'cancelled';
      if (status?.match(/active|draft|on-hold/)) {
        return kind === 'referral' ? 'open' : 'planned';
      }
      break;
    case 'observation':
    case 'diagnosticreport':
      if (status?.match(/cancelled|entered-in-error/)) return 'cancelled';
      break;
  }

  switch (kind) {
    case 'condition':
    case 'finding':
    case 'perio':
    case 'referral':
      return 'open';
    case 'treatmentPlan':
      return 'planned';
    case 'procedure':
    case 'cleaning':
    case 'surgery':
      return 'done';
    default:
      return 'unknown';
  }
}

function extractToothNumbers(
  text: string,
  numbering?: DentalRecordDetails['numberingSystem'],
): string[] {
  const teeth = new Set<string>();
  for (const match of text.matchAll(TOOTH_MARKER_PATTERN)) {
    addToothRun(teeth, match[1], numbering);
  }
  return [...teeth];
}

// Parse the number run that follows a tooth marker, e.g. "4, 18" or "1-4".
function addToothRun(
  teeth: Set<string>,
  run: string,
  numbering?: DentalRecordDetails['numberingSystem'],
) {
  for (const part of run.split(/\s*(?:,|and|&)\s*/i)) {
    const range = part.match(/(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})/i);
    if (range) {
      addResolvedRange(teeth, range[1], range[2], numbering);
      continue;
    }
    const single = part.match(/\b(\d{1,2})\b/);
    const tooth = single && resolveToothNumber(single[1], numbering);
    if (tooth) teeth.add(tooth);
  }
}

const isFdi = (value: string) => ALL_TEETH.some((tooth) => tooth.fdi === value);

/**
 * One tooth number → its Universal identifier, or undefined if it names no
 * tooth. A number that exists only in FDI (33–48, 51–85) is FDI whatever the
 * record says; 1–10 exist only in Universal; 11–32 are both, and follow the
 * record's numbering (Universal unless told otherwise).
 */
export function resolveToothNumber(
  value: string,
  numbering?: DentalRecordDetails['numberingSystem'],
): string | undefined {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return undefined;
  const text = `${number}`;
  const fdi = ALL_TEETH.find((tooth) => tooth.fdi === text);
  if (fdi && (number > 32 || numbering === 'fdi')) return fdi.universal;
  if (number <= 32) return text;
  return undefined;
}

function addResolvedRange(
  teeth: Set<string>,
  startValue: string,
  endValue: string,
  numbering?: DentalRecordDetails['numberingSystem'],
) {
  const start = Number(startValue);
  const end = Number(endValue);
  const fdiRange =
    isFdi(`${start}`) &&
    isFdi(`${end}`) &&
    Math.floor(start / 10) === Math.floor(end / 10) &&
    (numbering === 'fdi' || start > 32 || end > 32);
  if (fdiRange) {
    // FDI ranges stay within one quadrant: "34-36" is 34, 35, 36.
    for (let n = Math.min(start, end); n <= Math.max(start, end); n += 1) {
      const tooth = resolveToothNumber(`${n}`, 'fdi');
      if (tooth) teeth.add(tooth);
    }
    return;
  }
  if (start <= 32 && end <= 32) addToothRange(teeth, `${start}-${end}`);
}

type Coding = { system?: string; code?: string; display?: string };

function bodySiteCodings(document: ClinicalDocument<unknown>): Coding[] {
  const resource = getResource(document);
  const sites = [
    ...(Array.isArray(resource?.bodySite)
      ? resource.bodySite
      : resource?.bodySite
        ? [resource.bodySite]
        : []),
    // Claim / EOB lines carry teeth on `item[].bodySite` (R4) too.
    ...(Array.isArray(resource?.item)
      ? resource.item.map((item: any) => item?.bodySite).filter(Boolean)
      : []),
  ];
  return sites.flatMap((site: any) =>
    Array.isArray(site?.coding) ? site.coding : [],
  );
}

const systemIn = (coding: Coding, systems: string[]) =>
  !!coding.system && systems.includes(coding.system.toLowerCase());

/** Teeth stated as codes, which outrank anything read from prose. */
function getCodedTeeth(document: ClinicalDocument<unknown>): string[] {
  const teeth = new Set<string>();
  for (const coding of bodySiteCodings(document)) {
    if (!systemIn(coding, FDI_TOOTH_SYSTEMS) || !coding.code) continue;
    const tooth = ALL_TEETH.find((item) => item.fdi === `${coding.code}`);
    if (tooth) teeth.add(tooth.universal);
  }
  return [...teeth];
}

function getCodedSurfaces(document: ClinicalDocument<unknown>): ToothSurface[] {
  const surfaces = new Set<ToothSurface>();
  for (const coding of bodySiteCodings(document)) {
    if (!systemIn(coding, SURFACE_SYSTEMS) || !coding.code) continue;
    for (const surface of coding.code.toUpperCase().split('')) {
      if (isToothSurface(surface)) surfaces.add(surface);
    }
  }
  return [...surfaces];
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
  document: ClinicalDocument<unknown>,
  details: DentalRecordDetails | undefined,
  text: string,
  numbering?: DentalRecordDetails['numberingSystem'],
): string[] {
  const teeth = new Set<string>(getCodedTeeth(document));

  if (teeth.size === 0) {
    addToothList(teeth, details?.toothNumber, numbering);
    addToothList(teeth, details?.dentalTeeth, numbering);
    const range = details?.toothRange?.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
    if (range) addResolvedRange(teeth, range[1], range[2], numbering);
  }

  if (teeth.size === 0) {
    extractToothNumbers(text, numbering).forEach((tooth) => teeth.add(tooth));
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

  // In Universal records (Open Dental among them) 51–82 are supernumerary
  // teeth — tooth number plus 50 — not FDI primary teeth. There is no place
  // for them on the chart, so they are left off rather than drawn as a
  // baby tooth.
  if (numberingSystem === 'universal' && /^\d+$/.test(normalized)) {
    const number = Number(normalized);
    if (number >= 51 && number <= 82) return undefined;
  }

  const byNotation = findToothByNotation(value);
  if (byNotation) return byNotation.universal;

  // Fall back to a number embedded in a noisier token (e.g. "#14" or
  // "14MOD"), read by the same rules as free text.
  if (numberingSystem !== 'palmer') {
    const numeric = normalized.match(/(?<!\d)\d{1,2}(?!\d)/);
    if (numeric) return resolveToothNumber(numeric[0], numberingSystem);
  }

  return undefined;
}

// Universal teeth are numbered 1-32 (permanent) and lettered A-T (deciduous).
// Sort numeric identifiers first, then letters, so mixed dentition stays stable.
export function compareTeeth(a: string, b: string): number {
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
  document: ClinicalDocument<unknown>,
  details: DentalRecordDetails | undefined,
  text: string,
): ToothSurface[] {
  const surfaces = new Set<ToothSurface>(getCodedSurfaces(document));
  if (surfaces.size > 0) return [...surfaces];

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
  teeth: string[],
  surfaces: ToothSurface[],
): DentalToothSurfaceModel {
  return {
    numberingSystem: details?.numberingSystem || 'universal',
    dentition: details?.dentition,
    teeth,
    surfaces,
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
