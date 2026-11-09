import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';

/**
 * Keep off-screen choices discoverable without covering their touch targets.
 * Bounds, rather than scrollLeft, work with both LTR and RTL scroll origins.
 */
export function HorizontalChoiceScroller({
  children,
  label,
  activeKey,
  activeSelector,
  as: Element = 'div',
  tone = 'light',
  rowClassName = '',
}: {
  children: ReactNode;
  label: string;
  activeKey: string;
  activeSelector: string;
  as?: 'div' | 'nav';
  tone?: 'light' | 'dark';
  rowClassName?: string;
}) {
  const { language, t } = useInterfaceLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({
    previous: false,
    next: false,
    overflow: false,
    rtl: false,
  });
  const overflows = edges.overflow;

  const measure = useCallback(() => {
    const row = rowRef.current;
    const first = row?.firstElementChild;
    const last = row?.lastElementChild;
    const container = containerRef.current;
    if (!row || !container || !first || !last) return;
    // Measure against all available space, including the space currently used
    // by arrows, so controls disappear again when a resized row can fit.
    const overflow = row.scrollWidth > container.clientWidth + 2;
    const bounds = row.getBoundingClientRect();
    const rtl = getComputedStyle(row).direction === 'rtl';
    const firstBounds = first.getBoundingClientRect();
    const lastBounds = last.getBoundingClientRect();
    const previous =
      overflow &&
      (rtl
        ? firstBounds.right > bounds.right + 2
        : firstBounds.left < bounds.left - 2);
    const next =
      overflow &&
      (rtl
        ? lastBounds.left < bounds.left - 2
        : lastBounds.right > bounds.right + 2);
    setEdges((current) =>
      current.previous === previous &&
      current.next === next &&
      current.overflow === overflow &&
      current.rtl === rtl
        ? current
        : { previous, next, overflow, rtl },
    );
  }, []);

  const reveal = useCallback((choice: HTMLElement) => {
    const row = rowRef.current;
    if (!row) return;
    const bounds = row.getBoundingClientRect();
    const selected = choice.getBoundingClientRect();
    // Only this row scrolls. scrollIntoView could also move the whole page.
    if (selected.left < bounds.left) {
      row.scrollLeft += selected.left - bounds.left;
    } else if (selected.right > bounds.right) {
      row.scrollLeft += selected.right - bounds.right;
    }
  }, []);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const update = () => {
      const active = row.querySelector<HTMLElement>(activeSelector);
      if (active) reveal(active);
      measure();
    };
    update();
    const frame = window.requestAnimationFrame(update);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(update);
    observer?.observe(row);
    if (containerRef.current) observer?.observe(containerRef.current);
    Array.from(row.children).forEach((child) => observer?.observe(child));
    // The language provider applies dir in a passive effect. Observe it rather
    // than assuming the layout effect already sees the new reading direction.
    const directionObserver = new MutationObserver(update);
    directionObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir'],
    });
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      directionObserver.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
    };
  }, [activeKey, activeSelector, language, overflows, measure, reveal]);

  const scroll = (forward: boolean) => {
    const row = rowRef.current;
    if (!row) return;
    const rtl = getComputedStyle(row).direction === 'rtl';
    const amount = Math.max(100, row.clientWidth * 0.8);
    row.scrollBy({
      left: amount * (forward ? 1 : -1) * (rtl ? -1 : 1),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };

  // On a touch screen the row is swiped, and two arrow buttons took a fifth of
  // a 390px row — at enlarged text, room for a single chip between them. Touch
  // gets a fade on whichever edge has more choices behind it; a mouse, which
  // cannot swipe, keeps the buttons.
  const fadeStart = edges.rtl ? edges.next : edges.previous;
  const fadeEnd = edges.rtl ? edges.previous : edges.next;
  const fade =
    fadeStart || fadeEnd
      ? `linear-gradient(to right, ${fadeStart ? 'transparent, black 28px' : 'black'}, ${
          fadeEnd ? 'black calc(100% - 28px), transparent' : 'black'
        })`
      : undefined;

  const controlClass = `hidden [@media(pointer:fine)]:flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1 ring-inset disabled:opacity-30 ${
    tone === 'dark'
      ? 'bg-white/10 text-white ring-white/30 hover:bg-white/20'
      : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-100'
  }`;

  return (
    <div ref={containerRef} className="flex min-w-0 items-center gap-1">
      {overflows && (
        <button
          type="button"
          aria-label={`${t(label)}: ${t('Previous choices')}`}
          disabled={!edges.previous}
          onClick={() => scroll(false)}
          className={controlClass}
        >
          <ChevronLeftIcon className="h-5 w-5 rtl:rotate-180" />
        </button>
      )}
      <Element
        ref={rowRef}
        role={Element === 'div' ? 'group' : undefined}
        aria-label={t(label)}
        onScroll={measure}
        style={fade ? { WebkitMaskImage: fade, maskImage: fade } : undefined}
        onFocusCapture={(event) => reveal(event.target)}
        className={`scrollbar-hide flex min-w-0 flex-1 overflow-x-auto ${rowClassName}`}
      >
        {children}
      </Element>
      {overflows && (
        <button
          type="button"
          aria-label={`${t(label)}: ${t('More choices')}`}
          disabled={!edges.next}
          onClick={() => scroll(true)}
          className={controlClass}
        >
          <ChevronRightIcon className="h-5 w-5 rtl:rotate-180" />
        </button>
      )}
    </div>
  );
}
