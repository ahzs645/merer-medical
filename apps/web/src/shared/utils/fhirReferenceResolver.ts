import { concatPath } from './urlUtils';

export function resolveObservationReferences({
  references,
  baseUrl,
}: {
  references: Array<{ reference: string }>;
  baseUrl?: string;
}): string[] {
  return references.map((item) => {
    if (item.reference.startsWith('http')) {
      return item.reference;
    }
    return baseUrl ? concatPath(baseUrl, item.reference) : item.reference;
  });
}

export function resolveObservationReferenceKeys({
  references,
  baseUrl,
}: {
  references: Array<{ reference: string }>;
  baseUrl?: string;
}): string[] {
  const keys = new Set<string>();
  const resolvedReferences = resolveObservationReferences({
    references,
    baseUrl,
  });

  resolvedReferences.forEach((resolvedReference, index) => {
    const originalReference = references[index]?.reference;
    [resolvedReference, originalReference].filter(Boolean).forEach((item) => {
      if (!item) return;
      keys.add(item);

      const observationId = item.match(
        /(?:^|\/)Observation\/([^/?#]+)/,
      )?.[1];
      if (observationId) {
        keys.add(observationId);
        keys.add(`manual:${observationId}`);
      }
    });
  });

  return Array.from(keys);
}
