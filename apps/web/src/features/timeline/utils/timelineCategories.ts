import { BundleEntry, FhirResource } from 'fhir/r2';

import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  getEncounterClass,
  getEncounterLocation,
} from '../../../shared/utils/fhirAccessHelpers';

/**
 * The record categories a grouped timeline card can render, in the order the
 * card body renders them. Anything not listed here has no section in the card,
 * so it must not appear in the card title either.
 */
const CATEGORY_ORDER = [
  'Immunizations',
  'Conditions',
  'Procedures',
  'Consents',
  'Labs',
  'Medications',
  'Lab Panels',
  'Documents',
  'Encounters',
  'Coverage',
  'Care Plans',
  'Care Teams',
  'Goals',
  'Appointments',
  'Specimens',
  'Allergies',
  'Family History',
] as const;

const CATEGORY_BY_RESOURCE_TYPE: Record<string, string> = {
  immunization: 'Immunizations',
  condition: 'Conditions',
  procedure: 'Procedures',
  consent: 'Consents',
  observation: 'Labs',
  medicationstatement: 'Medications',
  medicationrequest: 'Medications',
  medicationorder: 'Medications',
  diagnosticreport: 'Lab Panels',
  documentreference: 'Documents',
  documentreference_attachment: 'Documents',
  encounter: 'Encounters',
  coverage: 'Coverage',
  careplan: 'Care Plans',
  careteam: 'Care Teams',
  goal: 'Goals',
  appointment: 'Appointments',
  specimen: 'Specimens',
  allergyintolerance: 'Allergies',
  familymemberhistory: 'Family History',
};

/**
 * Categories that will actually render content for a day's records. Used both
 * for the card title and to decide whether a card is worth rendering at all —
 * a day made up only of resource types the card cannot display used to produce
 * an empty "Your health record" card.
 */
export function getTimelineCategories(
  itemList: ClinicalDocument<BundleEntry<FhirResource>>[],
): string[] {
  const present = new Set<string>();
  for (const item of itemList) {
    const resourceType = item.data_record?.resource_type;
    // Encounters render only their class and location, so one with neither is
    // an empty bullet and should not count as content.
    if (
      resourceType === 'encounter' &&
      !getEncounterClass(item) &&
      !getEncounterLocation(item)
    ) {
      continue;
    }
    const category = CATEGORY_BY_RESOURCE_TYPE[resourceType];
    if (category) {
      present.add(category);
    }
  }
  return CATEGORY_ORDER.filter((category) => present.has(category));
}

/**
 * Card titles used to concatenate every category present on a date, which ran
 * to three lines on a phone. Cap the list at two and count the rest.
 */
export function buildTimelineCardTitle(categories: string[]): string {
  switch (categories.length) {
    case 0:
      return '';
    case 1:
      return `Your ${categories[0]}`;
    case 2:
      return `Your ${categories[0]} & ${categories[1]}`;
    default:
      return `Your ${categories[0]}, ${categories[1]}, and ${
        categories.length - 2
      } more`;
  }
}
