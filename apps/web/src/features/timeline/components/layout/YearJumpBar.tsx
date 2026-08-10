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
}: {
  /** Timeline date keys, newest first. */
  dateKeys: string[];
  activeDateKey?: string;
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
      {[...years.entries()].map(([year, dateKey]) => (
        <Link
          key={year}
          to={`#${format(parseISO(dateKey), 'MMM-dd-yyyy')}`}
          aria-current={year === activeYear ? 'location' : undefined}
          className={`inline-flex min-h-[44px] flex-shrink-0 items-center rounded-md px-3 text-sm font-medium ${
            year === activeYear
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-600 hover:text-primary-700'
          }`}
        >
          {year}
        </Link>
      ))}
    </nav>
  );
}

export const YearJumpBar = memo(YearJumpBarUnmemo);
