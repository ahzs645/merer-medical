export const LABS_SCROLL_CONTAINER_ID = 'labs-scroll-container';

const LABS_QUERY_KEY = 'mere.labs.query';
const LABS_SCROLL_TOP_KEY = 'mere.labs.scrollTop';

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
