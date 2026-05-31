import { LabDocument, LabFilterMode, LabGroup, LabSection } from '../types';
import {
  buildLabReferenceEvaluation,
  isPlannerRelevantLab,
} from '../enrichment/labEnrichment';
import { ReferenceContext, ReferenceOverlayMode } from '../enrichment/types';
import { compareLabsByDateDesc } from './labFormatters';

export function groupLabs(labs: LabDocument[]): LabGroup[] {
  const groups = new Map<string, LabGroup>();

  labs.forEach((lab) => {
    const code = lab.metadata?.loinc_coding?.[0],
      name = lab.metadata?.display_name || 'Unknown lab',
      key = code || name.toLowerCase();

    const group = groups.get(key);
    if (group) {
      group.labs.push(lab);
    } else {
      groups.set(key, {
        key,
        code,
        name,
        labs: [lab],
      });
    }
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      labs: group.labs.sort(compareLabsByDateDesc),
    }))
    .sort((a, b) => compareLabsByDateDesc(a.labs[0], b.labs[0]));
}

export function filterLabGroups(
  groups: LabGroup[],
  query: string,
  filterMode: LabFilterMode = 'all',
  referenceMode: ReferenceOverlayMode = 'canadian',
  referenceContext?: ReferenceContext,
): LabGroup[] {
  const normalizedQuery = query.trim().toLowerCase();

  return groups.filter((group) => {
    const searchable = [
      group.name,
      group.code,
      ...group.labs.map((lab) => lab.metadata?.display_name || ''),
    ]
      .join(' ')
      .toLowerCase();
    const matchesQuery =
      !normalizedQuery || searchable.includes(normalizedQuery);
    if (!matchesQuery) return false;

    if (filterMode === 'all') return true;
    if (filterMode === 'planner') return isPlannerRelevantLab(group);

    return group.labs.some((lab) => {
      const evaluation = buildLabReferenceEvaluation({
        group,
        lab,
        mode: referenceMode,
        referenceContext,
      });
      return ['high', 'low', 'abnormal', 'borderline'].includes(
        evaluation.flag,
      );
    });
  });
}

const SECTION_DEFINITIONS = [
  {
    key: 'blood-counts',
    title: 'Blood Counts',
    description: 'CBC, platelets, hemoglobin, hematocrit, and white cells.',
    terms: [
      'basophil',
      'cbc',
      'eosinophil',
      'hematocrit',
      'hemoglobin',
      'lymphocyte',
      'mch',
      'mchc',
      'mcv',
      'monocyte',
      'neutrophil',
      'platelet',
      'rbc',
      'rdw',
      'red blood',
      'wbc',
      'white blood',
    ],
  },
  {
    key: 'metabolic',
    title: 'Metabolic Panel',
    description: 'Electrolytes, kidney function, liver enzymes, and proteins.',
    terms: [
      'albumin',
      'alkaline phosphatase',
      'alt',
      'anion gap',
      'ast',
      'bilirubin',
      'bun',
      'calcium',
      'chloride',
      'co2',
      'creatinine',
      'egfr',
      'globulin',
      'magnesium',
      'phosphorus',
      'potassium',
      'protein',
      'sodium',
      'urea nitrogen',
    ],
  },
  {
    key: 'glucose-endocrine',
    title: 'Glucose & Endocrine',
    description: 'Glucose, A1c, insulin, thyroid, and hormone-related labs.',
    terms: [
      'a1c',
      'cgm',
      'cortisol',
      'free t4',
      'glucose',
      'hba1c',
      'hemoglobin a1c',
      'insulin',
      'thyroid',
      'tsh',
    ],
  },
  {
    key: 'lipids',
    title: 'Lipids',
    description: 'Cholesterol, triglycerides, HDL, LDL, and related markers.',
    terms: [
      'cholesterol',
      'hdl',
      'ldl',
      'lipoprotein',
      'non-hdl',
      'triglyceride',
      'vldl',
    ],
  },
  {
    key: 'urine',
    title: 'Urine & Kidney Markers',
    description: 'Urinalysis, urine chemistry, albumin, and protein markers.',
    terms: [
      'albumin/creatinine',
      'microalbumin',
      'specific gravity',
      'urinalysis',
      'urine',
    ],
  },
  {
    key: 'inflammation-immunity',
    title: 'Inflammation & Immunity',
    description: 'Inflammatory, autoimmune, infectious, and immune markers.',
    terms: [
      'ana',
      'antibody',
      'antigen',
      'c-reactive',
      'crp',
      'esr',
      'hepatitis',
      'hiv',
      'igg',
      'igm',
      'rheumatoid',
      'sedimentation',
    ],
  },
  {
    key: 'vitamins-nutrition',
    title: 'Vitamins & Nutrition',
    description: 'Iron, ferritin, vitamins, B12, folate, and nutrition labs.',
    terms: [
      'b12',
      'ferritin',
      'folate',
      'iron',
      'tibc',
      'transferrin',
      'vitamin',
    ],
  },
] as const;

const OTHER_SECTION = {
  key: 'other',
  title: 'Other Labs',
  description: 'Labs that do not match one of the common sections.',
};

export function sectionLabGroups(groups: LabGroup[]): LabSection[] {
  const sectionMap = new Map<string, LabSection>();

  SECTION_DEFINITIONS.forEach((section) => {
    sectionMap.set(section.key, {
      key: section.key,
      title: section.title,
      description: section.description,
      groups: [],
    });
  });
  sectionMap.set(OTHER_SECTION.key, {
    ...OTHER_SECTION,
    groups: [],
  });

  groups.forEach((group) => {
    const sectionKey = getLabSectionKey(group);
    sectionMap.get(sectionKey)?.groups.push(group);
  });

  return [...sectionMap.values()].filter(
    (section) => section.groups.length > 0,
  );
}

function getLabSectionKey(group: LabGroup): string {
  const searchable = [
    group.name,
    group.code,
    ...group.labs.flatMap((lab) => [
      lab.metadata?.display_name,
      ...(lab.metadata?.loinc_coding || []),
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matchingSection = SECTION_DEFINITIONS.find((section) =>
    section.terms.some((term) => searchable.includes(term)),
  );

  return matchingSection?.key || OTHER_SECTION.key;
}
