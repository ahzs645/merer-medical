import { buildRecordProvenance } from './provenance';
import {
  entryMethodLabel,
  mappingLabel,
  readOnlyReason,
  sourceTypeLabel,
} from './provenanceLabels';

/**
 * The document detail printed the stored values — `Source type: manual`,
 * `Entry method: manual-entry`, `Mapping: manual` — under a banner reading
 * "Synced from a connected source — edit it there". Four of six fields were
 * internal codes, and the reader who parsed them was told the opposite of the
 * sentence above.
 */
describe('provenance labels', () => {
  it('says how a record arrived in words', () => {
    expect(entryMethodLabel('portal-sync')).toBe(
      'Synced from a patient portal',
    );
    expect(entryMethodLabel('manual-entry')).toBe('Entered by hand');
    expect(entryMethodLabel('file-import')).toBe('Imported from a file');
    expect(entryMethodLabel(undefined)).toBeUndefined();
  });

  it('leaves an unknown mapping unsaid rather than printing "unknown"', () => {
    expect(mappingLabel('source')).toBe('Kept as the source wrote it');
    expect(mappingLabel('unknown')).toBeUndefined();
    expect(mappingLabel(undefined)).toBeUndefined();
  });

  it('keeps a vendor name and drops the one value that is not a source', () => {
    // "How it arrived" already says it, and the grid printed it twice.
    expect(sourceTypeLabel('manual')).toBeUndefined();
    expect(sourceTypeLabel('epic')).toBe('epic');
    expect(sourceTypeLabel(undefined)).toBeUndefined();
  });
});

describe('readOnlyReason', () => {
  it('only offers "edit it there" for a record that came from a portal', () => {
    expect(readOnlyReason('portal-sync')).toContain('edit it there');
    expect(readOnlyReason(undefined)).toContain('edit it there');
  });

  it('says a file was imported rather than synced', () => {
    // The demo's consent form arrived in a package and was never near a
    // portal, yet carried the portal advice.
    expect(readOnlyReason('file-import')).toBe(
      'Imported from a file — Mere keeps it as it arrived',
    );
    expect(readOnlyReason('manual-entry')).toBe(
      'Imported from a file — Mere keeps it as it arrived',
    );
    expect(readOnlyReason('device-import')).toBe(
      'Imported from a device — Mere keeps it as it arrived',
    );
  });
});

/**
 * `buildRecordProvenance` used to answer differently depending on whether the
 * caller happened to have the connection: with it the demo's consent form was
 * `manual`, without it `portal-sync`. The panel had the connection and the
 * read-only note did not, so one said "Entered by hand" while the other, an
 * inch above, said "Synced from a connected source — edit it there".
 */
describe('buildRecordProvenance without a connection', () => {
  const document = {
    id: 'dental-demo-connection|user|demo:demo-ortho-consent-2026',
    connection_record_id: 'dental-demo-connection',
    user_id: 'user',
    data_record: {
      raw: { resource: { resourceType: 'DocumentReference' } },
      format: 'FHIR.DSTU2',
      content_type: 'application/json',
      resource_type: 'documentreference',
      version_history: [],
    },
    metadata: {
      id: 'demo:demo-ortho-consent-2026',
      date: '2026-03-20T12:00:00.000Z',
      display_name: 'Orthodontic informed consent and financial agreement',
      manual_specialty: 'dental',
    },
  } as unknown as Parameters<typeof buildRecordProvenance>[0];

  it('reads the record’s own manual marker', () => {
    expect(buildRecordProvenance(document).entryMethod).toBe('manual-entry');
  });

  it('gives the same answer with and without the connection', () => {
    expect(buildRecordProvenance(document).entryMethod).toBe(
      buildRecordProvenance(document, { source: 'manual' }).entryMethod,
    );
  });

  it('so the read-only note stops offering a portal that never held it', () => {
    expect(
      readOnlyReason(buildRecordProvenance(document).entryMethod),
    ).not.toContain('edit it there');
  });
});
