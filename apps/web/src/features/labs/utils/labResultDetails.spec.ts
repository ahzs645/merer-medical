import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { getLabGroupInsight, getLabResultDetail } from './labResultDetails';

function lab(
  id: string,
  resource: any,
  metadata: ClinicalDocument['metadata'] = {},
): ClinicalDocument<any> {
  return {
    id,
    user_id: 'user-1',
    connection_record_id: 'connection-1',
    data_record: {
      raw: { resource },
      format: 'FHIR.DSTU2',
      content_type: 'application/json',
      resource_type: 'observation',
      version_history: [],
    },
    metadata: {
      id,
      date: '2026-01-01',
      display_name: 'Hemoglobin',
      ...metadata,
    },
  };
}

describe('labResultDetails', () => {
  it('prefers interpretation flags and provider comments when present', () => {
    const detail = getLabResultDetail(
      lab('lab-1', {
        code: { text: 'Hemoglobin' },
        valueQuantity: { value: 181, unit: 'g/L' },
        referenceRange: [{ text: '135-175 g/L' }],
        interpretation: {
          text: 'High',
          coding: [{ code: 'H', display: 'High' }],
        },
        comments: 'Reviewed by provider.',
        performer: [{ display: 'AHS Calgary Lab' }],
        accessionIdentifier: { value: 'ACC-123' },
      }),
    );

    expect(detail.status).toBe('high');
    expect(detail.statusLabel).toBe('High');
    expect(detail.comments).toEqual(['Reviewed by provider.']);
    expect(detail.performer).toBe('AHS Calgary Lab');
    expect(detail.accessionId).toBe('ACC-123');
  });

  it('falls back to numeric reference range comparison', () => {
    const low = getLabResultDetail(
      lab('lab-2', {
        valueQuantity: { value: 3.1, unit: 'mmol/L' },
        referenceRange: [{ low: { value: 3.5 }, high: { value: 5.0 } }],
      }),
    );

    expect(low.status).toBe('low');
    expect(low.statusLabel).toBe('Low');
  });

  it('summarizes a lab group for the detail page', () => {
    const group = {
      key: 'hemoglobin',
      name: 'Hemoglobin',
      labs: [
        lab('lab-1', {
          valueQuantity: { value: 181, unit: 'g/L' },
          referenceRange: [{ low: { value: 135 }, high: { value: 175 } }],
          note: [{ text: 'Repeat test ordered.' }],
          performer: [{ display: 'AHS Calgary Lab' }],
        }),
        lab('lab-2', {
          valueQuantity: { value: 120, unit: 'g/L' },
          referenceRange: [{ low: { value: 135 }, high: { value: 175 } }],
          performer: [{ display: 'AHS Edmonton Lab' }],
        }),
      ],
    };

    const insight = getLabGroupInsight(group);

    expect(insight.highCount).toBe(1);
    expect(insight.lowCount).toBe(1);
    expect(insight.abnormalCount).toBe(2);
    expect(insight.commentedCount).toBe(1);
    expect(insight.distinctPerformers).toEqual([
      'AHS Calgary Lab',
      'AHS Edmonton Lab',
    ]);
  });
});
