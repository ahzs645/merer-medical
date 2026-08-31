import { normalizeMedicationDocument } from './medicationNormalizer';
import { toMedicationViewItem } from './medicationViewModel';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

const ADHERENCE_EXTENSION =
  'https://mere.health/fhir/StructureDefinition/medication-adherence';

function medicationDocument(resource: Record<string, unknown>) {
  return {
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
      display_name: 'Finasteride',
      loinc_coding: [],
    },
  } as unknown as ClinicalDocument;
}

function adherenceExtension(code: string) {
  return [
    {
      url: ADHERENCE_EXTENSION,
      valueCodeableConcept: { coding: [{ code }] },
    },
  ];
}

describe('medication adherence', () => {
  /**
   * The manual builder states adherence on an extension. Before it was read,
   * every transposed medication normalized to `unknown`, became `needs-review`,
   * and — because Needs review is bucketed ahead of an active status — an
   * imported medication list showed Current: 0 with every drug marked active.
   */
  it('reads adherence the builder stated rather than inferring unknown', () => {
    const item = normalizeMedicationDocument(
      medicationDocument({
        resourceType: 'MedicationStatement',
        status: 'active',
        medicationCodeableConcept: { text: 'Finasteride' },
        extension: adherenceExtension('taking-as-directed'),
      }),
    );

    expect(item?.adherence).toBe('taking-as-prescribed');
    expect(item?.reconciliationState).not.toBe('needs-review');
    expect(toMedicationViewItem(item!).group).toBe('current');
  });

  it('maps the builder not-taking codes onto the reader vocabulary', () => {
    for (const code of ['not-taking', 'patient-not-taking']) {
      const item = normalizeMedicationDocument(
        medicationDocument({
          resourceType: 'MedicationStatement',
          status: 'active',
          medicationCodeableConcept: { text: 'Finasteride' },
          extension: adherenceExtension(code),
        }),
      );
      expect(item?.adherence).toBe('not-taking');
      expect(item?.reconciliationState).toBe('patient-says-not-taking');
    }
  });

  it('leaves codes with no counterpart to the status buckets', () => {
    const item = normalizeMedicationDocument(
      medicationDocument({
        resourceType: 'MedicationStatement',
        status: 'intended',
        medicationCodeableConcept: { text: 'Finasteride' },
        extension: adherenceExtension('not-yet-started'),
      }),
    );

    expect(item?.adherence).toBe('unknown');
    expect(toMedicationViewItem(item!).group).toBe('planned');
  });

  it('still falls back to note prose when no extension is present', () => {
    const item = normalizeMedicationDocument(
      medicationDocument({
        resourceType: 'MedicationStatement',
        status: 'active',
        medicationCodeableConcept: { text: 'Finasteride' },
        note: [{ text: 'Patient reports not taking this.' }],
      }),
    );

    expect(item?.adherence).toBe('not-taking');
  });
});
