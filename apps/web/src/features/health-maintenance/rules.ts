/**
 * Preventive-care ("health maintenance") rules. Each rule decides whether it
 * applies to a patient (age/sex), how often it recurs, and which records count
 * as completing it. The engine then derives a due / overdue / up-to-date state.
 *
 * Schedules are simplified, general-population guidance for demonstration —
 * not a substitute for your clinician's recommendations.
 */

export type Sex = 'male' | 'female' | 'any';

export interface MaintenanceRule {
  id: string;
  title: string;
  category: 'Immunization' | 'Screening' | 'Check-up';
  info: string;
  minAge?: number;
  maxAge?: number;
  sex?: Sex;
  /** Recurrence in months; omit for one-time items. */
  cadenceMonths?: number;
  immunizationKeywords?: string[];
  labLoinc?: string[];
  procedureKeywords?: string[];
}

export const MAINTENANCE_RULES: MaintenanceRule[] = [
  {
    id: 'influenza',
    title: 'Influenza vaccine',
    category: 'Immunization',
    info: 'Recommended every flu season for almost everyone 6 months and older.',
    minAge: 0,
    cadenceMonths: 12,
    immunizationKeywords: ['influenza', 'flu'],
  },
  {
    id: 'covid',
    title: 'COVID-19 vaccine',
    category: 'Immunization',
    info: 'Stay up to date with the recommended COVID-19 vaccine schedule.',
    minAge: 0,
    cadenceMonths: 12,
    immunizationKeywords: ['covid'],
  },
  {
    id: 'tdap',
    title: 'Tdap / tetanus booster',
    category: 'Immunization',
    info: 'A Tdap booster is recommended at age 11–12, then a Td/Tdap every 10 years.',
    minAge: 11,
    cadenceMonths: 120,
    immunizationKeywords: ['tdap', 'tetanus', 'td '],
  },
  {
    id: 'hpv',
    title: 'HPV vaccination',
    category: 'Immunization',
    info: 'The HPV vaccine series is routinely recommended starting at age 11–12.',
    minAge: 11,
    maxAge: 26,
    immunizationKeywords: ['hpv', 'papilloma'],
  },
  {
    id: 'meningococcal',
    title: 'Meningococcal vaccine',
    category: 'Immunization',
    info: 'MenACWY is recommended at age 11–12 with a booster at 16.',
    minAge: 11,
    maxAge: 23,
    immunizationKeywords: ['meningococcal', 'menacwy', 'menquadfi'],
  },
  {
    id: 'hepb',
    title: 'Hepatitis B vaccination',
    category: 'Immunization',
    info: 'A complete hepatitis B series is recommended for all ages.',
    minAge: 0,
    immunizationKeywords: ['hep b', 'hepb', 'hepatitis b'],
  },
  {
    id: 'lipids',
    title: 'Lipid (cholesterol) screening',
    category: 'Screening',
    info: 'Lipid screening is recommended once between ages 9–11, then periodically.',
    minAge: 9,
    cadenceMonths: 60,
    labLoinc: ['2093-3', '2085-9', '2571-8', '13457-7', '18262-6'],
  },
  {
    id: 'dental',
    title: 'Dental exam & cleaning',
    category: 'Check-up',
    info: 'A routine dental exam and cleaning is generally recommended every 6 months.',
    minAge: 1,
    cadenceMonths: 6,
    procedureKeywords: ['dental', 'cleaning', 'scaling', 'periodontal'],
  },
  {
    id: 'wellvisit',
    title: 'Well-child / annual check-up (BMI)',
    category: 'Check-up',
    info: 'An annual check-up tracks growth, BMI and development.',
    minAge: 0,
    cadenceMonths: 12,
    labLoinc: ['39156-5'],
  },
  {
    id: 'bp',
    title: 'Blood pressure check',
    category: 'Screening',
    info: 'Blood pressure should be measured at least once a year from age 3.',
    minAge: 3,
    cadenceMonths: 12,
    labLoinc: ['8480-6', '8462-4', '85354-9'],
  },
];

export type ReminderStatus = 'overdue' | 'due' | 'up-to-date' | 'complete';

export interface Reminder {
  rule: MaintenanceRule;
  status: ReminderStatus;
  lastDate?: string;
  /** Next date it will be due (recurring, up-to-date only). */
  nextDue?: string;
  /** Human "how overdue / when due" line. */
  summary: string;
}

function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function appliesToPatient(
  rule: MaintenanceRule,
  age: number,
  sex: Sex,
): boolean {
  if (rule.minAge !== undefined && age < rule.minAge) return false;
  if (rule.maxAge !== undefined && age > rule.maxAge) return false;
  if (rule.sex && rule.sex !== 'any' && rule.sex !== sex) return false;
  return true;
}

/**
 * Evaluate one rule against the latest matching record date (or undefined).
 */
export function evaluateReminder(
  rule: MaintenanceRule,
  lastDate: string | undefined,
  now: Date,
): Reminder {
  const last = lastDate ? new Date(lastDate) : undefined;

  if (!rule.cadenceMonths) {
    // One-time item.
    if (last) {
      return {
        rule,
        status: 'complete',
        lastDate,
        summary: `Completed ${formatShort(last)}`,
      };
    }
    return { rule, status: 'due', summary: 'Recommended — no record found' };
  }

  if (!last) {
    return { rule, status: 'due', summary: 'No record found' };
  }

  const elapsed = monthsBetween(last, now);
  if (elapsed >= rule.cadenceMonths) {
    const overdueBy = elapsed - rule.cadenceMonths;
    return {
      rule,
      status: 'overdue',
      lastDate,
      summary:
        overdueBy <= 0
          ? `Due now — last ${formatShort(last)}`
          : `Overdue by ${formatDuration(overdueBy)} — last ${formatShort(last)}`,
    };
  }

  const nextDue = addMonths(last, rule.cadenceMonths);
  return {
    rule,
    status: 'up-to-date',
    lastDate,
    nextDue: nextDue.toISOString(),
    summary: `Up to date — next due ${formatShort(nextDue)}`,
  };
}

function formatShort(date: Date): string {
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
  });
}

function formatDuration(months: number): string {
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem ? `${years}y ${rem}m` : `${years}y`;
  }
  return `${months}m`;
}
