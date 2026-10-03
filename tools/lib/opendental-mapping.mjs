/**
 * Open Dental row → Mere mapping rules that are worth testing on their own.
 *
 * Enum values are from Open Dental's schema documentation (v24.3,
 * https://www.opendental.com/OpenDentalDocumentation24-3.xml):
 *
 * - `procedurelog.ProcStatus` (ProcStat): 1 TP, 2 Complete, 3 Existing Current
 *   Provider, 4 Existing Other Provider, 5 Referred Out, 6 Deleted,
 *   7 Condition, 8 Treatment Plan inactive.
 * - `periomeasure.SequenceType` (PerioSequenceType): 0 Mobility, 1 Furcation,
 *   2 GingMargin (recession), 3 MGJ, 4 Probing, 5 SkipTooth,
 *   6 BleedSupPlaqCalc (flags: bleeding 1, suppuration 2, plaque 4,
 *   calculus 8), 7 CAL (never stored).
 * - Site values: -1 is "not measured"; 100+ encodes a negative gingival
 *   margin (105 → -5). Mobility and skip-tooth use `ToothValue`, not a site.
 */

const PROC_STATUS = {
  1: 'treatment-planned',
  2: 'completed',
  3: 'existing-current',
  4: 'existing-other',
  5: 'referred',
  6: 'deleted',
  7: 'condition',
  8: 'treatment-planned-inactive',
};

export function procedureStatus(value) {
  return PROC_STATUS[Number(value)] || 'unknown';
}

/**
 * What a procedurelog row becomes. `skip` rows are not imported: a deleted
 * procedure was removed by the practice, and an inactive treatment plan item
 * is one the patient is not pursuing.
 *
 * Planned work stays a `Procedure` (FHIR status `preparation`) so the
 * Procedures page shows it with that status, rather than a `ServiceRequest`,
 * which the Referrals page would list as a referral.
 */
export function procedureDisposition(value, { isHygiene = false } = {}) {
  const status = procedureStatus(value);
  switch (status) {
    case 'treatment-planned':
      return {
        status,
        resourceType: 'procedure',
        fhirStatus: 'preparation',
        subtype: 'treatmentPlan',
      };
    case 'completed':
    case 'existing-current':
    case 'existing-other':
      return {
        status,
        resourceType: 'procedure',
        fhirStatus: 'completed',
        subtype: isHygiene ? 'cleaning' : 'procedure',
      };
    case 'referred':
      return {
        status,
        resourceType: 'procedure',
        fhirStatus: 'preparation',
        subtype: 'referral',
      };
    case 'condition':
      return {
        status,
        resourceType: 'condition',
        clinicalStatus: 'active',
        subtype: 'condition',
      };
    case 'deleted':
    case 'treatment-planned-inactive':
      return { status, skip: true };
    default:
      // An unknown status is not evidence the work was done.
      return {
        status,
        resourceType: 'procedure',
        fhirStatus: 'unknown',
        subtype: 'procedure',
      };
  }
}

const SITE_KEYS = [
  ['MBvalue', 'MB'],
  ['Bvalue', 'B'],
  ['DBvalue', 'DB'],
  ['MLvalue', 'ML'],
  ['Lvalue', 'L'],
  ['DLvalue', 'DL'],
];

/** Readable names for each `periomeasure.SequenceType`. */
export const PERIO_SEQUENCE_NAMES = {
  0: 'mobility',
  1: 'furcation',
  2: 'gingival margin',
  3: 'mucogingival junction',
  4: 'probing depth',
  5: 'skip tooth',
  6: 'bleeding/suppuration/plaque/calculus flags',
};

const SEQUENCE = {
  MOBILITY: 0,
  FURCATION: 1,
  GING_MARGIN: 2,
  PROBING: 4,
  BLEED_FLAGS: 6,
};

const FLAG = { bleeding: 1, suppuration: 2, plaque: 4, calculus: 8 };

/** A site value in millimetres, or undefined when it was not measured. */
export function decodeSiteValue(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  if (Number.isNaN(number) || number < 0) return undefined;
  return number >= 100 ? 100 - number : number;
}

