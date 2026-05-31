import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { isLaboratoryObservation } from './useLabsData';

function observationDoc(overrides: Partial<ClinicalDocument> = {}) {
  return {
    id: 'connection|user|manual:lab',
    connection_record_id: 'connection',
    user_id: 'user',
    data_record: {
      raw: {
        resource: {
          resourceType: 'Observation',
          status: 'final',
          code: { text: 'Hemoglobin' },
        },
      },
      format: 'FHIR.DSTU2',
      content_type: 'application/json',
      resource_type: 'observation',
      version_history: [],
    },
    metadata: {
      id: 'manual:lab',
      date: '2026-01-20T12:00:00.000Z',
      display_name: 'Hemoglobin',
    },
    ...overrides,
  } as ClinicalDocument<any>;
}

describe('isLaboratoryObservation', () => {
  it('recognizes imported manual lab rows from diabetes emrpkg files', () => {
    expect(
      isLaboratoryObservation(
        observationDoc({
          data_record: {
            raw: {
              manual_kind: 'lab',
              resource: {
                resourceType: 'Observation',
                category: { text: 'Complete Blood Count' },
              },
            },
            format: 'FHIR.DSTU2',
            content_type: 'application/json',
            resource_type: 'observation',
            version_history: [],
          },
        }),
      ),
    ).toBe(true);
  });

  it('recognizes FHIR observations with a singular laboratory category', () => {
    expect(
      isLaboratoryObservation(
        observationDoc({
          data_record: {
            raw: {
              resource: {
                resourceType: 'Observation',
                category: {
                  coding: [{ code: 'laboratory', display: 'Laboratory' }],
                },
              },
            },
            format: 'FHIR.DSTU2',
            content_type: 'application/json',
            resource_type: 'observation',
            version_history: [],
          },
        }),
      ),
    ).toBe(true);
  });

  it('does not treat non-lab manual observations as labs', () => {
    expect(
      isLaboratoryObservation(
        observationDoc({
          data_record: {
            raw: {
              manual_kind: 'nutrition-relevance',
              resource: {
                resourceType: 'Observation',
                category: { text: 'Nutrition relevance' },
              },
            },
            format: 'FHIR.DSTU2',
            content_type: 'application/json',
            resource_type: 'observation',
            version_history: [],
          },
        }),
      ),
    ).toBe(false);
  });
});
