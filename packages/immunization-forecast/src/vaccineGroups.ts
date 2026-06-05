import { ForecastImmunization, VaccineGroup } from './types.js';

const vaccineMatchers: Array<[VaccineGroup, RegExp]> = [
  ['covid-19', /covid|sars-cov-2|comirnaty|spikevax|novavax/i],
  ['influenza', /influenza|flu\b|fluzone|flulaval|fluarix/i],
  ['tdap-td', /tdap|td\b|tetanus|diphtheria|pertussis|boostrix|adacel/i],
  ['hpv', /hpv|human papillomavirus|gardasil/i],
  ['zoster', /zoster|shingrix|shingles/i],
  ['mmr', /mmr|measles|mumps|rubella/i],
  ['hepatitis-b', /hepatitis b|hep b|hbv/i],
  ['hepatitis-a', /hepatitis a|hep a|hav/i],
  ['pneumococcal', /pneumococcal|prevnar|pneumovax|pcv|ppsv/i],
  ['meningococcal', /meningococcal|meningitis|menactra|menveo|bexsero/i],
  ['varicella', /varicella|chickenpox/i],
];

export function inferVaccineGroup(
  immunization: Pick<ForecastImmunization, 'vaccineCode' | 'vaccineName'>,
): VaccineGroup {
  const text = [immunization.vaccineCode, immunization.vaccineName]
    .filter(Boolean)
    .join(' ');

  for (const [group, matcher] of vaccineMatchers) {
    if (matcher.test(text)) return group;
  }

  return 'unknown';
}
