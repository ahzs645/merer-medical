import type { MedicationSource, MedicationTimelineItem } from './';
import type { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';

/**
 * Where a medication sits clinically: what the record says you are taking,
 * meant to take, or have stopped.
 *
 * Reconciliation is deliberately not one of these. It answers a different
 * question — how much the record can be trusted — and when it was a group of
 * its own it outranked the clinical reading: every drug whose source never
 * stated adherence (which is most of them, since `medication-adherence` is a
 * Mere extension no portal writes) became `needs-review`, and the Medications
 * page answered "what am I taking?" with **Current 0** over a list of three
 * active prescriptions. See `needsReconciliationReview`, which is a filter
 * across these groups rather than a sixth one.
 */
export type MedicationGroup = 'current' | 'planned' | 'stopped' | 'supplements';

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

/**
 * Names the source from the connection the record arrived on, where the FHIR
 * resource named nobody.
 *
 * The normaliser is a pure FHIR-to-domain transform with no database, so a
 * `MedicationStatement` carrying no `informationSource`, `recorder`, `requester`
 * or `performer` leaves `label` empty — and the card falls back to the type
 * alone, "Clinician". The connection knows it as "Blessings Clinic", and
 * `connectionId` was already being carried here for exactly this. So the lookup
 * happens at the view boundary, where the connections are, rather than being
 * threaded down into the transform.
 *
 * History events share the item's source object, so they are remapped with it.
 */
export function withConnectionNames(
  item: MedicationTimelineItem,
  connectionsById: Map<string, ConnectionDocument>,
): MedicationTimelineItem {
  const resolve = (source: MedicationSource): MedicationSource => {
    if (source.label || !source.connectionId) return source;
    const name = connectionsById.get(source.connectionId)?.name;
    return name ? { ...source, label: name } : source;
  };

  return {
    ...item,
    source: resolve(item.source),
    history: item.history.map((event) =>
      event.source ? { ...event, source: resolve(event.source) } : event,
    ),
  };
}

export function sourceLabel(source: MedicationTimelineItem['source']) {
  // "·", the separator the rest of the app uses between facts on one line, and
  // a capital on the type so "Blessings Clinic · imported record" does not read
  // as a proper noun trailing off into lower case.
  const type = source.type && humanize(source.type);
  return [source.label, type && type.charAt(0).toUpperCase() + type.slice(1)]
    .filter(Boolean)
    .join(' · ');
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
  // Everything left is a medication the record presents as in use: `status`
  // can only be `active` here, since every other value routes to one of the
  // groups above.
  return 'current';
}

/**
 * True when the record itself is unclear, whatever the medication's clinical
 * group — the source gave no status, or stated no adherence, or two sources
 * disagree.
 *
 * A filter rather than a group, so a drug can be both Current and worth
 * checking. The badge on the card says the same thing, so the chip and the
 * card now agree: before this, a supplement could carry a "needs review" badge
 * while the "Needs review" chip counted it under Supplements instead.
 */
export function needsReconciliationReview(item: MedicationTimelineItem) {
  return (
    item.reconciliationState === 'needs-review' ||
    item.reconciliationState === 'conflicting-sources'
  );
}

/**
 * `all` and `needsReview` are views across the clinical groups rather than
 * groups themselves, so the chips overlap by design — the same drug can be
 * Current and need review, and every drug is under All.
 */
export type MedicationFilterId = MedicationGroup | 'all' | 'needsReview';

/**
 * One rule for both the chip counts and the list underneath them, so a chip
 * cannot promise a number the list then fails to show.
 */
export function matchesMedicationFilter(
  item: MedicationViewItem,
  filter: MedicationFilterId,
) {
  if (filter === 'all') return true;
  if (filter === 'needsReview') return needsReconciliationReview(item);
  return item.group === filter;
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
