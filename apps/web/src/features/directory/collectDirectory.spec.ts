import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { collectDirectory, parseFacility } from './collectDirectory';

function doc(
  id: string,
  resourceType: string,
  resource: Record<string, unknown>,
  date = '2026-01-02T12:00:00.000Z',
): ClinicalDocument {
  return {
    id,
    connection_record_id: 'conn-1',
    user_id: 'user-1',
    data_record: {
      raw: { resource },
      format: 'FHIR.R4',
      content_type: 'application/json',
      resource_type: resourceType,
      version_history: [],
    },
    metadata: { id, date },
  } as unknown as ClinicalDocument;
}

describe('collectDirectory', () => {
  /**
   * The page read `CareTeam.participant` and nothing else, so a library whose
   * lab rows, documents and dental records all printed a clinician's name
   * still showed "No providers recorded yet".
   */
  it('finds the clinician named as a report performer', () => {
    const { providers } = collectDirectory([
      doc('r1', 'diagnosticreport', {
        performer: [{ actor: { display: 'Ben Bora' } }],
      }),
    ]);
    expect(providers.map((p) => p.name)).toEqual(['Ben Bora']);
  });

  it('finds authors, recorders, requesters and asserters', () => {
    const { providers } = collectDirectory([
      doc('d1', 'documentreference', {
        author: [{ display: 'Dr. Author' }],
      }),
      doc('c1', 'condition', {
        recorder: { display: 'Dr. Recorder' },
        asserter: { display: 'Dr. Asserter' },
      }),
      doc('s1', 'servicerequest', {
        requester: { display: 'Dr. Requester' },
      }),
    ]);
    expect(providers.map((p) => p.name).sort()).toEqual([
      'Dr. Asserter',
      'Dr. Author',
      'Dr. Recorder',
      'Dr. Requester',
    ]);
  });

  it('still reads a CareTeam, with its roles and contacts', () => {
    const { providers } = collectDirectory([
      doc('ct1', 'careteam', {
        managingOrganization: [{ display: 'Oak Valley Community Hospital' }],
        participant: [
          {
            member: { display: 'Dr. Cardiology' },
            role: [{ text: 'Cardiologist' }],
            extension: [{ valueString: '555-0100' }],
          },
        ],
      }),
    ]);
    expect(providers[0]).toMatchObject({
      name: 'Dr. Cardiology',
      roles: ['Cardiologist'],
      organization: 'Oak Valley Community Hospital',
      contacts: ['555-0100'],
    });
  });

  it('counts records per person, and one record naming them twice once', () => {
    const { providers } = collectDirectory([
      doc('r1', 'diagnosticreport', {
        performer: [{ actor: { display: 'Ben Bora' } }],
        recorder: { display: 'Ben Bora' },
      }),
      doc('r2', 'diagnosticreport', {
        performer: [{ actor: { display: 'Ben Bora' } }],
      }),
      doc('r3', 'diagnosticreport', {
        performer: [{ actor: { display: 'Someone Else' } }],
      }),
    ]);
    const ben = providers.find((p) => p.name === 'Ben Bora');
    expect(ben?.recordCount).toBe(2);
    // Most-seen first, so the directory opens on the people you see most.
    expect(providers[0].name).toBe('Ben Bora');
  });

  it('keeps the most recent date a person appears on', () => {
    const { providers } = collectDirectory([
      doc(
        'r1',
        'diagnosticreport',
        { performer: [{ actor: { display: 'Ben Bora' } }] },
        '2024-05-01T00:00:00.000Z',
      ),
      doc(
        'r2',
        'diagnosticreport',
        { performer: [{ actor: { display: 'Ben Bora' } }] },
        '2026-04-08T00:00:00.000Z',
      ),
    ]);
    expect(providers[0].latestDate).toBe('2026-04-08T00:00:00.000Z');
  });

  it('gathers places from encounters, custodians and service providers', () => {
    const { facilities } = collectDirectory([
      doc('e1', 'encounter', {
        location: [{ location: { display: 'Smiles Family Dentistry' } }],
      }),
      doc('d1', 'documentreference', {
        custodian: { display: 'ClearView Optometry' },
      }),
      doc('e2', 'encounter', {
        serviceProvider: { display: 'Oak Valley Community Hospital' },
      }),
    ]);
    expect(facilities.map((f) => f.name).sort()).toEqual([
      'ClearView Optometry',
      'Oak Valley Community Hospital',
      'Smiles Family Dentistry',
    ]);
  });

  it('ignores a record that names nobody, rather than inventing a blank row', () => {
    const { providers, facilities } = collectDirectory([
      doc('o1', 'observation', { valueQuantity: { value: 5 } }),
      doc('o2', 'observation', { performer: [{ actor: { display: '  ' } }] }),
    ]);
    expect(providers).toEqual([]);
    expect(facilities).toEqual([]);
  });
});

describe('parseFacility', () => {
  it('splits a concatenated facility string into name, address and phone', () => {
    const facility = parseFacility(
      'Jasper Healthcare Centre Lab/DI 518 Robson Street Jasper, AB T0E 1E0 780-852-6606',
    );
    expect(facility.name).toBe('Jasper Healthcare Centre Lab/DI');
    expect(facility.address).toBe('518 Robson Street Jasper, AB T0E 1E0');
    expect(facility.phone).toBe('780-852-6606');
  });

  it('falls back to the raw string when there is nothing to split', () => {
    expect(parseFacility('Smiles Family Dentistry').name).toBe(
      'Smiles Family Dentistry',
    );
  });
});
