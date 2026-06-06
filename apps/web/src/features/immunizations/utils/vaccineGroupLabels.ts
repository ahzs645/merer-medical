import type { VaccineGroup } from '@mere/immunization-forecast';

/**
 * Friendly "common name (abbreviation/clinical name)" labels for each vaccine
 * group. The format follows the JAMIA study on patient-facing immunization
 * visualizations, which found lay users read records fastest and most
 * accurately when each immunization type is labelled with its common name plus
 * abbreviation and nothing else.
 *
 * See: Design of patient-facing immunization visualizations affects task
 * performance (J Am Med Inform Assoc, 2024).
 */
export const vaccineGroupLabels: Record<VaccineGroup, string> = {
  'covid-19': 'COVID-19',
  influenza: 'Influenza (flu)',
  'tdap-td': 'Tetanus, diphtheria, pertussis (Tdap/Td)',
  hpv: 'HPV (human papillomavirus)',
  zoster: 'Shingles (zoster)',
  mmr: 'Measles, mumps, rubella (MMR)',
  'hepatitis-a': 'Hepatitis A',
  'hepatitis-b': 'Hepatitis B',
  pneumococcal: 'Pneumococcal',
  meningococcal: 'Meningococcal',
  varicella: 'Chickenpox (varicella)',
  unknown: 'Other immunizations',
};

export function vaccineGroupLabel(group: VaccineGroup): string {
  return vaccineGroupLabels[group] ?? vaccineGroupLabels.unknown;
}
