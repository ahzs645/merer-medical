import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { NavLink, useLocation } from 'react-router-dom';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';

export interface ScrollableTab {
  to: string;
  label: string;
  /**
   * Shown below `lg` in place of `label`, for names that push half the strip
   * off a 390px screen ("Chart & teeth", "Hygiene & perio"). Both are rendered
   * and one is hidden per breakpoint, so the strip does not have to re-measure
   * on resize; the accessible name is always the full `label`.
   */
  shortLabel?: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

/**
 * Horizontal tab strip that scrolls when the tabs overflow the viewport
 * (common on mobile, where Records has 14 tabs). Adds left/right fade
 * gradients and chevron buttons so it's obvious more tabs exist off-screen —
 * otherwise the strip just clips with no affordance.
 */
export function ScrollableTabNav({
  tabs,
  ariaLabel,
}: {
  tabs: ScrollableTab[];
  ariaLabel: string;
}) {
  const { t } = useInterfaceLanguage();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < maxScroll - 1);
  }, []);

  const scrollTabIntoView = useCallback(
    (node: HTMLAnchorElement) => {
      const el = scrollRef.current;
      if (!el) return;
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      const target = Math.min(
        Math.max(0, node.offsetLeft - (el.clientWidth - node.offsetWidth) / 2),
        maxScroll,
      );
      el.scrollLeft = target;
      updateScrollState();
    },
    [updateScrollState],
  );

  useLayoutEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  useEffect(() => {
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const activeTab = tabs.find((tab) => {
      const target = tab.to.replace(/\/+$/, '') || '/';
      if (tab.end) return pathname === target;
      return pathname === target || pathname.startsWith(`${target}/`);
    });
    const findActiveNode = () =>
      scrollRef.current?.querySelector<HTMLAnchorElement>(
        'a[aria-current="page"]',
      ) || (activeTab ? tabRefs.current[activeTab.to] : undefined);
    const scrollActiveNode = () => {
      const activeNode = findActiveNode();
      if (activeNode) {
        scrollTabIntoView(activeNode);
      } else {
        updateScrollState();
      }
    };
    const frame = window.requestAnimationFrame(scrollActiveNode);
    const scrollTimeout = window.setTimeout(scrollActiveNode, 100);
    const stateTimeout = window.setTimeout(updateScrollState, 350);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(scrollTimeout);
      window.clearTimeout(stateTimeout);
    };
  }, [location.pathname, tabs, scrollTabIntoView, updateScrollState]);

  const scrollBy = (delta: number) => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    scrollRef.current?.scrollBy({
      left: delta,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <div className="relative mx-auto max-w-7xl">
      {canScrollLeft && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-11 bg-gradient-to-r from-white via-white to-transparent" />
          <button
            type="button"
            aria-label={t('Scroll tabs left')}
            onClick={() => scrollBy(-200)}
            className="absolute left-0 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-600 shadow ring-1 ring-gray-200 hover:text-gray-900"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        </>
      )}
      {/* Pad the scroll area by the chevron width on whichever side a chevron is
          showing, so a tab label is never hidden underneath one. scroll-p keeps
          scrollIntoView from parking a tab under the same chevron. */}
      <nav
        ref={scrollRef}
        className={`scrollbar-hide flex gap-1 overflow-x-auto py-2 sm:gap-2 ${
          canScrollLeft ? 'scroll-pl-11 pl-11' : ''
        } ${canScrollRight ? 'scroll-pr-11 pr-11' : ''}`}
        aria-label={ariaLabel}
      >
        {tabs.map(({ to, label, shortLabel, icon: Icon, end }) => (
          <NavLink
            key={to}
            ref={(node) => {
              tabRefs.current[to] = node;
            }}
            to={to}
            end={end}
            className={({ isActive }) =>
              `inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium sm:gap-2 sm:px-3 ${
                isActive
                  ? 'bg-primary-800 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {shortLabel ? (
              <>
                <span className="sr-only">{t(label)}</span>
                <span aria-hidden="true" className="lg:hidden">
                  {t(shortLabel)}
                </span>
                <span aria-hidden="true" className="hidden lg:inline">
                  {t(label)}
                </span>
              </>
            ) : (
              t(label)
            )}
          </NavLink>
        ))}
      </nav>
      {canScrollRight && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-11 bg-gradient-to-l from-white via-white to-transparent" />
          <button
            type="button"
            aria-label={t('Scroll tabs right')}
            onClick={() => scrollBy(200)}
            className="absolute right-0 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-600 shadow ring-1 ring-gray-200 hover:text-gray-900"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
