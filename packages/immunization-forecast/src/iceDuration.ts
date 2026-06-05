import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  parseISO,
} from 'date-fns';

import { IceDuration } from './types.js';

export type ParsedIceDurationPart = {
  value: number;
  unit: 'y' | 'm' | 'w' | 'd';
};

const durationPartPattern = /([+-]?\d+)\s*([YyMmWwDd])/g;

export function parseIceDuration(duration: IceDuration): ParsedIceDurationPart[] {
  const parts = [...duration.matchAll(durationPartPattern)].map((match) => ({
    value: Number(match[1]),
    unit: match[2].toLowerCase() as ParsedIceDurationPart['unit'],
  }));

  if (parts.length === 0) {
    throw new Error(`Unsupported ICE duration: ${duration}`);
  }

  return parts;
}

export function addIceDuration(date: Date, duration: IceDuration): Date {
  return parseIceDuration(duration).reduce((current, part) => {
    switch (part.unit) {
      case 'y':
        return addYears(current, part.value);
      case 'm':
        return addMonths(current, part.value);
      case 'w':
        return addWeeks(current, part.value);
      case 'd':
        return addDays(current, part.value);
    }
  }, date);
}

export function dateMeetsMinimumDuration({
  startDate,
  endDate,
  duration,
}: {
  startDate: string;
  endDate: string;
  duration: IceDuration;
}) {
  const minimumDate = addIceDuration(parseISO(startDate), duration);
  return differenceInCalendarDays(parseISO(endDate), minimumDate) >= 0;
}

export function dateFromIceDuration({
  startDate,
  duration,
}: {
  startDate: string;
  duration: IceDuration;
}) {
  return addIceDuration(parseISO(startDate), duration).toISOString().split('T')[0];
}
