export const LABS_SCROLL_CONTAINER_ID = 'labs-scroll-container';

/**
 * What used to live here: a sessionStorage copy of the search box, a
 * sessionStorage copy of the scroll offset saved on every row click, and an
 * `added=1` marker telling the page it was being returned to after a save.
 *
 * All three were working around the same thing — a view held in component
 * state, which Back could not bring back. The search box and the filter chips
 * are in the URL now (`useListViewParams`), so the history entry carries them;
 * scroll is restored by the shell for every route rather than by this one page
 * (`useScrollRestoration`); and the marker is unnecessary because the list no
 * longer opens filtered to "Attention", where a normal new result was
 * invisible.
 *
 * The id survives because `LabsTable` and this page's tests both name the
 * scroll container.
 */
