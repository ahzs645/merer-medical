import { ForecastCountry, ForecastScheduleRule } from './types.js';

export const forecastCountries: Array<{
  code: ForecastCountry;
  label: string;
}> = [
  { code: 'CA', label: 'Canada' },
  { code: 'US', label: 'United States' },
];

export const adultScheduleRules: ForecastScheduleRule[] = [
  {
    id: 'ca-tdap-td',
    country: 'CA',
    vaccineGroup: 'tdap-td',
    vaccineName: 'Tetanus, diphtheria, pertussis',
    seriesLabel: 'Td/Tdap booster',
    minimumDoses: 1,
    boosterIntervalYears: 10,
    recommendedAgeText: 'Adults, then every 10 years',
    notes:
      'General Canadian adult schedule pattern. Provincial schedules and risk factors can differ.',
  },
  {
    id: 'ca-influenza',
    country: 'CA',
    vaccineGroup: 'influenza',
    vaccineName: 'Influenza',
    seriesLabel: 'Seasonal flu',
    boosterIntervalYears: 1,
    recommendedAgeText: 'Every year',
    notes: 'Annual seasonal vaccination is commonly recommended.',
  },
  {
    id: 'ca-covid',
    country: 'CA',
    vaccineGroup: 'covid-19',
    vaccineName: 'COVID-19',
    seriesLabel: 'COVID-19 booster',
    boosterIntervalYears: 1,
    recommendedAgeText: 'Current seasonal product when eligible',
    notes:
      'Eligibility changes by season, age, prior doses, pregnancy, and health risk.',
  },
  {
    id: 'ca-hpv',
    country: 'CA',
    vaccineGroup: 'hpv',
    vaccineName: 'HPV',
    seriesLabel: 'HPV series',
    minimumDoses: 2,
    recommendedAgeText: 'Adolescents and eligible adults',
    notes: 'Dose count depends on age at first dose and immune status.',
  },
  {
    id: 'ca-zoster',
    country: 'CA',
    vaccineGroup: 'zoster',
    vaccineName: 'Shingles',
    seriesLabel: 'Shingles series',
    minimumDoses: 2,
    recommendedAgeText: 'Adults 50+',
    notes: 'Often a 2-dose recombinant zoster vaccine series.',
  },
  {
    id: 'us-tdap-td',
    country: 'US',
    vaccineGroup: 'tdap-td',
    vaccineName: 'Tetanus, diphtheria, pertussis',
    seriesLabel: 'Td/Tdap booster',
    minimumDoses: 1,
    boosterIntervalYears: 10,
    recommendedAgeText: 'Adults, then every 10 years',
    notes: 'General CDC adult schedule pattern. Clinical context can change timing.',
  },
  {
    id: 'us-influenza',
    country: 'US',
    vaccineGroup: 'influenza',
    vaccineName: 'Influenza',
    seriesLabel: 'Seasonal flu',
    boosterIntervalYears: 1,
    recommendedAgeText: 'Every year',
    notes: 'Annual seasonal vaccination is commonly recommended.',
  },
  {
    id: 'us-covid',
    country: 'US',
    vaccineGroup: 'covid-19',
    vaccineName: 'COVID-19',
    seriesLabel: 'COVID-19 booster',
    boosterIntervalYears: 1,
    recommendedAgeText: 'Current seasonal product when eligible',
    notes:
      'Eligibility changes by season, age, prior doses, pregnancy, and health risk.',
  },
  {
    id: 'us-hpv',
    country: 'US',
    vaccineGroup: 'hpv',
    vaccineName: 'HPV',
    seriesLabel: 'HPV series',
    minimumDoses: 2,
    recommendedAgeText: 'Routine adolescence; catch-up when eligible',
    notes: 'Dose count depends on age at first dose and immune status.',
  },
  {
    id: 'us-zoster',
    country: 'US',
    vaccineGroup: 'zoster',
    vaccineName: 'Shingles',
    seriesLabel: 'Shingles series',
    minimumDoses: 2,
    recommendedAgeText: 'Adults 50+',
    notes: 'Often a 2-dose recombinant zoster vaccine series.',
  },
];
