import {
  LabReferenceStandard,
  ReferenceContext,
  ReferenceStandardId,
  SelectedReferenceBand,
} from './types';

const YEAR_IN_DAYS = 365.2425;

export const labReferenceStandards: LabReferenceStandard[] = [
  {
    id: 'canadian',
    label: 'Canadian',
    country: 'Canada',
    definitions: [
      standardRange(
        ['hemoglobin'],
        'Hemoglobin',
        '135-175',
        'g/L',
        135,
        175,
        'APL-CBC-DIFF',
      ),
      standardRange(
        ['hematocrit'],
        'Hematocrit',
        '40-52%',
        '%',
        40,
        52,
        'APL-CBC-DIFF',
      ),
      standardRange(
        ['rbc'],
        'Red blood cells',
        '4.30-6.00',
        '10^12/L',
        4.3,
        6,
        'APL-CBC-DIFF',
      ),
      standardRange(
        ['platelets'],
        'Platelets',
        '140-400',
        '10^9/L',
        140,
        400,
        'APL-CBC-DIFF',
      ),
      standardRange(['mch'], 'MCH', '27-32', 'pg', 27, 32, 'DYN-CBC-MCH'),
      standardRange(
        ['mchc'],
        'MCHC',
        '310-360',
        'g/L',
        310,
        360,
        'APL-CBC-DIFF',
      ),
      {
        testIds: [
          'neutrophils-pct',
          'eosinophils-pct',
          'basophils-pct',
          'lymphocytes-pct',
          'monocytes-pct',
        ],
        name: 'Differential percentage',
        bands: [
          {
            label: 'All ages',
            kind: 'note',
            display: 'Use absolute count',
            citationId: 'APL-CBC-DIFF',
            note: 'Canadian CBC differential intervals are published for absolute counts, not percentages.',
          },
        ],
      },
      standardRange(
        ['lymphocytes-abs'],
        'Lymphocytes absolute',
        '1.0-4.0',
        '10^9/L',
        1,
        4,
        'APL-CBC-DIFF',
      ),
      standardRange(
        ['monocytes-abs'],
        'Monocytes absolute',
        '0.2-0.8',
        '10^9/L',
        0.2,
        0.8,
        'APL-CBC-DIFF',
      ),
      standardRange(
        ['eosinophils-abs'],
        'Eosinophils absolute',
        '0.0-0.7',
        '10^9/L',
        0,
        0.7,
        'APL-CBC-DIFF',
      ),
      standardRange(
        ['basophils-abs'],
        'Basophils absolute',
        '0.0-0.3',
        '10^9/L',
        0,
        0.3,
        'APL-CBC-DIFF',
      ),
      standardRange(
        ['neutrophils-abs'],
        'Neutrophils absolute',
        '1.8-7.5',
        '10^9/L',
        1.8,
        7.5,
        'APL-CBC-DIFF',
      ),
      standardRange(
        ['hdl'],
        'HDL cholesterol',
        '>=1.00 male',
        'mmol/L',
        1,
        undefined,
        'DC-LIPID-DIABETES',
        'gte',
      ),
      standardRange(
        ['ldl'],
        'LDL cholesterol',
        '<2.0 with diabetes-risk context',
        'mmol/L',
        undefined,
        2,
        'DC-LIPID-DIABETES',
        'lt',
      ),
    ],
  },
  {
    id: 'australian',
    label: 'Australian',
    country: 'Australia',
    definitions: [
      standardRange(
        ['hemoglobin'],
        'Hemoglobin',
        '135-180',
        'g/L',
        135,
        180,
        'AUS-AUSTIN-REF-RANGES',
      ),
      standardRange(
        ['hematocrit'],
        'Hematocrit',
        '40-54%',
        '%',
        40,
        54,
        'AUS-AUSTIN-REF-RANGES',
      ),
      standardRange(
        ['rbc'],
        'Red blood cells',
        '4.5-6.5',
        '10^12/L',
        4.5,
        6.5,
        'AUS-AUSTIN-REF-RANGES',
      ),
      standardRange(
        ['platelets'],
        'Platelets',
        '150-400',
        '10^9/L',
        150,
        400,
        'AUS-AUSTIN-REF-RANGES',
      ),
      standardRange(
        ['mch'],
        'MCH',
        '27-33',
        'pg',
        27,
        33,
        'AUS-AUSTIN-REF-RANGES',
      ),
      standardRange(
        ['mchc'],
        'MCHC',
        '320-360',
        'g/L',
        320,
        360,
        'AUS-AUSTIN-REF-RANGES',
      ),
      differentialPercentNote('AUS-AUSTIN-REF-RANGES'),
    ],
  },
  {
    id: 'uk',
    label: 'UK',
    country: 'United Kingdom',
    definitions: [
      standardRange(
        ['hemoglobin'],
        'Haemoglobin',
        '130-180',
        'g/L',
        130,
        180,
        'UK-WORCS-FBC',
      ),
      standardRange(
        ['hematocrit'],
        'Haematocrit',
        '40-52%',
        '%',
        40,
        52,
        'UK-WORCS-FBC',
      ),
      standardRange(
        ['rbc'],
        'Red blood cells',
        '4.5-6.5',
        '10^12/L',
        4.5,
        6.5,
        'UK-WORCS-FBC',
      ),
      standardRange(
        ['platelets'],
        'Platelets',
        '150-400',
        '10^9/L',
        150,
        400,
        'UK-WORCS-FBC',
      ),
      standardRange(['mch'], 'MCH', '27-32', 'pg', 27, 32, 'UK-WORCS-FBC'),
      standardRange(
        ['mchc'],
        'MCHC',
        '300-350',
        'g/L',
        300,
        350,
        'UK-WORCS-FBC',
      ),
      differentialPercentNote('UK-WORCS-FBC'),
    ],
  },
];

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

function standardRange(
  testIds: string[],
  name: string,
  display: string,
  unit: string,
  low: number | undefined,
  high: number | undefined,
  citationId: string,
  kind: 'range' | 'lt' | 'gte' = 'range',
) {
  return {
    testIds,
    name,
    bands: [
      {
        label: '18 years up to 150 years',
        kind,
        display,
        unit,
        low,
        high,
        citationId,
        ageMinDays: 18 * YEAR_IN_DAYS,
        ageMaxDays: 150 * YEAR_IN_DAYS,
      },
    ],
  };
}

function differentialPercentNote(citationId: string) {
  return {
    testIds: [
      'neutrophils-pct',
      'eosinophils-pct',
      'basophils-pct',
      'lymphocytes-pct',
      'monocytes-pct',
    ],
    name: 'Differential percentage',
    bands: [
      {
        label: 'All ages',
        kind: 'note' as const,
        display: 'Use absolute count',
        citationId,
        note: 'This standard treats absolute differential counts as the preferred reference interval.',
      },
    ],
  };
}
