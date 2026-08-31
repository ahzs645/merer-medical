import {
  LabReferenceBand,
  LabReferenceDefinition,
  LabReferenceStandard,
  ReferenceContext,
  ReferenceKind,
  ReferenceSex,
  ReferenceStandardId,
  SelectedReferenceBand,
} from './types';
import australianHematologyDefinitions from './referenceStandards/australian/hematology.json';
import australianMetadata from './referenceStandards/australian/index.json';
import australianChemistryDefinitions from './referenceStandards/australian/chemistry.json';
import canadianHematologyDefinitions from './referenceStandards/canadian/hematology.json';
import canadianMetadata from './referenceStandards/canadian/index.json';
import canadianLipidDefinitions from './referenceStandards/canadian/lipids.json';
import ukChemistryDefinitions from './referenceStandards/uk/chemistry.json';
import ukMetadata from './referenceStandards/uk/index.json';
import ukHematologyDefinitions from './referenceStandards/uk/hematology.json';

import { unitsAreReconcilable } from './labUnitConversions';

const YEAR_IN_DAYS = 365.2425;

type RawLabReferenceBand = Omit<
  LabReferenceBand,
  'kind' | 'sex' | 'ageMinDays' | 'ageMaxDays'
> & {
  kind: ReferenceKind;
  sex?: ReferenceSex;
  ageMinDays?: number;
  ageMaxDays?: number;
  ageMinWeeks?: number;
  ageMaxWeeks?: number;
  ageMinYears?: number;
  ageMaxYears?: number;
};

type RawLabReferenceDefinition = Omit<LabReferenceDefinition, 'bands'> & {
  bands: RawLabReferenceBand[];
};

type RawLabReferenceStandard = Omit<LabReferenceStandard, 'definitions'> & {
  definitions: RawLabReferenceDefinition[];
};

const rawReferenceStandards = [
  {
    ...canadianMetadata,
    definitions: [
      ...canadianHematologyDefinitions,
      ...canadianLipidDefinitions,
    ],
  },
  {
    ...australianMetadata,
    definitions: [
      ...australianHematologyDefinitions,
      ...australianChemistryDefinitions,
    ],
  },
  {
    ...ukMetadata,
    definitions: [...ukHematologyDefinitions, ...ukChemistryDefinitions],
  },
] as unknown as RawLabReferenceStandard[];

export const labReferenceStandards: LabReferenceStandard[] =
  rawReferenceStandards.map(normalizeReferenceStandard);

function normalizeReferenceStandard(
  standard: RawLabReferenceStandard,
): LabReferenceStandard {
  return {
    ...standard,
    definitions: standard.definitions.map((definition) => ({
      ...definition,
      bands: definition.bands.map(
        ({
          ageMinDays,
          ageMaxDays,
          ageMinWeeks,
          ageMaxWeeks,
          ageMinYears,
          ageMaxYears,
          ...band
        }) => ({
          ...band,
          ageMinDays: normalizeAgeToDays({
            days: ageMinDays,
            weeks: ageMinWeeks,
            years: ageMinYears,
          }),
          ageMaxDays: normalizeAgeToDays({
            days: ageMaxDays,
            weeks: ageMaxWeeks,
            years: ageMaxYears,
          }),
        }),
      ),
    })),
  };
}

function normalizeAgeToDays({
  days,
  weeks,
  years,
}: {
  days?: number;
  weeks?: number;
  years?: number;
}) {
  if (days !== undefined) return days;
  if (weeks !== undefined) return weeks * 7;
  if (years !== undefined) return years * YEAR_IN_DAYS;
  return undefined;
}

const standardById = new Map(
  labReferenceStandards.map((standard) => [standard.id, standard]),
);

const definitionsByStandard = new Map(
  labReferenceStandards.map((standard) => {
    const definitions = new Map<
      string,
      LabReferenceStandard['definitions'][number]
    >();
    standard.definitions.forEach((definition) => {
      definition.testIds.forEach((testId) =>
        definitions.set(testId, definition),
      );
    });
    return [standard.id, definitions];
  }),
);

