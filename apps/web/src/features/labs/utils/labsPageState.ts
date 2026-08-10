import { Routes as AppRoutes } from '../../../Routes';
import { LabFilterMode } from '../types';

export const LABS_SCROLL_CONTAINER_ID = 'labs-scroll-container';

const LABS_QUERY_KEY = 'mere.labs.query';
const LABS_SCROLL_TOP_KEY = 'mere.labs.scrollTop';

/**
 * Marks the return trip from this page's own "Add lab result" button, so the
 * page can tell that arrival apart from an ordinary visit.
 */
export const LABS_ADDED_PARAM = 'added';

/** Where the manual form sends you after saving a lab started from this page. */
export function labsPathAfterAdd(): string {
  return `${AppRoutes.Labs}?${LABS_ADDED_PARAM}=1`;
}

/**
 * How the page opens.
 *
 * Ordinarily on Attention with the search you left behind — that is the view
 * people come to Labs for. Coming back from having just typed a result, on the
 * full list with the search cleared: a normal ferritin is not "attention", and
 * a leftover search hides it just as thoroughly, so the row the reader went
 * away to create was nowhere on the page they were returned to. The marker
 * comes from this page's own button, so an ordinary visit is untouched.
 */
export function initialLabsView(
  search: string | URLSearchParams,
  savedQuery: string,
): { filterMode: LabFilterMode; query: string } {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;

  return params.has(LABS_ADDED_PARAM)
    ? { filterMode: 'all', query: '' }
    : { filterMode: 'attention', query: savedQuery };
}

export function getSavedLabsQuery(): string {
  return sessionStorage.getItem(LABS_QUERY_KEY) || '';
}

export function saveLabsQuery(query: string) {
  sessionStorage.setItem(LABS_QUERY_KEY, query);
}

export function saveLabsScrollPosition() {
  const container = document.getElementById(LABS_SCROLL_CONTAINER_ID);
  if (!container) return;

  sessionStorage.setItem(LABS_SCROLL_TOP_KEY, `${container.scrollTop}`);
}

export function restoreLabsScrollPosition(container: HTMLElement) {
  const scrollTop = Number(sessionStorage.getItem(LABS_SCROLL_TOP_KEY) || 0);
  if (!Number.isFinite(scrollTop) || scrollTop <= 0) return;

  requestAnimationFrame(() => {
    container.scrollTop = scrollTop;
  });
}
