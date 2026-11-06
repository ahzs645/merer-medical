import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { buildConditionBundles } from './buildBundles';

function doc(
  id: string,
  resourceType: string,
  resource: Record<string, unknown>,
  displayName?: string,
): ClinicalDocument {
  return {
    id: `conn|user|manual:${id}`,
    connection_record_id: 'conn',
    user_id: 'user',
    data_record: {
      raw: { fullUrl: `manual:${id}`, resource: { id, ...resource } },
      format: 'FHIR.DSTU2',
      content_type: 'application/json',
      resource_type: resourceType,
      version_history: [],
    },
    metadata: { id: `manual:${id}`, display_name: displayName },
  } as unknown as ClinicalDocument;
}

const bph = doc(
  'condition-bph',
  'condition',
  {
    code: {
      text: 'Benign prostatic hyperplasia with lower urinary tract symptoms',
    },
    clinicalStatus: 'active',
    extension: [
      {
        url: 'https://mere.health/fhir/StructureDefinition/condition-alias',
        valueString: 'Symptomatic prostatomegaly',
      },
    ],
    note: [
      {
        text: 'Urinary frequency and nocturia two to three times nightly.',
        time: '2026-10-20T12:00:00.000Z',
        authorString: 'Dr Saadiq — Mayo.pdf',
      },
      { text: 'Prostate weight 40 grams (N=20 grams).' },
    ],
  },
  'Benign prostatic hyperplasia with lower urinary tract symptoms',
);

function bundleFor(
  input: Partial<Parameters<typeof buildConditionBundles>[0]>,
) {
  return buildConditionBundles({
    conditions: [bph],
    medications: [],
    observations: [],
    procedures: [],
    carePlans: [],
    goals: [],
    connectionsById: new Map(),
    ...input,
  })[0];
}

describe('buildConditionBundles explicit links', () => {
  it('links a medication whose reasonReference points at the condition by id', () => {
    // A packaged condition keeps `manual:{id}` in metadata and the bare id on
    // the resource; the medication says `Condition/{id}`. All three must meet.
    const tamsulosin = doc('med-tamsulosin', 'medicationstatement', {
      medicationCodeableConcept: { text: 'tamsulosin' },
      reasonReference: [{ reference: 'Condition/condition-bph' }],
    });
    const related = bundleFor({ medications: [tamsulosin] }).related;
    expect(related).toHaveLength(1);
    expect(related[0]).toMatchObject({
      kind: 'medication',
      confidence: 'linked',
      reason: 'Prescribed for this condition',
    });
  });

  it('links by an alias when the reference only carries a display name', () => {
    const finasteride = doc('med-fin', 'medicationstatement', {
      medicationCodeableConcept: { text: 'finasteride' },
      reasonReference: [{ display: 'Symptomatic prostatomegaly' }],
    });
    expect(bundleFor({ medications: [finasteride] }).related[0]).toMatchObject({
      confidence: 'linked',
    });
  });

  it('ignores a reasonReference that points at something other than a condition', () => {
    const med = doc('med-x', 'medicationstatement', {
      medicationCodeableConcept: { text: 'something' },
      reasonReference: [{ reference: 'Observation/condition-bph' }],
    });
    expect(bundleFor({ medications: [med] }).related).toHaveLength(0);
  });

  it('puts referrals that name the condition under it', () => {
    const urology = doc(
      'referral-urology',
      'servicerequest',
      {
        code: { text: 'Local Urology surveillance' },
        reasonReference: [{ reference: 'Condition/condition-bph' }],
      },
      'Local Urology surveillance',
    );
    expect(bundleFor({ serviceRequests: [urology] }).related[0]).toMatchObject({
      kind: 'referral',
      confidence: 'linked',
    });
  });

  it('leaves individual CGM readings off the condition', () => {
    const diabetes = doc('condition-t2dm', 'condition', {
      code: { text: 'Type 2 diabetes mellitus' },
      clinicalStatus: 'active',
    });
    const reading = doc('libre|2026-05-11T00:05:11.000Z', 'observation', {
      category: { text: 'Continuous glucose monitoring' },
      code: {
        text: 'Interstitial glucose',
        coding: [{ system: 'http://loinc.org', code: '2339-0' }],
      },
    });
    const a1c = doc('lab-a1c', 'observation', {
      code: {
        text: 'Hemoglobin A1c',
        coding: [{ system: 'http://loinc.org', code: '4548-4' }],
      },
    });
    const [bundle] = buildConditionBundles({
      conditions: [diabetes],
      medications: [],
      observations: [reading, a1c],
      procedures: [],
      carePlans: [],
      goals: [],
      connectionsById: new Map(),
    });
    expect(bundle.related.map((r) => r.name)).toEqual(['Hemoglobin A1c']);
  });

  it("carries the condition's notes and aliases", () => {
    const bundle = bundleFor({});
    expect(bundle.aliases).toEqual(['Symptomatic prostatomegaly']);
    expect(bundle.notes).toEqual([
      {
        text: 'Urinary frequency and nocturia two to three times nightly.',
        time: '2026-10-20T12:00:00.000Z',
        author: 'Dr Saadiq — Mayo.pdf',
      },
      {
        text: 'Prostate weight 40 grams (N=20 grams).',
        author: undefined,
        time: undefined,
      },
    ]);
  });
});
