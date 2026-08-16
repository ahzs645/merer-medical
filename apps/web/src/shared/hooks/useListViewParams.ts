import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * A list page's search box and filter chips, kept in the URL instead of in
 * component state.
 *
 * Held in `useState`, what you are looking at is invisible to everything
 * outside the component and gone the moment it unmounts. Three consequences,
 * all of which the third interface review ran into:
 *
 * - **Back does not restore it.** Filter Labs, open a result, press Back, and
 *   the page returns pre-filtered to its default. Scroll restoration cannot
 *   help either, because the page that comes back is a different length than
 *   the one you left — this is why restoring on Labs looked broken long after
 *   the mechanism worked.
 * - **It cannot be linked.** "The abnormal ones" is a view of your records with
 *   no address, so it cannot be bookmarked, shared with a caregiver, or opened
 *   in a second tab.
 * - **A reload loses it**, which on a records app is a page you were reading.
 *
 * Written with `replace: true`, so typing into a search box updates the current
 * history entry rather than pushing one per keystroke — Back still goes back to
 * where you came from, and it goes back to the view you had.
 *
 * A value equal to the default is dropped from the URL, so an untouched page
 * keeps a clean address and only a deliberate choice shows up in it.
 */
export function useListViewParams<Id extends string = string>({
  defaultFilter,
  queryKey = 'q',
  filterKey = 'filter',
}: {
  /** The chip the page opens on when the URL says nothing. */
  defaultFilter?: Id;
  queryKey?: string;
  filterKey?: string;
} = {}): {
  query: string;
  setQuery: (value: string) => void;
  filterId: Id;
  setFilterId: (value: Id) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get(queryKey) ?? '';
  const filterId = (searchParams.get(filterKey) as Id) ?? (defaultFilter as Id);

  const setParam = useCallback(
    (key: string, value: string, fallback: string) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (!value || value === fallback) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setQuery = useCallback(
    (value: string) => setParam(queryKey, value, ''),
    [setParam, queryKey],
  );

  const setFilterId = useCallback(
    (value: Id) => setParam(filterKey, value, defaultFilter ?? ''),
    [setParam, filterKey, defaultFilter],
  );

  return useMemo(
    () => ({ query, setQuery, filterId, setFilterId }),
    [query, setQuery, filterId, setFilterId],
  );
}
