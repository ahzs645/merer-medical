import { normalizeMedicationDocument } from './medicationNormalizer';
import {
  matchesMedicationFilter,
  needsReconciliationReview,
  toMedicationViewItem,
} from './medicationViewModel';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

function viewItem(resource: Record<string, unknown>) {
  const document = {
    id: 'connection|user|manual:medication-test',
    connection_record_id: 'connection',
    user_id: 'user',
    data_record: {
      raw: { resource },
      format: 'FHIR.DSTU2',
      content_type: 'application/json',
      resource_type: 'medicationstatement',
      version_history: [],
    },
    metadata: {
      id: 'manual:medication-test',
      date: '2026-08-03T12:00:00.000Z',
      display_name: String(resource.__name || 'Test medication'),
      loinc_coding: [],
    },
  } as unknown as ClinicalDocument;

  return toMedicationViewItem(normalizeMedicationDocument(document)!);
}

/**
 * The defect these cover: a portal medication carries no adherence extension —
 * `medication-adherence` is Mere's own — so it normalized to `unknown`, which
 * `getReconciliationState` turns into `needs-review`. While Needs review was a
 * group of its own, tested ahead of `status === 'active'`, that took the drug
 * out of Current, and the Medications page answered "what am I taking?" with
 * **Current 0** over three active prescriptions.
 */
describe('medication grouping', () => {
  it('calls an active medication current even when nobody stated adherence', () => {
    const item = viewItem({
      resourceType: 'MedicationStatement',
      status: 'active',
      medicationCodeableConcept: { text: 'Lisinopril 10 MG tablet' },
    });

    expect(item.adherence).toBe('unknown');
    expect(item.reconciliationState).toBe('needs-review');
    expect(item.group).toBe('current');
  });

  it('counts that same medication under Needs review as well as Current', () => {
    const item = viewItem({
      resourceType: 'MedicationStatement',
      status: 'active',
      medicationCodeableConcept: { text: 'Lisinopril 10 MG tablet' },
    });

    expect(matchesMedicationFilter(item, 'current')).toBe(true);
    expect(matchesMedicationFilter(item, 'needsReview')).toBe(true);
    expect(matchesMedicationFilter(item, 'all')).toBe(true);
    expect(matchesMedicationFilter(item, 'stopped')).toBe(false);
  });

  it('keeps the clinical groups mutually exclusive', () => {
    const stopped = viewItem({
      resourceType: 'MedicationStatement',
      status: 'completed',
      medicationCodeableConcept: { text: 'Amoxicillin 500 MG capsule' },
    });
    const planned = viewItem({
      resourceType: 'MedicationRequest',
      status: 'intended',
      medicationCodeableConcept: { text: 'Atorvastatin 20 MG tablet' },
    });
    const supplement = viewItem({
      resourceType: 'MedicationStatement',
      status: 'active',
      medicationCodeableConcept: { text: 'Vitamin D 25 MCG tablet' },
    });

    expect(stopped.group).toBe('stopped');
    expect(planned.group).toBe('planned');
    expect(supplement.group).toBe('supplements');
    expect(matchesMedicationFilter(stopped, 'current')).toBe(false);
    expect(matchesMedicationFilter(planned, 'current')).toBe(false);
    expect(matchesMedicationFilter(supplement, 'current')).toBe(false);
  });

  it('lets a supplement the record cannot vouch for answer the review chip', () => {
    // The card badged this "needs review" while the chip counted it under
    // Supplements, so one screen disagreed with itself.
    const supplement = viewItem({
      resourceType: 'MedicationStatement',
      status: 'active',
      medicationCodeableConcept: { text: 'Vitamin D 25 MCG tablet' },
    });

    expect(needsReconciliationReview(supplement)).toBe(true);
    expect(matchesMedicationFilter(supplement, 'needsReview')).toBe(true);
    expect(matchesMedicationFilter(supplement, 'supplements')).toBe(true);
  });

  it('leaves a fully-described medication out of the review chip', () => {
    const item = viewItem({
      resourceType: 'MedicationStatement',
      status: 'active',
      medicationCodeableConcept: { text: 'Lisinopril 10 MG tablet' },
      extension: [
        {
          url: 'https://mere.health/fhir/StructureDefinition/medication-adherence',
          valueCodeableConcept: { coding: [{ code: 'taking-as-directed' }] },
        },
      ],
    });

    expect(item.group).toBe('current');
    expect(needsReconciliationReview(item)).toBe(false);
    expect(matchesMedicationFilter(item, 'needsReview')).toBe(false);
  });
});
