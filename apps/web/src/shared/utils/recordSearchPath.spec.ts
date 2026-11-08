import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
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
    metadata: { display_name: name },
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

  it('keeps an untitled record reachable by its exact timeline anchor', () => {
    expect(recordSearchPath(record('encounter', ''))).toBe(
      '/timeline#timeline-record-synthetic%2Frecord-1',
    );
  });
});
