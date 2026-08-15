import { useEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Puts you back where you were when you press Back.
 *
 * The browser restores window scroll on a POP, and React Router has
 * `ScrollRestoration` for the same. Neither helps here: every page scrolls an
 * `overflow-y-auto` div *inside* the route, so the window never scrolls at all
 * and there is nothing for either to restore. Scrolling a 50-row lab list,
 * opening a result and pressing Back landed you back at row one, at every
 * width — which is the difference between browsing a long list and browsing the
 * top of it repeatedly.
 *
 * Restoring is deliberately patient. A record page fetches after it mounts, so
 * at the moment of restore the scroller is usually still short; this keeps
 * trying while the content grows, and gives up after `RESTORE_TIMEOUT_MS` so a
 * page that genuinely got shorter doesn't sit there re-scrolling forever.
 */

/**
 * Keyed by `location.key`, so the same URL reached twice restores separately.
 *
 * `index` is which scrollable box was scrolled, counted in document order.
 * A desktop Records route has two — the category side nav and the content
 * column — and restoring the offset onto the first one it found put the
 * *navigation* halfway down while the list stayed at the top.
 */
const positions = new Map<string, { top: number; index: number }>();

/** Bounded so a long session can't grow the map without limit. */
const MAX_REMEMBERED = 50;
/**
 * How long to keep trying to reach the remembered offset.
 *
 * Generous because the content arrives late: a record page mounts, *then*
 * queries, so for the first frames after Back the list is a spinner and there
 * is nothing to scroll. At 1.5s the Labs list was still short when the clock
 * ran out and you landed near the top — most of the way to the bug this hook
 * exists to fix.
 */
const RESTORE_TIMEOUT_MS = 6000;

function rememberPosition(key: string, top: number, index: number) {
  if (positions.size >= MAX_REMEMBERED && !positions.has(key)) {
    const oldest = positions.keys().next().value;
    if (oldest !== undefined) positions.delete(oldest);
  }
  positions.delete(key);
  positions.set(key, { top, index });
}

/**
 * The element the page actually scrolls: the container itself when it scrolls,
 * otherwise its first scrollable descendant. Pages put the scroll on an inner
 * div often enough (and inconsistently enough) that looking it up beats asking
 * every page to hand one over.
 */
function findScrollers(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const scrolls = (element: HTMLElement) =>
    /auto|scroll/.test(getComputedStyle(element).overflowY) &&
    element.scrollHeight > element.clientHeight;
  const found: HTMLElement[] = [];
  if (scrolls(root)) found.push(root);
  for (const element of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
    if (scrolls(element)) found.push(element);
  }
  return found;
}

export function useScrollRestoration(containerRef: RefObject<HTMLElement>) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const locationKey = location.key;
  // Read in the cleanup below, which runs after the route has already changed.
  const latestTop = useRef(0);
  const latestIndex = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    latestTop.current = 0;
    latestIndex.current = 0;

    // Listened for in the capture phase on the container rather than bound to
    // the scroller itself. `scroll` does not bubble, but it does capture — and
    // at the moment this effect runs the page has usually not rendered its
    // content yet, so there is no scroller to bind to. Binding late meant
    // nothing was ever recorded and every restore had 0 to aim at.
    const onScroll = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target || typeof target.scrollTop !== 'number') return;
      latestTop.current = target.scrollTop;
      const index = findScrollers(container).indexOf(target);
      if (index >= 0) latestIndex.current = index;
    };
    container.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    });

    // Only a Back/Forward restores. Following a link to a page you have been
    // to before should start at the top, the way it does everywhere else.
    const remembered =
      navigationType === 'POP' ? positions.get(locationKey) : undefined;
    const target = remembered?.top ?? 0;

    let scroller: HTMLElement | null = null;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let deadline = 0;
    const startedAt = Date.now();

    // A reader who scrolls during the restore window has overtaken it; stop
    // fighting them for the scroll position.
    let cancelled = false;
    const cancelOnUserScroll = () => {
      cancelled = true;
    };

    if (target) {
      const attempt = () => {
        if (cancelled) return;
        // The scroller may not exist yet on the first frames: the page is
        // still fetching, so nothing is tall enough to scroll.
        if (!scroller) {
          const scrollers = findScrollers(container);
          scroller = scrollers[remembered?.index ?? 0] ?? scrollers[0] ?? null;
        }
        if (scroller) {
          const reachable = scroller.scrollHeight - scroller.clientHeight;
          scroller.scrollTop = Math.min(target, reachable);
          latestTop.current = scroller.scrollTop;
          if (scroller.scrollTop >= target) {
            cancelled = true;
            return;
          }
          // Not tall enough yet. Rather than burn frames polling, wait for the
          // content to grow and try again then — which is the event that
          // actually makes the offset reachable.
          if (!observer && typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(() => {
              if (Date.now() - startedAt < RESTORE_TIMEOUT_MS) attempt();
            });
            observer.observe(scroller);
            if (scroller.firstElementChild) {
              observer.observe(scroller.firstElementChild);
            }
          }
        }
        if (Date.now() - startedAt < RESTORE_TIMEOUT_MS) {
          frame = window.requestAnimationFrame(attempt);
        }
      };
      frame = window.requestAnimationFrame(attempt);
      // `wheel`/`touchstart` rather than `scroll`, which our own restore fires.
      container.addEventListener('wheel', cancelOnUserScroll, {
        passive: true,
      });
      container.addEventListener('touchstart', cancelOnUserScroll, {
        passive: true,
      });
      deadline = window.setTimeout(() => {
        cancelled = true;
      }, RESTORE_TIMEOUT_MS);
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      if (deadline) window.clearTimeout(deadline);
      observer?.disconnect();
      container.removeEventListener('wheel', cancelOnUserScroll);
      container.removeEventListener('touchstart', cancelOnUserScroll);
      container.removeEventListener('scroll', onScroll, { capture: true });
      rememberPosition(locationKey, latestTop.current, latestIndex.current);
    };
  }, [containerRef, locationKey, navigationType]);
}

/** Test seam: the map is module state, so specs can start from empty. */
export function clearRememberedScrollPositions() {
  positions.clear();
}
