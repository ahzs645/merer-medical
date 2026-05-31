const MANUAL_ALIAS_OVERRIDES: Record<string, string[]> = {
  acetaminophen: ['paracetamol'],
  coumadin: ['warfarin'],
  glucophage: ['metformin'],
  tylenol: ['acetaminophen', 'paracetamol'],
};

export function expandMedicationInteractionAliases(normalizedTerms: string[]) {
  const expanded = new Set(normalizedTerms);

  normalizedTerms.forEach((term) => {
    MANUAL_ALIAS_OVERRIDES[term]?.forEach((alias) => expanded.add(alias));
  });

  return Array.from(expanded);
}
