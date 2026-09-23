/**
 * The values at a dotted FHIRPath path — `referenceRange.low`,
 * `valueCodeableConcept.coding.display` — as the collection FHIRPath would
 * return: every repeating element flattened, absent ones dropped.
 *
 * The timeline and the allergy card only ever asked FHIRPath to walk a path,
 * and for that they loaded the whole evaluator into the first script every
 * visitor downloads: fhirpath, its ANTLR parser and the UCUM unit tables,
 * about 470 KB of a 2.8 MB entry chunk. This is the part of it they used.
 * Anything needing functions, filters or unions should import `fhirpath`
 * itself, in code that is already lazily loaded.
 */
export function fhirPathValues(resource: unknown, path: string): unknown[] {
  let current: unknown[] = resource == null ? [] : [resource];
  for (const segment of path.split('.')) {
    const next: unknown[] = [];
    for (const node of current) {
      if (node === null || typeof node !== 'object') continue;
      const value = (node as Record<string, unknown>)[segment];
      if (Array.isArray(value)) {
        for (const item of value) if (item != null) next.push(item);
      } else if (value != null) {
        next.push(value);
      }
    }
    current = next;
  }
  return current;
}

/** The first value at a dotted path, as `evaluate(resource, path)[0]` gave. */
export function fhirPathFirst<T = unknown>(
  resource: unknown,
  path: string,
): T | undefined {
  return fhirPathValues(resource, path)[0] as T | undefined;
}
