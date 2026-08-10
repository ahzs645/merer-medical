import { conceptCodes } from './fhirText';

/**
 * SNOMED concepts that record the *absence* of an allergy, or that no allergy
 * history was taken. Portals (Epic, Cerner) emit these as ordinary
 * AllergyIntolerance resources, so a naive list renders "No Known Allergies"
 * and three copies of "Not on File" as if the patient were allergic to them.
 *
 * They are real records and must not be dropped from the record set — but they
 * are statements *about* the allergy list, not allergens, so screens separate
 * them out (Allergies tab) or omit them entirely (emergency wallet card).
 */
export const ALLERGY_NEGATION_CODES = new Set([
  '716186003', // No known allergy
  '409137002', // No known drug allergy
  '428607008', // No known environmental allergy
  '429625007', // No known food allergy
  '428197003', // No known latex allergy
  '1631000175102', // Patient not asked
  '787923006', // Allergy status unknown
]);

/**
 * Text fallback for sources that send the negation as free text with no
 * SNOMED coding (common in C-CDA-derived and older DSTU2 feeds).
 */
const ALLERGY_NEGATION_TEXT =
  /^(no known|nka\b|none known|not on file|patient not asked|unknown|no allergies)/i;

/**
 * True when an AllergyIntolerance resource records the absence of an allergy
 * or that no allergy history was taken, rather than an actual allergen.
 *
 * `name` is the already-resolved display name (DSTU2 keeps the allergen on
 * `substance`, R4 on `code`), so callers pass whatever they render.
 */
export function isAllergyNegation(
  resource: Record<string, unknown>,
  name: string,
): boolean {
  const codes = [
    ...conceptCodes(resource['substance']),
    ...conceptCodes(resource['code']),
  ];
  if (codes.some((code) => ALLERGY_NEGATION_CODES.has(code))) return true;
  return ALLERGY_NEGATION_TEXT.test(name.trim());
}
