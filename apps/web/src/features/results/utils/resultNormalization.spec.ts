import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { buildResultsViewModel } from './resultNormalization';

describe('buildResultsViewModel', () => {
  it('maps laboratory observations to lab result summaries with references', () => {
    const lab = createDocument({
      id: 'lab-1',
      resourceType: 'observation',
      displayName: 'Hemoglobin',
      date: '2026-05-01T12:00:00Z',
      resource: {
        resourceType: 'Observation',
        id: 'obs-1',
        status: 'final',
        category: [{ coding: [{ code: 'laboratory' }] }],
        code: {
          text: 'Hemoglobin',
          coding: [{ system: 'http://loinc.org', code: '718-7' }],
        },
        effectiveDateTime: '2026-05-01T12:00:00Z',
        valueQuantity: { value: 120, unit: 'g/L' },
        referenceRange: [{ text: '135-175 g/L' }],
      },
    });

    const viewModel = buildResultsViewModel({
      clinicalDocuments: [lab],
      referenceContext: { ageYears: 40, sex: 'male' },
    });
    const result = viewModel.groups[0].results[0];
    const detail = viewModel.detailsById.get(result.detailId);

    expect(result.type).toBe('lab');
    expect(result.title).toBe('Hemoglobin');
    expect(detail?.labEvaluation?.sourceReferenceRange).toBe('135-175 g/L');
    expect(detail?.labOverlays?.map((overlay) => overlay.mode)).toContain(
      'canadian',
    );
  });

  it('links diagnostic reports back to referenced observations', () => {
    const lab = createDocument({
      id: 'lab-1',
      resourceType: 'observation',
      displayName: 'Hemoglobin',
      date: '2026-05-01T12:00:00Z',
      resource: {
        resourceType: 'Observation',
        id: 'obs-1',
        status: 'final',
        category: [{ coding: [{ code: 'laboratory' }] }],
        code: { text: 'Hemoglobin' },
        valueQuantity: { value: 120, unit: 'g/L' },
      },
    });
    const report = createDocument({
      id: 'report-1',
      resourceType: 'diagnosticreport',
      displayName: 'CBC final',
      date: '2026-05-01T13:00:00Z',
      resource: {
        resourceType: 'DiagnosticReport',
        id: 'report-resource-1',
        status: 'final',
        code: { text: 'CBC final' },
        result: [{ reference: 'Observation/obs-1' }],
      },
    });

    const viewModel = buildResultsViewModel({
      clinicalDocuments: [lab, report],
    });
    const labSummary = viewModel.groups
      .flatMap((group) => group.results)
      .find((result) => result.id === 'lab-1');
    const detail = labSummary
      ? viewModel.detailsById.get(labSummary.detailId)
      : undefined;

    expect(detail?.reports).toHaveLength(1);
    expect(detail?.reports?.[0].displayName).toBe('CBC final');
    expect(detail?.linkedDocuments.map((doc) => doc.id)).toContain('report-1');
  });

  it('maps imaging reports and preserves metadata-only state', () => {
    const imaging = createDocument({
      id: 'imaging-1',
      resourceType: 'diagnosticreport',
      displayName: 'MR Knee Right',
      date: '2026-05-02T10:00:00Z',
      resource: {
        resourceType: 'DiagnosticReport',
        id: 'rad-1',
        status: 'final',
        category: [{ coding: [{ code: 'RAD', display: 'Radiology' }] }],
        code: { text: 'MR Knee Right' },
      },
    });

    const viewModel = buildResultsViewModel({
      clinicalDocuments: [imaging],
    });
    const summary = viewModel.groups[0].results[0];
    const detail = viewModel.detailsById.get(summary.detailId);

    expect(summary.type).toBe('imaging');
    expect(summary.metadataOnly).toBe(true);
    expect(detail?.title).toBe('MR Knee Right');
  });
});

function createDocument({
  id,
  resourceType,
  displayName,
  date,
  resource,
}: {
  id: string;
  resourceType: ClinicalDocument['data_record']['resource_type'];
  displayName: string;
  date: string;
  resource: any;
}): ClinicalDocument<any> {
  return {
    id,
    connection_record_id: 'connection-1',
    user_id: 'user-1',
    data_record: {
      raw: { resource },
      format: 'FHIR.R4',
      content_type: 'application/json',
      resource_type: resourceType,
      version_history: [],
    },
    metadata: {
      id: resource.id,
      date,
      display_name: displayName,
      source_name: 'Test Clinic',
    },
  };
}
