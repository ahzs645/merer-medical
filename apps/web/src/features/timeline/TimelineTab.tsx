import { format, parseISO } from 'date-fns';
import { BundleEntry, FhirResource } from 'fhir/r2';
import {
  UIEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Transition } from '@headlessui/react';
import { ArrowUpIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useDebounceCallback } from '@react-hook/debounce';

import { AppPage } from '../../shared/components/AppPage';
import { EmptyRecordsPlaceholder } from '../../shared/components/EmptyRecordsPlaceholder';
import useIntersectionObserver from '../../shared/hooks/useIntersectionObserver';
import { useScrollToHash } from '../../shared/hooks/useScrollToHash';
import { useLocalConfig } from '../../app/providers/LocalConfigProvider';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useUser } from '../../app/providers/UserProvider';
import { useVectorSyncStatus } from '../vectors/providers/VectorGeneratorSyncInitializer';
import { JumpToPanel } from './components/layout/JumpToPanel';
import { SearchBar } from './components/layout/SearchBar';
import { TimelineBanner } from './components/layout/TimelineBanner';
import { TimelineItem } from './components/layout/TimelineItem';
import { TimelineSkeleton } from './components/skeletons/TimelineSkeleton';
import { TimelineYearHeader } from './components/layout/TimelineYearHeader';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { TimelineMonthDayHeader } from './components/layout/TimelineMonthDayHeader';
import { useRecordQuery, useTimelineDateKeys } from './hooks/useRecordQuery';
import { QueryStatus, TimelineRecordTypeFilter } from './types';
import {
  checkIfDefaultDate,
  formattedTitleDateDayString,
  formattedTitleDateMonthString,
} from './utils/timelineDates';

export { QueryStatus };
export {
  checkIfDefaultDate,
  formattedTitleDateDayString,
  formattedTitleDateMonthString,
};

