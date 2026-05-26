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
import canadianHematologyDefinitions from './referenceStandards/canadian/hematology.json';
import canadianMetadata from './referenceStandards/canadian/index.json';
import canadianLipidDefinitions from './referenceStandards/canadian/lipids.json';
import ukMetadata from './referenceStandards/uk/index.json';
import ukHematologyDefinitions from './referenceStandards/uk/hematology.json';

const YEAR_IN_DAYS = 365.2425;

type RawLabReferenceBand = Omit<
  LabReferenceBand,
  'kind' | 'sex' | 'ageMinDays' | 'ageMaxDays'
> & {
  kind: ReferenceKind;
  sex?: ReferenceSex;
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
    definitions: [...australianHematologyDefinitions],
  },
  {
    ...ukMetadata,
    definitions: [...ukHematologyDefinitions],
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
      bands: definition.bands.map(({ ageMinYears, ageMaxYears, ...band }) => ({
        ...band,
        ageMinDays:
          ageMinYears === undefined ? undefined : ageMinYears * YEAR_IN_DAYS,
        ageMaxDays:
          ageMaxYears === undefined ? undefined : ageMaxYears * YEAR_IN_DAYS,
      })),
    })),
  };
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
  '14749-6': 'glucose',
  '2345-7': 'glucose',
  '2160-0': 'creatinine',
  '17861-6': 'calcium',
  '2885-2': 'total-protein',
  '1751-7': 'albumin',
  '1975-2': 'bilirubin-total',
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

export const nameLabAliases: Array<{ pattern: RegExp; id: string }> = [
  { pattern: /\bhemoglobin\b/i, id: 'hemoglobin' },
  { pattern: /\bhematocrit\b/i, id: 'hematocrit' },
  { pattern: /\bplatelets?\b/i, id: 'platelets' },
  { pattern: /\bmchc\b/i, id: 'mchc' },
  { pattern: /\bmch\b/i, id: 'mch' },
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
  { pattern: /creatinine/i, id: 'creatinine' },
  { pattern: /\bcalcium\b/i, id: 'calcium' },
  { pattern: /total protein/i, id: 'total-protein' },
  { pattern: /albumin/i, id: 'albumin' },
  { pattern: /bilirubin/i, id: 'bilirubin-total' },
  {
    pattern: /albumin.?creatinine|microalbumin/i,
    id: 'urine-microalbumin-creatinine-ratio',
  },
  { pattern: /vitamin b12|cyanocobal/i, id: 'b12' },
  { pattern: /\btsh\b|thyroid stimulating/i, id: 'tsh' },
  { pattern: /estradiol/i, id: 'estradiol' },
  { pattern: /testosterone/i, id: 'testosterone-total' },
  { pattern: /vitamin d|25.?hydroxy/i, id: 'vitamin-d-nmol' },
  { pattern: /\bpsa\b|prostate specific/i, id: 'psa' },
];

export function getReferenceStandard(id: ReferenceStandardId) {
  return standardById.get(id);
}

export function getSelectedReferenceBand(
  standardId: ReferenceStandardId,
  testId: string,
  context: ReferenceContext,
): SelectedReferenceBand | undefined {
  const standard = standardById.get(standardId),
    definition = definitionsByStandard.get(standardId)?.get(testId);

  if (!standard || !definition) return undefined;

  const ageDays = context.ageYears * YEAR_IN_DAYS;
  const band = definition.bands.find((item) => {
    const matchesAge =
      (item.ageMinDays === undefined || ageDays >= item.ageMinDays) &&
      (item.ageMaxDays === undefined || ageDays < item.ageMaxDays);
    const matchesSex =
      item.sex === undefined || item.sex === 'all' || item.sex === context.sex;
    return matchesAge && matchesSex;
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
