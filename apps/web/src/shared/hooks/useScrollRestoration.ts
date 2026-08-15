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

/** Keyed by `location.key`, so the same URL reached twice restores separately. */
const positions = new Map<string, number>();

/** Bounded so a long session can't grow the map without limit. */
const MAX_REMEMBERED = 50;
const RESTORE_TIMEOUT_MS = 1500;

function rememberPosition(key: string, top: number) {
  if (positions.size >= MAX_REMEMBERED && !positions.has(key)) {
    const oldest = positions.keys().next().value;
    if (oldest !== undefined) positions.delete(oldest);
  }
  positions.delete(key);
  positions.set(key, top);
}

/**
 * The element the page actually scrolls: the container itself when it scrolls,
 * otherwise its first scrollable descendant. Pages put the scroll on an inner
 * div often enough (and inconsistently enough) that looking it up beats asking
 * every page to hand one over.
 */
function findScroller(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  const scrolls = (element: HTMLElement) =>
    /auto|scroll/.test(getComputedStyle(element).overflowY) &&
    element.scrollHeight > element.clientHeight;
  if (scrolls(root)) return root;
  for (const element of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
    if (scrolls(element)) return element;
  }
  return null;
}

export function useScrollRestoration(containerRef: RefObject<HTMLElement>) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const locationKey = location.key;
  // Read in the cleanup below, which runs after the route has already changed.
  const latestTop = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scroller = findScroller(container);
    latestTop.current = scroller?.scrollTop ?? 0;

    const onScroll = () => {
      if (scroller) latestTop.current = scroller.scrollTop;
    };
    scroller?.addEventListener('scroll', onScroll, { passive: true });

    // Only a Back/Forward restores. Following a link to a page you have been
    // to before should start at the top, the way it does everywhere else.
    const target = navigationType === 'POP' ? positions.get(locationKey) : 0;

    let frame = 0;
    const startedAt = Date.now();
    if (target) {
      const attempt = () => {
        // The scroller may not exist yet on the first frames: the page is
        // still fetching, so nothing is tall enough to scroll.
        if (!scroller) {
          scroller = findScroller(container);
          if (scroller) {
            scroller.addEventListener('scroll', onScroll, { passive: true });
          }
        }
        if (scroller) {
          const reachable = scroller.scrollHeight - scroller.clientHeight;
          scroller.scrollTop = Math.min(target, reachable);
          latestTop.current = scroller.scrollTop;
          if (scroller.scrollTop >= target) return;
        }
        if (Date.now() - startedAt < RESTORE_TIMEOUT_MS) {
          frame = window.requestAnimationFrame(attempt);
        }
      };
      frame = window.requestAnimationFrame(attempt);
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scroller?.removeEventListener('scroll', onScroll);
      rememberPosition(locationKey, latestTop.current);
    };
  }, [containerRef, locationKey, navigationType]);
}

/** Test seam: the map is module state, so specs can start from empty. */
export function clearRememberedScrollPositions() {
  positions.clear();
}
