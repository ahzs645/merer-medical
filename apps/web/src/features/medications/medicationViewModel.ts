import type { MedicationTimelineItem } from './';

export type MedicationGroup =
  | 'current'
  | 'planned'
  | 'stopped'
  | 'supplements'
  | 'needsReview';

export type NutritionFact = {
  label: string;
  value: string;
};

export type MedicationViewItem = MedicationTimelineItem & {
  group: MedicationGroup;
  nutritionFacts: NutritionFact[];
};

export function toMedicationViewItem(
  item: MedicationTimelineItem,
): MedicationViewItem {
  const nutritionFacts = nutritionFactsFrom(item);
  const group = classifyGroup(item, nutritionFacts);

  return {
    ...item,
    group,
    nutritionFacts,
  };
}

export function sourceLabel(source: MedicationTimelineItem['source']) {
  return [source.label, source.type && humanize(source.type)]
    .filter(Boolean)
    .join(' - ');
}

export function humanize(value: string) {
  return value.replace(/[-_]/g, ' ');
}

function classifyGroup(
  item: MedicationTimelineItem,
  nutritionFacts: NutritionFact[],
): MedicationGroup {
  const searchable = `${item.category || ''} ${item.name}`.toLowerCase();
  if (
    nutritionFacts.length > 0 ||
    ['supplement', 'vitamin', 'mineral', 'herbal'].some((word) =>
      searchable.includes(word),
    )
  ) {
    return 'supplements';
  }
  if (
    item.stopDate ||
    ['stopped', 'completed', 'entered-in-error'].includes(item.status)
  ) {
    return 'stopped';
  }
  if (
    item.conditionalInstructions ||
    item.resourceType === 'MedicationRequest' ||
    item.resourceType === 'MedicationOrder' ||
    ['intended', 'on-hold', 'unknown'].includes(item.status)
  ) {
    return 'planned';
  }
  if (item.reconciliationState === 'needs-review') return 'needsReview';
  if (item.status === 'active') return 'current';
  return 'needsReview';
}

function nutritionFactsFrom(item: MedicationTimelineItem): NutritionFact[] {
  const facts: NutritionFact[] = [];
  const raw = item.document.data_record.raw as any;
  const resource = raw?.resource || raw || {};
  const rawFacts = raw?.nutrition_facts || raw?.nutritionFacts;

  if (Array.isArray(rawFacts)) {
    rawFacts.forEach((fact: any) => {
      const label = fact.label || fact.name || fact.nutrient;
      const value = fact.value || fact.amount || fact.text;
      if (label && value) facts.push({ label, value: String(value) });
    });
  }

  resource.ingredient?.forEach((ingredient: any) => {
    const label =
      textFromCodeableConcept(ingredient.itemCodeableConcept) ||
      referenceDisplay(ingredient.itemReference);
    const value = ratioText(ingredient.strength);
    if (label) facts.push({ label, value: value || 'ingredient' });
  });

  const vitaminMatch = item.notes
    .join('\n')
    .match(
      /\b(vitamin\s+[a-z0-9]+|magnesium|omega-?3|zinc|calcium|iron|folate)\b[^,\n;]*/gi,
    );
  vitaminMatch?.forEach((value) => {
    facts.push({ label: value.split(/\s+/).slice(0, 2).join(' '), value });
  });

  return facts;
}

function textFromCodeableConcept(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.text || value.coding?.[0]?.display || value.coding?.[0]?.code;
}

function referenceDisplay(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.display || value.reference;
}

function ratioText(value: any) {
  if (!value) return undefined;
  const numerator = value.numerator
    ? `${value.numerator.value || ''} ${
        value.numerator.unit || value.numerator.code || ''
      }`.trim()
    : undefined;
  const denominator = value.denominator
    ? `${value.denominator.value || ''} ${
        value.denominator.unit || value.denominator.code || ''
      }`.trim()
    : undefined;
  return [numerator, denominator].filter(Boolean).join(' / ') || undefined;
}