function siteValues(measure) {
  return SITE_KEYS.map(([key, site]) => [
    site,
    decodeSiteValue(measure[key]),
  ]).filter(([, value]) => value !== undefined);
}

function byTooth(measures, render) {
  return measures
    .map((measure) => {
      const text = render(measure);
      return text ? `tooth ${measure.IntTooth} ${text}` : undefined;
    })
    .filter(Boolean)
    .join('; ');
}

function flaggedSites(measure, flag) {
  return SITE_KEYS.filter(([key]) => {
    const value = Number(measure[key]);
    return value > 0 && (value & flag) === flag;
  }).map(([, site]) => site);
}

/**
 * Split one exam's periomeasure rows into the fields the dental screens read.
 * Each field only carries the measurement it is named for.
 */
export function summarizePerioMeasures(measures) {
  const ofType = (type) =>
    measures.filter((measure) => Number(measure.SequenceType) === type);
  const sites = (measure) =>
    siteValues(measure)
      .map(([site, value]) => `${site}:${value}`)
      .join('/');
  const flagged = (flag) =>
    byTooth(ofType(SEQUENCE.BLEED_FLAGS), (measure) =>
      flaggedSites(measure, flag).join(', '),
    );

  const probing = ofType(SEQUENCE.PROBING);
  const depths = probing.flatMap((measure) =>
    siteValues(measure).map(([, value]) => value),
  );

  // Teeth worth naming: a pocket of 4 mm or more, or a bleeding or
  // suppurating site. Every tooth is probed, so tagging the exam with all of
  // them marked the whole mouth.
  const concern = new Set([
    ...probing
      .filter((measure) => siteValues(measure).some(([, value]) => value >= 4))
      .map((measure) => `${measure.IntTooth}`),
    ...ofType(SEQUENCE.BLEED_FLAGS)
      .filter(
        (measure) =>
          flaggedSites(measure, FLAG.bleeding).length > 0 ||
          flaggedSites(measure, FLAG.suppuration).length > 0,
      )
      .map((measure) => `${measure.IntTooth}`),
  ]);

  return removeEmpty({
    perioTeethOfConcern: [...concern]
      .sort((a, b) => Number(a) - Number(b))
      .join(', '),
    perioPocketDepths: byTooth(probing, sites),
    perioRecession: byTooth(ofType(SEQUENCE.GING_MARGIN), sites),
    perioFurcation: byTooth(ofType(SEQUENCE.FURCATION), sites),
    perioMobility: byTooth(ofType(SEQUENCE.MOBILITY), (measure) => {
      const value = decodeSiteValue(measure.ToothValue);
      return value === undefined ? '' : `mobility ${value}`;
    }),
    perioBleeding: flagged(FLAG.bleeding),
    perioSuppuration: flagged(FLAG.suppuration),
    perioPlaque: flagged(FLAG.plaque),
    perioCalculus: flagged(FLAG.calculus),
    perioDeepestPocket: depths.length ? `${Math.max(...depths)}` : undefined,
    perioSitesProbed: depths.length ? `${depths.length}` : undefined,
    perioSitesFourPlus: depths.length
      ? `${depths.filter((depth) => depth >= 4).length}`
      : undefined,
  });
}

/** Which patients a build includes; refuses to take a whole practice silently. */
export function selectPatients(patients, { patientIds = [], all = false }) {
  if (patientIds.length > 0) {
    const wanted = new Set(patientIds.map(String));
    const selected = patients.filter((patient) =>
      wanted.has(String(patient.PatNum)),
    );
    const missing = [...wanted].filter(
      (id) => !selected.some((patient) => String(patient.PatNum) === id),
    );
    if (missing.length) {
      throw new Error(`No patient row for PatNum ${missing.join(', ')}`);
    }
    return selected;
  }
  if (all || patients.length <= 1) return patients;
  throw new Error(
    `The source has ${patients.length} patients. A personal record holds one ` +
      'person: pass --patient <PatNum> (repeatable), or --all-patients to ' +
      'build a multi-profile package on purpose.',
  );
}

function removeEmpty(object) {
  return Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== undefined && value !== '',
    ),
  );
}
