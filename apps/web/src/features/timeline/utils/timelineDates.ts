import { differenceInDays, endOfDay, format, parseISO } from 'date-fns';

export const checkIfDefaultDate = (date: string) =>
  differenceInDays(parseISO(date), new Date(0)) < 1;

/**
 * The single normalized value the timeline groups, keys, sorts and anchors by:
 * the record's day **in the reader's own timezone**.
 *
 * Local, not UTC, because that is what a health record means to the person
 * reading it. A result stamped `2016-05-27T03:00:00Z` happened on the evening
 * of 26 May for someone in UTC-5, and filing it under the 27th would show them
 * a visit on a day they were not at the clinic. Local is also the only choice
 * that keeps a date-only record (`2016-05-27`, which carries no timezone and
 * is written from the patient's own point of view) on the date it literally
 * states — grouping by UTC day would slide those onto the previous day for
 * every reader east of Greenwich.
 *
 * `parseISO` reads a date-only string as local midnight, so both stored shapes
 * land on the same scale before the day is taken.
 */
export const timelineDateKey = (date: string) =>
  format(parseISO(date), 'yyyy-MM-dd');

/**
 * Newest first, over `timelineDateKey` values.
 *
 * The keys are fixed-width `yyyy-MM-dd`, so a plain string compare is calendar
 * order and a total order. Sorting anywhere else — in particular on the raw
 * stored `metadata.date` — is not consistent with the grouping: a
 * `2016-05-27T03:00:00Z` record groups under `2016-05-26` yet sorts ahead of a
 * bare `2016-05-27`, which put 26 May above 27 May in the jump rails.
 */
export const compareTimelineDateKeysDesc = (a: string, b: string) =>
  a < b ? 1 : a > b ? -1 : 0;

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
