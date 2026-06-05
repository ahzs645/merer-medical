import { addYears, differenceInCalendarDays, parseISO } from 'date-fns';

import { adultScheduleRules } from './schedules.js';
import {
  ForecastImmunization,
  ForecastInput,
  ForecastRecommendation,
  ForecastResult,
  ForecastScheduleRule,
} from './types.js';
import { inferVaccineGroup } from './vaccineGroups.js';

export function forecastImmunizations(input: ForecastInput): ForecastResult {
  const now = input.now ?? new Date();
  const rules = (input.rules ?? adultScheduleRules).filter(
    (rule) => rule.country === input.country,
  );

  return {
    recommendations: rules.map((rule) =>
      forecastRule({
        rule,
        immunizations: input.immunizations,
        now,
      }),
    ),
  };
}

function forecastRule({
  rule,
  immunizations,
  now,
}: {
  rule: ForecastScheduleRule;
  immunizations: ForecastImmunization[];
  now: Date;
}): ForecastRecommendation {
  const matching = immunizations
    .filter((immunization) => inferVaccineGroup(immunization) === rule.vaccineGroup)
    .filter((immunization) => immunization.status !== 'not-done')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const lastDoseDate = matching[0]?.date;
  const nextDueDate =
    lastDoseDate && rule.boosterIntervalYears
      ? addYears(parseISO(lastDoseDate), rule.boosterIntervalYears)
          .toISOString()
          .split('T')[0]
      : undefined;

  if (rule.minimumDoses && matching.length < rule.minimumDoses) {
    return {
      rule,
      status: matching.length === 0 ? 'due' : 'upcoming',
      lastDoseDate,
      nextDueDate,
      doseCount: matching.length,
      reason:
        matching.length === 0
          ? 'No matching doses found in the record.'
          : `Recorded ${matching.length} of ${rule.minimumDoses} expected doses.`,
    };
  }

  if (!nextDueDate) {
    return {
      rule,
      status: matching.length > 0 ? 'history' : 'due',
      lastDoseDate,
      nextDueDate,
      doseCount: matching.length,
      reason:
        matching.length > 0
          ? 'Dose history is present; timing depends on age and risk factors.'
          : 'No matching doses found in the record.',
    };
  }

  const daysUntilDue = differenceInCalendarDays(parseISO(nextDueDate), now);
  const status =
    daysUntilDue < 0 ? 'overdue' : daysUntilDue <= 90 ? 'upcoming' : 'complete';

  return {
    rule,
    status,
    lastDoseDate,
    nextDueDate,
    doseCount: matching.length,
    reason:
      status === 'complete'
        ? `Next routine booster is estimated for ${nextDueDate}.`
        : `Estimated next dose date is ${nextDueDate}.`,
  };
}
