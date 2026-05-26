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
  isLoading = false,
  activeDateKey,
}: {
  items?: Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]>;
  isLoading: boolean;
  activeDateKey?: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null),
    linkRefs = useRef(new Map<string, HTMLAnchorElement>()),
    pauseAutoFollowUntil = useRef(0);

  const list = useMemo(() => {
    if (items) return Object.entries(items);
    else return undefined;
  }, [items]);

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
    <div
      ref={panelRef}
      className="scrollbar-hide sticky top-0 hidden h-full min-h-full w-0 flex-col overflow-y-scroll border-gray-200 bg-gray-50 text-slate-800 lg:flex lg:w-auto lg:border-r-2"
      onTouchStart={pauseAutoFollow}
      onWheel={pauseAutoFollow}
    >
      <p className="sticky top-0 mr-2 h-10 whitespace-nowrap bg-gray-50 p-2 font-bold">
        Jump To
      </p>
      {isLoading ? (
        <Skeleton />
      ) : (
        <ul className="relative pb-[45vh]">
          <div className="absolute bottom-[45vh] left-5 top-0 w-px bg-gray-200" />
          {list &&
            list.map(([key], index, elements) => (
              <Fragment key={key}>
                {index === 0 ? (
                  <li className="sticky top-10 z-10 bg-gray-50 p-1 pl-2">
                    {parseYear(key)}
                  </li>
                ) : null}
                <DateLink
                  active={activeDateKey === key}
                  date={key}
                  linkRefs={linkRefs}
                />
                <YearHeader
                  nextYear={elements[index + 1]?.[0]}
                  currentYear={key}
                />
              </Fragment>
            ))}
        </ul>
      )}
    </div>
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
        <li className="sticky top-10 z-10 bg-gray-50 p-1 pl-2">
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
}: {
  active: boolean;
  date: string;
  linkRefs: React.MutableRefObject<Map<string, HTMLAnchorElement>>;
}) {
  if (date) {
    return (
      <li className="relative py-1 pl-10 pr-3 text-xs font-thin hover:underline">
        <span
          className={`absolute left-[17px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border ${
            active
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
              ? 'font-semibold text-primary-700'
              : 'text-slate-700 hover:text-primary-700'
          }
          to={`#${parseMonthDayYear(date)}`}
        >
          {parseMonthDay(date)}
        </Link>
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
            <div className="ml-4 h-3 w-12 rounded-md bg-gray-100 p-1 "></div>
          </div>
        </li>
      ))}
    </ul>
  );
}

const Skeleton = memo(SkeletonUnmemo);
