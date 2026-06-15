import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { NavLink } from 'react-router-dom';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';

export interface ScrollableTab {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < maxScroll - 1);
  }, []);

  useEffect(() => {
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

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className="relative mx-auto max-w-7xl">
      {canScrollLeft && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent" />
          <button
            type="button"
            aria-label={t('Scroll tabs left')}
            onClick={() => scrollBy(-200)}
            className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white p-1 text-gray-500 shadow ring-1 ring-gray-200 hover:text-gray-800"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
        </>
      )}
      <nav
        ref={scrollRef}
        className="scrollbar-hide flex gap-1 overflow-x-auto py-2 sm:gap-2"
        aria-label={ariaLabel}
      >
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium sm:gap-2 sm:px-3 ${
                isActive
                  ? 'bg-primary-800 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {t(label)}
          </NavLink>
        ))}
      </nav>
      {canScrollRight && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent" />
          <button
            type="button"
            aria-label={t('Scroll tabs right')}
            onClick={() => scrollBy(200)}
            className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white p-1 text-gray-500 shadow ring-1 ring-gray-200 hover:text-gray-800"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