export const loincLabAliases: Record<string, string> = {
  '704-7': 'basophils-abs',
  '706-2': 'basophils-pct',
  '711-2': 'eosinophils-abs',
  '718-7': 'hemoglobin',
  '731-0': 'lymphocytes-abs',
  '736-9': 'lymphocytes-pct',
  '742-7': 'monocytes-abs',
  '777-3': 'platelets',
  '785-6': 'mch',
  '786-4': 'mchc',
  '789-8': 'rbc',
  '4544-3': 'hematocrit',
  '5905-5': 'monocytes-pct',
  '770-8': 'neutrophils-pct',
  '6690-2': 'wbc',
  '787-2': 'mcv',
  '14749-6': 'glucose',
  '2345-7': 'glucose',
  '2160-0': 'creatinine',
  '14682-9': 'creatinine',
  '2951-2': 'sodium',
  '2823-3': 'potassium',
  '2075-0': 'chloride',
  '1963-8': 'bicarbonate',
  '17861-6': 'calcium',
  '2000-8': 'calcium',
  '29265-6': 'calcium-corrected',
  '14879-1': 'phosphate',
  '2601-3': 'magnesium',
  '2885-2': 'total-protein',
  '1751-7': 'albumin',
  '1975-2': 'bilirubin-total',
  '14631-6': 'bilirubin-total',
  '6768-6': 'alkaline-phosphatase',
  '1744-2': 'alt',
  '1920-8': 'ast',
  '2324-2': 'ggt',
  '3040-3': 'lipase',
  '2093-3': 'total-cholesterol',
  '2085-9': 'hdl',
  '13457-7': 'ldl',
  '2571-8': 'triglycerides',
  '3016-3': 'tsh',
  '14635-7': 'estradiol',
  '2986-8': 'testosterone-total',
  '1989-3': 'vitamin-d-nmol',
  '2857-1': 'psa',
};

/**
 * First match wins, so a specific pattern has to sit above the general one it
 * would otherwise be swallowed by. `/creatinine/` and `/albumin/` above the
 * albumin-creatinine ratio meant a urine ACR read serum creatinine's
 * 59-104 umol/L, and
 * `/\bcalcium\b/` above corrected calcium took every corrected result to the
 * plain one.
 */
