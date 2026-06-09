/**
 * Curated clinical "topic" map used to associate a Condition with related
 * records (labs, medications, procedures) when the source data has no explicit
 * FHIR back-references (reasonReference / evidence / basedOn).
 *
 * A condition is matched to one or more topics via ICD-10 prefix, SNOMED code,
 * or a keyword in its display name. Each topic then declares the LOINC codes,
 * lab-name keywords, medication-name keywords and procedure keywords that count
 * as "related" to any condition in that topic.
 *
 * This is intentionally a hand-maintained, offline, deterministic map so the
 * condition-centric view works in the demo (and offline) without any LLM/API.
 * It can later be augmented by Mere's AI features for fuzzier associations.
 */

export interface ConditionTopic {
  id: string;
  /** Human label shown as the grouping reason, e.g. "Diabetes & blood sugar". */
  label: string;
  /** Match if any condition code starts with one of these (ICD-10 style). */
  icd10Prefixes?: string[];
  /** Match if any condition code exactly equals one of these (SNOMED CT). */
  snomed?: string[];
  /** Match if the condition display name contains one of these (lowercased). */
  keywords?: string[];
  /** Related labs by LOINC code. */
  labLoinc?: string[];
  /** Related labs by substring of the lab name (fallback when no LOINC). */
  labKeywords?: string[];
  /** Related medications by substring of the medication name. */
  medKeywords?: string[];
  /** Related procedures by substring of the procedure name. */
  procedureKeywords?: string[];
}

