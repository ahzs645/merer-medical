/**
 * Parses a date string as UTC, accepting both date-only values
 * ("2012-02-23") and full ISO timestamps ("2012-02-23T05:00:00.000Z").
 * User-profile birthdays are stored as full timestamps while FHIR
 * birthDate fields are date-only, so callers must handle both — naively
 * appending "T00:00:00Z" to a timestamp yields an Invalid Date.
 */
export function parseDateAsUtc(value?: string): Date | undefined {
  if (!value) return undefined;
  const normalized = value.includes('T') ? value : `${value}T00:00:00Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
