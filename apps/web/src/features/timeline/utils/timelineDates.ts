import { differenceInDays, format, parseISO } from 'date-fns';

export const checkIfDefaultDate = (date: string) =>
  differenceInDays(parseISO(date), new Date(0)) < 1;

export const formattedTitleDateMonthString = (dateKey: string) =>
  !dateKey || checkIfDefaultDate(dateKey)
    ? ''
    : format(parseISO(dateKey), 'MMM');

export const formattedTitleDateDayString = (dateKey: string) =>
  !dateKey || checkIfDefaultDate(dateKey)
    ? ''
    : format(parseISO(dateKey), 'dd');
