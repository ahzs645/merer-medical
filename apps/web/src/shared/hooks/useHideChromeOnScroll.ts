import { RefObject, useEffect, useState } from 'react';

/** Below this distance from the top, the page header is always shown. */
const SHOW_NEAR_TOP_PX = 48;
/** How far the reader scrolls one way before the header follows. */
const HIDE_AFTER_PX = 24;
const SHOW_AFTER_PX = 16;
/**
 * Hiding the header makes the scroller taller. At the end of a list that
 * clamps its scrollTop, which arrives as an upward scroll — and would bring
 * the header straight back. Ignore movement for a moment after a change.
 */
const SETTLE_MS = 300;

/**
 * Whether the phone should hide its page header (the top bar and the page's
 * banner) because the reader is scrolling down a list.
 *
 * Every page owns its own vertical scroller inside `main`, so rather than
 * restructure 40 pages to let the header scroll with the content, this
 * listens to vertical scrolling anywhere inside `main` and reports a
 * direction: down past the threshold hides, any deliberate scroll up, or
 * reaching the top, shows. Sideways scrolling (filter chips, tables) and
 * scrolling while a field has focus are ignored, so the search box a person is
 * typing into never disappears under them.
 */
export function useHideChromeOnScroll(
  containerRef: RefObject<HTMLElement>,
  enabled: boolean,
  /** A new page starts with its header shown. */
  resetKey: string,
): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
    const container = containerRef.current;
    if (!container || !enabled) return;

    const lastTop = new WeakMap<Element, number>();
    let travel = 0;
    let current = false;
    let settleUntil = 0;

    const set = (next: boolean) => {
      if (next === current) return;
      current = next;
      travel = 0;
      settleUntil = performance.now() + SETTLE_MS;
      setHidden(next);
    };

    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const top = target.scrollTop;
      const previous = lastTop.get(target);
      lastTop.set(target, top);
      if (previous === undefined || previous === top) return; // sideways
      if (performance.now() < settleUntil) return;

      if (top <= SHOW_NEAR_TOP_PX) {
        set(false);
        return;
      }
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        active.matches('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }

      const delta = top - previous;
      // Accumulate travel in one direction; a change of direction restarts it.
      travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
      if (!current && travel > HIDE_AFTER_PX) set(true);
      else if (current && travel < -SHOW_AFTER_PX) set(false);
    };

    container.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    });
    return () => container.removeEventListener('scroll', onScroll, true);
  }, [containerRef, enabled, resetKey]);

  return enabled && hidden;
}
