import { format, parseISO } from 'date-fns';
import { memo } from 'react';
import { Link } from 'react-router-dom';

import { checkIfDefaultDate } from '../../utils/timelineDates';

/**
 * Mobile counterpart to `JumpToPanel`, which is desktop-only: without it there
 * is no way to skip back through years of records on the device where
 * scrolling costs the most. A horizontal rail of years is the densest form
 * that fits a phone, so it lists years rather than every date.
 */
function YearJumpBarUnmemo({
  dateKeys,
  activeDateKey,
  onJumpToDate,
  seekingDateKey,
}: {
  /** Timeline date keys, newest first. */
  dateKeys: string[];
  activeDateKey?: string;
  /**
   * Loads the target period. Most years on the rail are not paged in yet, so
   * the plain anchor alone would scroll nowhere.
   */
  onJumpToDate?: (dateKey: string) => void;
  /** Date currently being fetched by a jump, if any. */
  seekingDateKey?: string;
}) {
  // One jump target per year: the first (newest) date in it.
  const years = new Map<string, string>();
  for (const dateKey of dateKeys) {
    if (checkIfDefaultDate(dateKey)) continue;
    const year = format(parseISO(dateKey), 'yyyy');
    if (!years.has(year)) {
      years.set(year, dateKey);
    }
  }

  if (years.size < 2) return null;

  const activeYear =
    activeDateKey && !checkIfDefaultDate(activeDateKey)
      ? format(parseISO(activeDateKey), 'yyyy')
      : undefined;

  return (
    <nav
      aria-label="Jump to year"
      className="scrollbar-hide flex flex-shrink-0 items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-3 lg:hidden"
    >
      <span className="me-1 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Jump to
      </span>
      {[...years.entries()].map(([year, dateKey]) => {
        const loading = seekingDateKey === dateKey;
        return (
          <Link
            key={year}
            to={`#${format(parseISO(dateKey), 'MMM-dd-yyyy')}`}
            aria-current={year === activeYear ? 'location' : undefined}
            aria-busy={loading || undefined}
            onClick={() => onJumpToDate?.(dateKey)}
            // The tap target stays 44px tall; the highlight does not. Painting
            // the selected year across the full target made a pill twice the
            // height of its own text, which read as a block of colour rather
            // than as "this is where you are".
            className="inline-flex min-h-[44px] flex-shrink-0 items-center px-0.5 text-sm font-medium"
          >
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 ${
                year === activeYear
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:text-primary-700'
              }`}
            >
              {year}
              {loading ? (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-600">
                  <span className="sr-only">Loading</span>
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export const YearJumpBar = memo(YearJumpBarUnmemo);