export const CONDITION_TOPICS: ConditionTopic[] = [
  {
    id: 'diabetes',
    label: 'Diabetes & blood sugar',
    icd10Prefixes: ['E08', 'E09', 'E10', 'E11', 'E13', 'R73'],
    snomed: ['444751005', '73211009', '46635009', '44054006'],
    keywords: ['diabet', 'hemoglobin a1c', 'a1c', 'glucose', 'hyperglycemia'],
    labLoinc: [
      '4548-4',
      '4549-2',
      '17856-6',
      '41995-2',
      '2345-7',
      '2339-0',
      '2344-0',
      '1558-6',
    ],
    labKeywords: ['a1c', 'hemoglobin a1c', 'hba1c', 'glucose'],
    medKeywords: [
      'metformin',
      'insulin',
      'glipizide',
      'glyburide',
      'glimepiride',
      'rosiglitazone',
      'pioglitazone',
      'sitagliptin',
      'empagliflozin',
      'dapagliflozin',
      'liraglutide',
      'semaglutide',
    ],
  },
  {
    id: 'cardiovascular',
    label: 'Heart & cardiovascular',
    icd10Prefixes: [
      'I10',
      'I11',
      'I20',
      'I21',
      'I25',
      'I48',
      'I50',
      'E78',
      'Z91.8',
    ],
    snomed: ['315016007', '53741008', '38341003', '55822004', '13644009'],
    keywords: [
      'coronary',
      'cardiac',
      'heart',
      'hypertension',
      'blood pressure',
      'cholesterol',
      'hyperlipidemia',
      'lipid',
      'artery',
    ],
    labLoinc: [
      '2093-3',
      '2571-8',
      '2085-9',
      '13457-7',
      '18262-6',
      '2089-1',
      '9830-1',
      '8480-6',
      '8462-4',
    ],
    labKeywords: [
      'cholesterol',
      'triglyceride',
      'hdl',
      'ldl',
      'lipid',
      'blood pressure',
    ],
    medKeywords: [
      'lisinopril',
      'hydrochlorothiazide',
      'atorvastatin',
      'simvastatin',
      'rosuvastatin',
      'pravastatin',
      'amlodipine',
      'metoprolol',
      'carvedilol',
      'losartan',
      'valsartan',
      'digoxin',
      'clopidogrel',
      'furosemide',
    ],
    procedureKeywords: ['ecg', 'ekg', 'echocardiogram', 'stress test'],
  },
  {
    id: 'respiratory',
    label: 'Lungs & breathing',
    icd10Prefixes: ['J18', 'J20', 'J44', 'J45', 'R05', 'A15', 'J96'],
    snomed: ['195967001', '68154008', '301004001', '154283005', '233604007'],
    keywords: [
      'asthma',
      'cough',
      'pneumonia',
      'tuberculosis',
      'copd',
      'bronchitis',
      'respiratory',
      'lung',
    ],
    labKeywords: ['oxygen', 'sputum'],
    medKeywords: [
      'albuterol',
      'salbutamol',
      'benzonatate',
      'montelukast',
      'fluticasone',
      'budesonide',
      'ipratropium',
      'prednisone',
      'azithromycin',
      'amoxicillin',
      'isoniazid',
      'rifampin',
    ],
    procedureKeywords: ['chest x-ray', 'spirometry', 'pulmonary'],
  },
  {
    id: 'reproductive',
    label: 'Reproductive & hormonal',
    icd10Prefixes: ['E28', 'N91', 'N97'],
    snomed: ['69878008'],
    keywords: ['ovaries', 'ovary', 'polycystic', 'menstrual', 'pcos'],
    labKeywords: ['testosterone', 'lh', 'fsh', 'estradiol', 'prolactin'],
    medKeywords: [
      'drospirenone',
      'ethinyl estradiol',
      'norethindrone',
      'levonorgestrel',
      'spironolactone',
      'clomiphene',
    ],
  },
  {
    id: 'behavioral',
    label: 'Mental & behavioral health',
    icd10Prefixes: ['F32', 'F33', 'F40', 'F41', 'F43', 'F90'],
    snomed: ['70691001', '35489007', '197480006'],
    keywords: [
      'anxiety',
      'depress',
      'phobia',
      'fear of',
      'panic',
      'adhd',
      'attention deficit',
    ],
    medKeywords: [
      'amitriptyline',
      'sertraline',
      'fluoxetine',
      'escitalopram',
      'citalopram',
      'bupropion',
      'amphetamine',
      'dextroamphetamine',
      'methylphenidate',
      'venlafaxine',
      'duloxetine',
    ],
  },
  {
    id: 'infection',
    label: 'Infection',
    icd10Prefixes: ['A92', 'A9', 'B'],
    snomed: ['3928002'],
    keywords: ['zika', 'virus', 'viral', 'infection'],
    labKeywords: ['antibody', 'pcr', 'culture', 'titer'],
  },
  {
    id: 'musculoskeletal',
    label: 'Bones & injury',
    icd10Prefixes: ['S42', 'S52', 'S62', 'M80', 'M84'],
    snomed: ['23406007', '125605004'],
    keywords: ['fracture', 'broken', 'bone', 'sprain', 'dislocation'],
    procedureKeywords: ['x-ray', 'cast', 'splint', 'orthopedic', 'reduction'],
  },
  {
    id: 'dental',
    label: 'Dental & oral health',
    icd10Prefixes: ['K02', 'K05', 'K08', 'R19.6'],
    snomed: ['80967001'],
    keywords: [
      'caries',
      'tooth',
      'teeth',
      'dental',
      'malocclusion',
      'orthodontic',
      'bad breath',
      'halitosis',
    ],
    procedureKeywords: [
      'crown',
      'cleaning',
      'scaling',
      'root planing',
      'aligner',
      'retainer',
      'dental',
      'periodontal',
    ],
  },
];

/** Returns the topics a condition belongs to, given its codes and name. */
export function resolveConditionTopics(
  codes: string[],
  name: string,
): ConditionTopic[] {
  const normalizedName = name.toLowerCase();
  const normalizedCodes = codes.map((code) => code.toUpperCase());

  return CONDITION_TOPICS.filter((topic) => {
    const byPrefix = topic.icd10Prefixes?.some((prefix) =>
      normalizedCodes.some((code) => code.startsWith(prefix.toUpperCase())),
    );
    const bySnomed = topic.snomed?.some((code) => codes.includes(code));
    const byKeyword = topic.keywords?.some((keyword) =>
      normalizedName.includes(keyword),
    );
    return Boolean(byPrefix || bySnomed || byKeyword);
  });
}
