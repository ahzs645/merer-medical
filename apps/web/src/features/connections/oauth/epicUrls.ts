/**
 * Normalizes an Epic FHIR base URL so it always includes the
 * version-specific `/api/FHIR/R4` or `/api/FHIR/DSTU2` path suffix that
 * Epic endpoints expect. If the URL already contains the suffix it is
 * returned unchanged.
 *
 * @param baseUrl - Epic FHIR server base URL
 * @param fhirVersion - FHIR version (DSTU2 or R4)
 * @returns Base URL guaranteed to include the version suffix
 */
export function normalizeEpicBaseUrl(
  baseUrl: string,
  fhirVersion: 'DSTU2' | 'R4',
): string {
  if (fhirVersion === 'R4') {
    if (!baseUrl.includes('/api/FHIR/R4')) {
      return baseUrl + '/api/FHIR/R4/';
    }
  } else {
    if (!baseUrl.includes('/api/FHIR/DSTU2')) {
      return baseUrl + '/api/FHIR/DSTU2/';
    }
  }
  return baseUrl;
}
