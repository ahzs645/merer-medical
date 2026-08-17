/* eslint-disable react/jsx-no-useless-fragment */
import { format, parseISO } from 'date-fns';
import { BundleEntry, FhirResource } from 'fhir/r2';
import React, {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { ClinicalDocument } from '../../../../models/clinical-document/ClinicalDocument.type';
import { Link } from 'react-router-dom';

const parseYear = (key: string) => {
    return format(parseISO(key), 'yyyy');
  },
  parseMonthDay = (key: string) => {
    return format(parseISO(key), 'MMM dd');
  },
  parseMonthDayYear = (key: string) => {
    return format(parseISO(key), 'MMM-dd-yyyy');
  };

export function JumpToPanel({
  items,
  dateKeys,
  isLoading = false,
  activeDateKey,
  onJumpToDate,
  seekingDateKey,
}: {
  items?: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]>;
  dateKeys?: string[];
  isLoading: boolean;
  activeDateKey?: string;
  /**
   * Loads the target period. The rail lists every date on record, most of
   * which are not paged in yet, so the plain anchor alone would scroll
   * nowhere.
   */
  onJumpToDate?: (dateKey: string) => void;
  /** Date currently being fetched by a jump, if any. */
  seekingDateKey?: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null),
    linkRefs = useRef(new Map<string, HTMLAnchorElement>()),
    pauseAutoFollowUntil = useRef(0);

  const list = useMemo(() => {
    if (dateKeys) return dateKeys.map((key) => [key] as [string]);
    if (items) return Object.entries(items);
    else return undefined;
  }, [dateKeys, items]);

  const pauseAutoFollow = useCallback(() => {
    pauseAutoFollowUntil.current = Date.now() + 1500;
  }, []);

  useEffect(() => {
    if (!activeDateKey || Date.now() < pauseAutoFollowUntil.current) {
      return;
    }

    linkRefs.current.get(activeDateKey)?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
  }, [activeDateKey]);

  return (
    // A landmark, not a plain box: this rail carries one tab stop per date on
    // record — twenty-odd of them before the timeline itself — and naming it as
    // navigation is what lets a screen reader jump the whole thing in one move.
    <nav
      ref={panelRef}
      aria-label="Jump to date"
      className="scrollbar-hide sticky top-0 hidden h-full min-h-full w-0 flex-col overflow-y-scroll border-gray-200 bg-gray-50 text-slate-800 lg:flex lg:w-auto lg:border-r-2"
      onTouchStart={pauseAutoFollow}
      onWheel={pauseAutoFollow}
    >
      <p className="sticky top-0 me-2 h-10 whitespace-nowrap bg-gray-50 p-2 font-bold">
        Jump To
      </p>
      {isLoading ? (
        <Skeleton />
      ) : (
        <ul className="relative pb-[45vh]">
          <div className="absolute bottom-[45vh] start-5 top-0 w-px bg-gray-200" />
          {list &&
            list.map(([key], index, elements) => (
              <Fragment key={key}>
                {index === 0 ? (
                  <li className="sticky top-10 z-10 bg-gray-50 p-1 ps-2">
                    {parseYear(key)}
                  </li>
                ) : null}
                <DateLink
                  active={activeDateKey === key}
                  date={key}
                  linkRefs={linkRefs}
                  onJumpToDate={onJumpToDate}
                  loading={seekingDateKey === key}
                />
                <YearHeader
                  nextYear={elements[index + 1]?.[0]}
                  currentYear={key}
                />
              </Fragment>
            ))}
        </ul>
      )}
    </nav>
  );
}

function YearHeaderUnmemo({
  currentYear,
  nextYear,
}: {
  currentYear: string;
  nextYear: string;
}) {
  return (
    // Only show year header if the next item is not in the same year
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <>
      {nextYear && parseYear(nextYear) !== parseYear(currentYear) ? (
        <li className="sticky top-10 z-10 bg-gray-50 p-1 ps-2">
          {parseYear(nextYear)}
        </li>
      ) : null}
    </>
  );
}

const YearHeader = memo(YearHeaderUnmemo);

function LinkUnmemo({
  active,
  date,
  linkRefs,
  onJumpToDate,
  loading = false,
}: {
  active: boolean;
  date: string;
  linkRefs: React.MutableRefObject<Map<string, HTMLAnchorElement>>;
  onJumpToDate?: (dateKey: string) => void;
  loading?: boolean;
}) {
  if (date) {
    return (
      <li className="relative flex min-h-[28px] items-center ps-10 pe-3 text-xs font-thin hover:underline">
        <span
          className={`absolute start-[17px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border ${
            loading
              ? 'animate-pulse border-primary-700 bg-primary-300'
              : active
                ? 'border-primary-700 bg-primary-700'
                : 'border-gray-300 bg-gray-50'
          }`}
        />
        <Link
          ref={(node) => {
            if (node) {
              linkRefs.current.set(date, node);
            } else {
              linkRefs.current.delete(date);
            }
          }}
          className={
            active
              ? 'flex min-h-[28px] flex-1 items-center whitespace-nowrap font-semibold text-primary-700'
              : 'flex min-h-[28px] flex-1 items-center whitespace-nowrap text-slate-700 hover:text-primary-700'
          }
          aria-busy={loading || undefined}
          onClick={() => onJumpToDate?.(date)}
          to={`#${parseMonthDayYear(date)}`}
        >
          {parseMonthDay(date)}
        </Link>
        {loading ? (
          <span className="ms-2 text-[10px] uppercase tracking-wide text-primary-700">
            Loading
          </span>
        ) : null}
      </li>
    );
  }
  return null;
}

const DateLink = memo(LinkUnmemo);

function SkeletonUnmemo() {
  return (
    <ul>
      {[...Array(50)].map((_, index) => (
        <li key={index}>
          <div className="flex h-4 animate-pulse flex-row items-center pt-5 ">
            <div className="ms-4 h-3 w-12 rounded-md bg-gray-100 p-1 "></div>
          </div>
        </li>
      ))}
    </ul>
  );
}

const Skeleton = memo(SkeletonUnmemo);