export function TimelineTab() {
  const user = useUser(),
    [query, setQuery] = useState(''),
    [typeFilter, setTypeFilter] = useState<TimelineRecordTypeFilter>('all'),
    { t } = useInterfaceLanguage(),
    { experimental__use_openai_rag } = useLocalConfig(),
    vectorSyncStatus = useVectorSyncStatus(),
    enableVectorSearch =
      experimental__use_openai_rag && vectorSyncStatus === 'COMPLETE',
    { data, status, initialized, loadNextPage, showIndividualItems } =
      useRecordQuery(query, enableVectorSearch, typeFilter),
    timelineDateKeys = useTimelineDateKeys(query === '', typeFilter),
    hasNoRecords =
      query === '' &&
      typeFilter === 'all' &&
      (!data || Object.entries(data).length === 0),
    scrollContainer = useRef<HTMLDivElement>(null),
    scrollToTop = useScrollToTop(scrollContainer),
    onScroll: UIEventHandler<HTMLDivElement> = useDebounceCallback((e) => {
      if (e) {
        const target = e.target ? e.target : (e as any).srcElement;
        setScrollY(onScrollGetYPosition(target));
        setActiveDateKey(getActiveDateKey(target, Object.keys(data || {})));
      }
    }, 100),
    [activeDateKey, setActiveDateKey] = useState<string | undefined>(),
    [scrollY, setScrollY] = useState(0);

  const yearMap = useMemo(() => {
    const newYearMap = new Map<
      string,
      Record<string, ClinicalDocument<BundleEntry<FhirResource>>[]>
    >();

    if (data) {
      for (const [dateKey, itemList] of Object.entries(data)) {
        const year = dateKey.split('-')[0];
        const yearData = newYearMap.get(year);
        if (yearData) {
          yearData[dateKey] = itemList;
        } else {
          newYearMap.set(year, { [dateKey]: itemList });
        }
      }
    }
    return newYearMap;
  }, [data]);

  useScrollToHash();

  const listItems = useMemo(
    () =>
      yearMap ? (
        <>
          {/* new code using yearMap */}
          {[...yearMap.entries()].map(
            ([year, dateMap], yearIndex, yearElements) => (
              <div key={year} className="relative">
                {/* Vertical line */}
                <div className="absolute left-8 top-4 h-[calc(100%-12px)] w-[2px] md:w-1 bg-gray-200 z-0 rounded-full" />
                <TimelineYearHeader
                  key={`${year}${yearIndex}`}
                  year={year}
                  fullDate={Object.entries(dateMap)?.[0]?.[0]}
                />
                {Object.entries(dateMap).map(([dateKey, itemList]) => (
                  <div key={dateKey} className="ml-1">
                    <TimelineMonthDayHeader dateKey={dateKey} />
                    <TimelineItem
                      dateKey={dateKey}
                      itemList={itemList}
                      showIndividualItems={showIndividualItems}
                      searchQuery={query}
                    />
                  </div>
                ))}
              </div>
            ),
          )}
          {status !== QueryStatus.COMPLETE_HIDE_LOAD_MORE &&
            status !== QueryStatus.LOADING && (
              <LoadMoreSentinel
                status={status}
                loadNextPage={loadNextPage}
                scrollRootRef={scrollContainer}
              />
            )}
        </>
      ) : (
        []
      ),
    [yearMap, status, loadNextPage, showIndividualItems],
  );

  return (
    <AppPage
      banner={
        <TimelineBanner
          image={
            user?.profile_picture?.data ? user.profile_picture.data : undefined
          }
          text={
            user?.first_name
              ? t('Welcome back {name}!').replace('{name}', user.first_name)
              : t('Hello!')
          }
          subtext={t('Your recent medical updates')}
        />
      }
    >
      <Transition
        show={
          !initialized &&
          (status === QueryStatus.IDLE || status === QueryStatus.LOADING)
        }
        enter="transition-opacity ease-in-out duration-75"
        enterFrom="opacity-75"
        enterTo="opacity-100"
        leave="transition-opacity ease-in-out duration-75"
        leaveFrom="opacity-100"
        leaveTo="opacity-75"
      >
        <TimelineSkeleton />
      </Transition>
      <Transition
        as="div"
        className={'relative flex h-full'}
        show={initialized}
        enter="transition-opacity ease-in-out duration-75"
        enterFrom="opacity-75"
        enterTo="opacity-100"
        leave="transition-opacity ease-in-out duration-75"
        leaveFrom="opacity-100"
        leaveTo="opacity-75"
      >
        {!(
          status === QueryStatus.LOADING_MORE || status === QueryStatus.LOADING
        ) && hasNoRecords ? (
          <EmptyRecordsPlaceholder />
        ) : (
          <div className="flex w-full overflow-hidden">
            <JumpToPanel
              items={data}
              dateKeys={query === '' ? timelineDateKeys : undefined}
              isLoading={false}
              activeDateKey={activeDateKey ?? Object.keys(data || {})[0]}
            />
            <div
              className="px-auto flex h-full max-h-full w-full justify-center overflow-y-scroll relative"
              ref={scrollContainer}
              onScroll={onScroll}
            >
              <div className="h-max w-full max-w-4xl flex-col px-4 pb-[50vh] sm:px-6 lg:px-8">
                <SearchBar
                  query={query}
                  setQuery={setQuery}
                  status={status}
                  typeFilter={typeFilter}
                  setTypeFilter={setTypeFilter}
                />
                {listItems}
                {(Object.keys(data || {}) || []).length === 0 ? (
                  <main className="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
                    <div className="text-center">
                      <p className="text-base font-semibold text-primary-600">
                        <MagnifyingGlassIcon className="h-12 w-12 mx-auto" />
                      </p>
                      <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        {t('No matching records')}
                      </h1>
                      <p className="mt-6 text-lg leading-7 text-gray-700">
                        {query
                          ? t('No records found with query: {query}').replace(
                              '{query}',
                              query,
                            )
                          : t('No records found for this filter')}
                      </p>
                    </div>
                  </main>
                ) : null}
              </div>
              <button
                onClick={scrollToTop}
                className={`z-40 fixed transition-all duration-200 bottom-24 right-4 md:bottom-4 md:right-8 shadow-blue-500/50 bg-primary shadow-md hover:shadow-lg active:shadow-sm rounded-full p-2 active:scale-95 hover:scale-105 ${
                  scrollY > 100 ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <span className="text-white">
                  <ArrowUpIcon className="h-6 w-6" />
                </span>
              </button>
            </div>
          </div>
        )}
      </Transition>
    </AppPage>
  );
}

function LoadMoreSentinel({
  status,
  loadNextPage,
  scrollRootRef,
}: {
  status: QueryStatus;
  loadNextPage: () => void;
  scrollRootRef: React.RefObject<HTMLDivElement>;
}) {
  const ref = useRef<HTMLDivElement | null>(null),
    entry = useIntersectionObserver(ref, {
      root: scrollRootRef.current,
      rootMargin: '900px 0px',
    }),
    isVisible = !!entry?.isIntersecting;

  useEffect(() => {
    if (isVisible && status === QueryStatus.SUCCESS) {
      loadNextPage();
    }
  }, [isVisible, loadNextPage, status]);

  return <div ref={ref} className="h-1 w-full" aria-hidden="true" />;
}

function useScrollToTop(ref?: React.RefObject<HTMLDivElement | undefined>) {
  return useCallback(() => {
    ref?.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [ref]);
}

const onScrollGetYPosition = (element: HTMLElement) => {
  return element.scrollTop;
};

const getActiveDateKey = (container: HTMLElement, dateKeys: string[]) => {
  if (container.scrollTop <= 1) {
    return dateKeys[0];
  }

  const containerRect = container.getBoundingClientRect(),
    containerCenter = containerRect.top + containerRect.height / 2;

  let activeDateKey = dateKeys[0],
    closestDistance = Number.POSITIVE_INFINITY;

  for (const dateKey of dateKeys) {
    const element = document.getElementById(
      format(parseISO(dateKey), 'MMM-dd-yyyy'),
    );
    if (!element) continue;

    const distance = Math.abs(
      element.getBoundingClientRect().top - containerCenter,
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      activeDateKey = dateKey;
    }
  }

  return activeDateKey;
};