export const nameLabAliases: Array<{ pattern: RegExp; id: string }> = [
  { pattern: /\bhemoglobin\b/i, id: 'hemoglobin' },
  { pattern: /\bhematocrit\b/i, id: 'hematocrit' },
  { pattern: /\bplatelets?\b/i, id: 'platelets' },
  { pattern: /\bmchc\b/i, id: 'mchc' },
  { pattern: /\bmch\b/i, id: 'mch' },
  { pattern: /\bmcv\b|mean cell volume/i, id: 'mcv' },
  { pattern: /\bwbc\b|white blood/i, id: 'wbc' },
  { pattern: /\brbc\b|red blood/i, id: 'rbc' },
  { pattern: /lymph.*absolute|absolute.*lymph/i, id: 'lymphocytes-abs' },
  { pattern: /\blymphs?\b|lymphocyte/i, id: 'lymphocytes-pct' },
  { pattern: /mono.*absolute|absolute.*mono/i, id: 'monocytes-abs' },
  { pattern: /monocyte/i, id: 'monocytes-pct' },
  { pattern: /neut.*absolute|absolute.*neut/i, id: 'neutrophils-abs' },
  { pattern: /neutrophil/i, id: 'neutrophils-pct' },
  { pattern: /eos.*absolute|absolute.*eos/i, id: 'eosinophils-abs' },
  { pattern: /eosinophil|eos\b/i, id: 'eosinophils-pct' },
  { pattern: /baso.*absolute|absolute.*baso/i, id: 'basophils-abs' },
  { pattern: /basophil|basos?\b/i, id: 'basophils-pct' },
  { pattern: /\bhdl\b/i, id: 'hdl' },
  { pattern: /\bldl\b/i, id: 'ldl' },
  { pattern: /triglyceride/i, id: 'triglycerides' },
  {
    pattern: /cholesterol.*total|total.*cholesterol/i,
    id: 'total-cholesterol',
  },
  { pattern: /\bglucose\b/i, id: 'glucose' },
  {
    pattern: /albumin.?creatinine|microalbumin/i,
    id: 'urine-microalbumin-creatinine-ratio',
  },
  { pattern: /creatinine/i, id: 'creatinine' },
  { pattern: /sodium/i, id: 'sodium' },
  { pattern: /potassium/i, id: 'potassium' },
  { pattern: /chloride/i, id: 'chloride' },
  { pattern: /bicarbonate/i, id: 'bicarbonate' },
  {
    pattern: /corrected.*calcium|calcium.*corrected/i,
    id: 'calcium-corrected',
  },
  { pattern: /\bcalcium\b/i, id: 'calcium' },
  { pattern: /phosphate/i, id: 'phosphate' },
  { pattern: /magnesium/i, id: 'magnesium' },
  { pattern: /total protein/i, id: 'total-protein' },
  { pattern: /albumin/i, id: 'albumin' },
  { pattern: /bilirubin/i, id: 'bilirubin-total' },
  { pattern: /alkaline phosphatase|\balp\b/i, id: 'alkaline-phosphatase' },
  { pattern: /alanine aminotransferase|\balt\b/i, id: 'alt' },
  { pattern: /aspartate aminotransferase|\bast\b/i, id: 'ast' },
  { pattern: /gamma.?glutamyl|glutamyltransferase|\bggt\b/i, id: 'ggt' },
  { pattern: /lipase/i, id: 'lipase' },
  { pattern: /vitamin b12|cyanocobal/i, id: 'b12' },
  { pattern: /\btsh\b|thyroid stimulating/i, id: 'tsh' },
  { pattern: /estradiol/i, id: 'estradiol' },
  { pattern: /testosterone/i, id: 'testosterone-total' },
  { pattern: /vitamin d|25.?hydroxy/i, id: 'vitamin-d-nmol' },
  { pattern: /\bpsa\b|prostate specific/i, id: 'psa' },
];

/**
 * Every unit any standard states a band for this test in.
 *
 * Used to sanity-check a name match: if a result's unit reconciles with none
 * of them, the name matched the wrong test.
 */
export function getReferenceUnitsForLab(testId: string): string[] {
  const units = new Set<string>();
  for (const byTest of definitionsByStandard.values()) {
    for (const band of byTest.get(testId)?.bands || []) {
      if (band.unit) units.add(band.unit);
    }
  }
  return [...units];
}

/**
 * Words that change what a name is measuring, so a plain analyte's reference
 * must not follow it.
 *
 * `nameLabAliases` matches a word inside a name, which is right for "HDL
 * CHOLESTEROL" and wrong for three things this record actually contains:
 *
 * - **Non-HDL cholesterol** matched `\bhdl\b` — the hyphen is a word
 *   boundary — and inherited HDL's ">=1.00 mmol/L". Same units, opposite
 *   clinical direction: non-HDL should be low and HDL should be high, so the
 *   flag came out backwards on a real lipid. This is the one a unit check
 *   cannot catch.
 * - **Chol/HDL ratio** and **Total:HDL cholesterol ratio** are a ratio of two
 *   analytes, not either of them.
 * - **HDL % of total** and **PSA %** are a fraction of a total, not a
 *   concentration.
 *
 * A percentage is only disqualifying for a test that is not itself a
 * percentage: the differential's `lymphocytes-pct` and friends are exactly
 * the percent form, and "Lymphocytes %" must keep matching them.
 */
