import { useEffect, useRef, useState, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Tells a screen reader that the page changed, and puts the keyboard where the
 * new page starts.
 *
 * A route change in this app used to do neither. `main` already carried
 * `tabIndex={-1}` (the skip link targets it) and the shell already had an
 * `aria-live` region (the route-loading spinner), but nothing connected either
 * to navigation — so activating "Medications" in the rail announced nothing,
 * and left `document.activeElement` on `<body>`. The next Tab started again at
 * "Skip to content", above the navigation the reader had just used, on all 46
 * routes.
 *
 * Two halves, both needed:
 *
 * - **Focus** moves to the `main` landmark, so the next Tab continues from the
 *   content rather than from the top of the document. `preventScroll` because
 *   `useScrollRestoration` is restoring the offset at the same moment and
 *   focus must not fight it.
 * - **A message** naming the page, read into a polite live region. The name is
 *   the route's `h1`, which every page renders in its banner.
 *
 * Keyed on `pathname` and not on the whole location: the list pages write their
 * search box into the query string on every keystroke (`useListViewParams`), and
 * stealing focus mid-word would be worse than saying nothing at all.
 */
export function useRouteAnnouncement(
  containerRef: RefObject<HTMLElement>,
): string {
  const { pathname } = useLocation();
  const [message, setMessage] = useState('');
  // The first paint is an arrival, not a navigation. Announcing it would talk
  // over the page the reader has only just opened.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    container.focus({ preventScroll: true });

    // Routes are code-split, so at this moment `main` usually holds the
    // Suspense fallback rather than the page. Wait for a heading to arrive
    // rather than announcing the spinner, and give up after ~1.2s on the
    // document title, which is at least true.
    let cancelled = false;
    let attempts = 0;
    let timer = 0;

    const announce = (text: string) =>
      setMessage((previous) =>
        // An identical string is not a change, and a live region only speaks
        // when its content changes — two routes that share a heading (the
        // Conditions views) would otherwise pass in silence.
        previous === text ? `${text}\u200b` : text,
      );

    const read = () => {
      if (cancelled) return;
      const heading = container.querySelector('h1')?.textContent?.trim();
      if (heading) {
        announce(heading);
        return;
      }
      if (attempts++ < 20) {
        timer = window.setTimeout(read, 60);
        return;
      }
      announce(document.title);
    };

    timer = window.setTimeout(read, 60);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [containerRef, pathname]);

  return message;
}
