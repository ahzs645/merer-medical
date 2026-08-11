import { format, parseISO } from 'date-fns';

export function safeFormatDate(
  date: string | undefined,
  formatStr: string,
  fallback = '',
): string {
  if (!date) return fallback;
  try {
    return format(parseISO(date), formatStr);
  } catch {
    return fallback || date;
  }
}

/**
 * The house date: "Apr 8, 2026". Every list, card and detail line that shows a
 * day should use this.
 *
 * It exists because the alternative kept being `date.split('T')[0]`, which is
 * quick to write and prints an ISO string — so the dental and optometry panels
 * read "2026-02-13" while the record they describe read "Feb 13, 2026" two
 * inches away. Same data, two formats, one screen.
 */
export function formatRecordDate(
  date: string | undefined,
  fallback = 'Undated',
): string {
  return safeFormatDate(date, 'PP', fallback);
}

/**
 * Rewrites bare `YYYY-MM-DD` runs inside prose to the house date.
 *
 * For text this app renders but does not author — the immunisation forecast
 * package builds "Estimated next dose date is 2025-10-22." in its own voice —
 * so the sentence lands in the same format as the field printed above it.
 */
export function humanizeIsoDatesInText(text: string): string {
  return text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, (match) =>
    safeFormatDate(match, 'PP', match),
  );
}

export function formatTime(date: string | undefined): string {
  return safeFormatDate(date, 'p');
}

export function formatDateAndTime(date: string | undefined): string {
  return safeFormatDate(date, 'PPp');
}

export function formatFullDate(date: string | undefined): string {
  return safeFormatDate(date, 'LLLL do yyyy', 'N/A');
}

export function formatFullDateWithTime(date: string | undefined): string {
  return safeFormatDate(date, "LLLL do yyyy 'at' h:mm a", 'N/A');
}
