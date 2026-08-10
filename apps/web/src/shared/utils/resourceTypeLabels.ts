/**
 * Human-readable names for the FHIR resource types we store.
 *
 * `data_record.resource_type` is a lowercased, unspaced schema identifier
 * ("documentreference_attachment", "allergyintolerance"). Several screens were
 * printing it straight to the user; this map is the single place that turns one
 * into something a patient would recognise.
 */
const RESOURCE_TYPE_LABELS: Record<string, { one: string; many: string }> = {
  allergyintolerance: { one: 'Allergy', many: 'Allergies' },
  careplan: { one: 'Care plan', many: 'Care plans' },
  condition: { one: 'Condition', many: 'Conditions' },
  coverage: { one: 'Insurance coverage', many: 'Insurance coverage' },
  diagnosticreport: { one: 'Report', many: 'Reports' },
  documentreference: { one: 'Document', many: 'Documents' },
  documentreference_attachment: { one: 'Attachment', many: 'Attachments' },
  encounter: { one: 'Visit', many: 'Visits' },
  familymemberhistory: { one: 'Family history', many: 'Family history' },
  goal: { one: 'Goal', many: 'Goals' },
  imagingstudy: { one: 'Imaging study', many: 'Imaging studies' },
  immunization: { one: 'Immunization', many: 'Immunizations' },
  medicationorder: { one: 'Medication', many: 'Medications' },
  medicationrequest: { one: 'Medication', many: 'Medications' },
  medicationstatement: { one: 'Medication', many: 'Medications' },
  observation: { one: 'Result', many: 'Results' },
  patient: { one: 'Patient profile', many: 'Patient profiles' },
  practitioner: { one: 'Provider', many: 'Providers' },
  procedure: { one: 'Procedure', many: 'Procedures' },
  servicerequest: { one: 'Referral or order', many: 'Referrals and orders' },
  visionprescription: { one: 'Vision prescription', many: 'Vision prescriptions' },
};

/** Sentence-case fallback for a type we have no entry for. */
function humanizeResourceType(resourceType: string): string {
  const spaced = resourceType.replace(/_/g, ' ').trim();
  if (!spaced) return resourceType;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Display name for a resource type. Pass a count to get the plural form; with
 * no count the plural is used, which reads correctly in list headings.
 */
export function resourceTypeLabel(resourceType: string, count?: number): string {
  const entry = RESOURCE_TYPE_LABELS[resourceType?.toLowerCase?.() ?? ''];
  if (!entry) return humanizeResourceType(resourceType);
  return count === 1 ? entry.one : entry.many;
}
