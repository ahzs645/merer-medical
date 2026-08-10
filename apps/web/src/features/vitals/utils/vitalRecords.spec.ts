import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { isVitalSignObservation } from './vitalRecords';

function observationDoc(
  raw: Record<string, unknown>,
  metadata: ClinicalDocument['metadata'] = {},
): ClinicalDocument {
  return {
    id: 'connection|user|manual:vital',
    connection_record_id: 'connection',
    user_id: 'user',
    data_record: {
      raw,
      format: 'FHIR.DSTU2',
      content_type: 'application/json',
      resource_type: 'observation',
      version_history: [],
    },
    metadata: {
      id: 'manual:vital',
      date: '2026-01-20T12:00:00.000Z',
      display_name: 'Body weight',
      ...metadata,
    },
  } as ClinicalDocument;
}

describe('isVitalSignObservation', () => {
  it('recognizes an observation categorised as vital-signs', () => {
    expect(
      isVitalSignObservation(
        observationDoc({
          resource: {
            resourceType: 'Observation',
            category: [
              {
                coding: [
                  {
                    system:
                      'http://terminology.hl7.org/CodeSystem/observation-category',
                    code: 'vital-signs',
                  },
                ],
              },
            ],
            code: { text: 'Body weight' },
          },
        }),
      ),
    ).toBe(true);
  });

  it('recognizes the singular CodeableConcept category shape', () => {
    expect(
      isVitalSignObservation(
        observationDoc({
          resource: {
            resourceType: 'Observation',
            category: { coding: [{ code: 'vital-signs' }] },
          },
        }),
      ),
    ).toBe(true);
  });

  it('recognizes a hand-entered vital saved before the builder wrote a category', () => {
    // The record an existing user already has: "Body weight 72 kg", typed by
    // hand, no category anywhere on the resource. Without this it stays
    // invisible on Vitals after the upgrade.
    expect(
      isVitalSignObservation(
        observationDoc({
          fullUrl: 'manual:1c0f',
          manual_kind: 'vital',
          resource: {
            resourceType: 'Observation',
            code: { text: 'Body weight' },
            valueQuantity: { value: 72, unit: 'kg' },
          },
        }),
      ),
    ).toBe(true);
  });

  it('leaves hand-entered labs on the Labs page', () => {
    expect(
      isVitalSignObservation(
        observationDoc(
          {
            fullUrl: 'manual:9ab2',
            manual_kind: 'lab',
            resource: {
              resourceType: 'Observation',
              code: { text: 'Ferritin' },
            },
          },
          { display_name: 'Ferritin' },
        ),
      ),
    ).toBe(false);
  });

  it('leaves dental and optometry entries on their own tabs', () => {
    // Tooth findings and IOP readings are stored as vital-kind observations
    // too; the category-less fallback must not drag them onto Vitals.
    const dentalFinding = observationDoc(
      {
        fullUrl: 'manual:44de',
        manual_kind: 'vital',
        resource: {
          resourceType: 'Observation',
          category: [{ text: 'dental' }],
        },
      },
      {
        display_name: 'Dental finding',
        manual_specialty: 'dental',
        manual_specialty_details: { specialty: 'dental', subtype: 'finding' },
      },
    );

    expect(isVitalSignObservation(dentalFinding)).toBe(false);
  });

  it('ignores a laboratory observation and non-observation records', () => {
    expect(
      isVitalSignObservation(
        observationDoc({
          resource: {
            resourceType: 'Observation',
            category: [{ coding: [{ code: 'laboratory' }] }],
          },
        }),
      ),
    ).toBe(false);

    const attachment = {
      ...observationDoc({ fullUrl: 'manual:77bc', manual_kind: 'vital' }),
    };
    attachment.data_record.resource_type = 'documentreference_attachment';

    expect(isVitalSignObservation(attachment)).toBe(false);
  });
});
