import * as fhirpath from 'fhirpath';

import { fhirPathFirst, fhirPathValues } from './fhirPathValues';

const observation = {
  resourceType: 'Observation',
  valueQuantity: { value: 5.4, unit: 'mmol/L' },
  valueCodeableConcept: {
    text: 'Positive',
    coding: [{ display: 'Detected' }, { code: 'X' }, { display: 'Present' }],
  },
  referenceRange: [
    {
      low: { value: 3.5, unit: 'mmol/L' },
      high: { value: 5.1 },
      text: '3.5-5.1',
    },
    { text: 'second range' },
  ],
  interpretation: { text: 'High' },
  comments: 'Fasting',
};

const allergy = {
  resourceType: 'AllergyIntolerance',
  substance: { text: 'Penicillin' },
  reaction: [
    { manifestation: [{ text: 'Hives' }, { text: 'Rash' }] },
    { manifestation: [{ text: 'Wheeze' }] },
  ],
};

/**
 * The replacement is only safe if it answers exactly as the evaluator did for
 * every path the app asks — so each is checked against fhirpath itself.
 */
describe('fhirPathValues agrees with fhirpath', () => {
  const cases: Array<[object, string]> = [
    [observation, 'referenceRange.text'],
    [observation, 'referenceRange.low'],
    [observation, 'referenceRange.high'],
    [observation, 'valueQuantity.unit'],
    [observation, 'valueQuantity.value'],
    [observation, 'valueString'],
    [observation, 'valueCodeableConcept.text'],
    [observation, 'valueCodeableConcept.coding.display'],
    [observation, 'dataAbsentReason.text'],
    [observation, 'dataAbsentReason.coding.code'],
    [observation, 'comments'],
    [observation, 'interpretation.text'],
    [allergy, 'reaction.manifestation.text'],
    [allergy, 'substance.text'],
    [allergy, 'code.text'],
  ];

  it.each(cases)('%#: %s', (resource, path) => {
    expect(fhirPathValues(resource, path)).toEqual(
      fhirpath.evaluate(resource, path),
    );
  });

  it('returns nothing for a missing resource', () => {
    expect(fhirPathValues(undefined, 'a.b')).toEqual([]);
    expect(fhirPathFirst(null, 'a')).toBeUndefined();
  });
});
