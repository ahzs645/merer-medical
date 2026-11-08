import { type ComponentType } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { HorizontalChoiceScroller } from './HorizontalChoiceScroller';

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

/** Visible controls reveal off-screen sections in either reading direction. */
export function ScrollableTabNav({
  tabs,
  ariaLabel,
}: {
  tabs: ScrollableTab[];
  ariaLabel: string;
}) {
  const { t } = useInterfaceLanguage();
  const location = useLocation();

  return (
    <div className="mx-auto max-w-7xl">
      <HorizontalChoiceScroller
        as="nav"
        label={ariaLabel}
        activeKey={location.pathname}
        activeSelector='a[aria-current="page"]'
        rowClassName="gap-1 py-1 sm:gap-2 sm:py-2 short:py-1"
      >
        {tabs.map(({ to, label, shortLabel, icon: Icon, end }) => (
          <NavLink
            key={to}
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
      </HorizontalChoiceScroller>
    </div>
  );
}
