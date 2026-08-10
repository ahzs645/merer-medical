import { differenceInDays, endOfDay, format, parseISO } from 'date-fns';

export const checkIfDefaultDate = (date: string) =>
  differenceInDays(parseISO(date), new Date(0)) < 1;

/**
 * Upper bound for "this day and everything older than it", as an ISO instant.
 *
 * Record dates are stored as ISO strings and both sorted and compared
 * lexicographically, so a `yyyy-MM-dd` jump target has to be widened to the
 * last instant of that local day before it can bound a query.
 */
export const timelineDateKeyUpperBound = (dateKey: string) =>
  endOfDay(parseISO(dateKey)).toISOString();

export const formattedTitleDateMonthString = (dateKey: string) =>
  !dateKey || checkIfDefaultDate(dateKey)
    ? ''
    : format(parseISO(dateKey), 'MMM');

export const formattedTitleDateDayString = (dateKey: string) =>
  !dateKey || checkIfDefaultDate(dateKey)
    ? ''
    : format(parseISO(dateKey), 'dd');