export function nameQualifierRejectsAlias(
  name: string,
  id: string,
  /**
   * The panel the result was filed under. A name does not always say which
   * specimen it came from — the urinalysis in this record reports "RBC
   * intact", "Clumps WBC" and a plain "WBC", all of which read blood cell
   * counts off a microscope slide of urine — but the category does.
   */
  category?: string,
): boolean {
  const lower = name.toLowerCase();
  if (/\bnon[\s-]?hdl\b/.test(lower) && id === 'hdl') return true;
  if (/\bratio\b/.test(lower) && !id.endsWith('-ratio')) return true;
  if (/%|\bpercent|\bindex\b|\bfraction\b/.test(lower) && !id.endsWith('-pct'))
    return true;
  return (
    specimenRejectsAlias(lower, id) ||
    specimenRejectsAlias((category || '').toLowerCase(), id)
  );
}

/**
 * A reference interval belongs to a specimen as much as to an analyte.
 *
 * The same record holds a urinalysis dipstick, and every line of it was
 * borrowing a serum range: "Urine glucose" against blood glucose's 3.5-5.4
 * mmol/L, "Urine bilirubin" against serum bilirubin's <21 umol/L, "Urine RBC"
 * and "Urine WBC" against blood cell counts. None of them carry a unit, so
 * only the name can tell — and a dipstick reading a serum interval is not a
 * near-miss, it is a different test.
 *
 * A test that is itself specimen-specific keeps its match: the urine
 * albumin-creatinine ratio is named for the specimen it is measured in.
 */
const specimenPrefixes: Array<{ pattern: RegExp; prefix: string }> = [
  { pattern: /\burin(e|ary|alysis)\b/, prefix: 'urine-' },
  { pattern: /\bcsf\b|cerebrospinal/, prefix: 'csf-' },
  { pattern: /\bstool\b|\bfa?ecal\b/, prefix: 'stool-' },
  { pattern: /\bsaliva\b|\bsalivary\b/, prefix: 'saliva-' },
];

function specimenRejectsAlias(lowerName: string, id: string): boolean {
  return specimenPrefixes.some(
    ({ pattern, prefix }) => pattern.test(lowerName) && !id.startsWith(prefix),
  );
}

export function getReferenceStandard(id: ReferenceStandardId) {
  return standardById.get(id);
}

export function getSelectedReferenceBand(
  standardId: ReferenceStandardId,
  testId: string,
  context: ReferenceContext,
  observedUnit?: string,
): SelectedReferenceBand | undefined {
  const standard = standardById.get(standardId),
    definition = definitionsByStandard.get(standardId)?.get(testId);

  if (!standard || !definition) return undefined;

  // A value with no unit cannot pick between conventions. Haematocrit is
  // stated as a percentage by one standard and as a fraction of one by
  // another, so an unqualified 39.5 is either mid-range or a hundred times
  // the upper limit depending on which band it lands on — and `.find` would
  // simply take the first. Where a test is written more than one way, no unit
  // means no reference rather than a coin toss.
  // Across every standard, not just this one: haematocrit is a percentage in
  // the Canadian tables and a fraction in the Australian and UK ones, so the
  // disagreement is invisible from inside either definition.
  if (!observedUnit && getReferenceUnitsForLab(testId).length > 1) {
    return undefined;
  }

  const ageDays = context.ageYears * YEAR_IN_DAYS;
  const band = definition.bands.find((item) => {
    const matchesAge =
      (item.ageMinDays === undefined || ageDays >= item.ageMinDays) &&
      (item.ageMaxDays === undefined || ageDays < item.ageMaxDays);
    const matchesSex =
      item.sex === undefined || item.sex === 'all' || item.sex === context.sex;
    // Age and sex are not the only things that make a band the wrong one. A
    // band in a unit the value cannot be compared with is not a range for
    // this result, whatever the definition it was filed under.
    const matchesUnit = unitsAreReconcilable(testId, observedUnit, item.unit);
    return matchesAge && matchesSex && matchesUnit;
  });

  if (!band) return undefined;

  return {
    ...band,
    standardId,
    standardLabel: standard.label,
    definitionName: definition.name,
    defaultNote: definition.defaultNote,
  };
}
