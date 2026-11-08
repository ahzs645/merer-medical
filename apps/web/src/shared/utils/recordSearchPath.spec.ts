import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { buildResultsViewModel } from '../../features/results/utils/resultNormalization';
import { recordSearchPath } from './recordSearchPath';

function record(
  type: ClinicalDocument['data_record']['resource_type'],
  name: string,
): ClinicalDocument<any> {
  return {
    id: 'synthetic/record-1',
    user_id: 'synthetic-user',
    connection_record_id: 'synthetic-source',
    data_record: {
      resource_type: type,
      raw: { resource: {} },
      format: 'FHIR.R4',
      content_type: 'application/json',
      version_history: [],
    },
    metadata: { display_name: name, date: '2026-01-02T10:00:00Z' },
  };
}

describe('recordSearchPath', () => {
  it('opens the existing coded lab history, and supports an uncoded name containing a percent sign', () => {
    const lab = record('observation', 'Glucose');
    lab.metadata = {
      ...lab.metadata,
      manual_specialty: 'laboratory',
      loinc_coding: ['2345-7'],
    };
    expect(recordSearchPath(lab)).toBe('/records/labs/2345-7');
    lab.metadata = { manual_specialty: 'laboratory', display_name: 'PSA %' };
    expect(recordSearchPath(lab)).toBe('/records/labs/psa%20%25');
  });

  it('uses the document metadata identifier expected by the document detail route', () => {
    const document = record('documentreference', 'Synthetic report');
    document.metadata!.id = 'https://example.test/DocumentReference/123';
    expect(recordSearchPath(document)).toBe(
      '/records/documents/detail/https%3A%2F%2Fexample.test%2FDocumentReference%2F123',
    );
  });

  it('keeps a document without a metadata identifier reachable by its stored id', () => {
    expect(
      recordSearchPath(record('documentreference', 'Synthetic report')),
    ).toBe('/records/documents/detail/synthetic%2Frecord-1');
  });

  it('opens the exact timeline card for types without their own detail route', () => {
    expect(
      recordSearchPath(record('medicationstatement', 'Synthetic medication')),
    ).toBe(
      '/timeline?q=Synthetic%20medication#timeline-record-synthetic%2Frecord-1',
    );
  });

  it('does not promise an individual anchor in an unfiltered grouped timeline', () => {
    expect(recordSearchPath(record('medicationstatement', ''))).toBeUndefined();
  });

  it('opens a device in its searchable list even when it is undated', () => {
    const device = record('device', 'CGM [demo]');
    delete device.metadata!.date;
    expect(recordSearchPath(device)).toBe(
      '/records/devices?q=CGM%20%5Bdemo%5D',
    );
  });

  it('uses the provider name the Directory actually renders', () => {
    const provider = record('practitioner', 'Portal practitioner record 123');
    provider.data_record.raw = {
      resource: {
        resourceType: 'Practitioner',
        name: [{ text: 'Dr Ada Ray' }],
      },
    };
    delete provider.metadata!.date;
    expect(recordSearchPath(provider)).toBe(
      '/records/directory?q=Dr%20Ada%20Ray',
    );
  });

  it.each(['diagnosticreport', 'procedure'] as const)(
    'addresses an undated %s in the real Results detail map',
    (type) => {
      const document = record(type, 'Synthetic undated result');
      delete document.metadata!.date;
      const { detailsById } = buildResultsViewModel({
        clinicalDocuments: [document],
      });
      expect(detailsById.has(document.id)).toBe(true);
      expect(recordSearchPath(document)).toBe(
        '/records/results?result=synthetic%2Frecord-1',
      );
    },
  );

  it.each([
    ['encounter', '/records/encounters?q=Synthetic%20undated'],
    ['servicerequest', '/records/referrals?q=Synthetic%20undated'],
  ] as const)('uses a searchable list for an undated %s', (type, path) => {
    const document = record(type, 'Synthetic undated');
    delete document.metadata!.date;
    expect(recordSearchPath(document)).toBe(path);
  });

  it.each([
    'patient',
    'provenance',
    'location',
    'organization',
    'questionnaire',
  ] as const)(
    'does not promise a Timeline destination for unsupported %s rows',
    (type) =>
      expect(
        recordSearchPath(record(type, 'Synthetic record')),
      ).toBeUndefined(),
  );

  it('omits an undated generic record that cannot be rendered in Timeline', () => {
    const document = record(
      'medicationstatement',
      'Synthetic undated medication',
    );
    delete document.metadata!.date;
    expect(recordSearchPath(document)).toBeUndefined();
    document.metadata!.date = 'not a date';
    expect(recordSearchPath(document)).toBeUndefined();
  });
});
