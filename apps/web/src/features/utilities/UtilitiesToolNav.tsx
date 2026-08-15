import { useEffect, useState } from 'react';
import { ChevronUpDownIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { NavLink, useLocation } from 'react-router-dom';

import { Routes as AppRoutes } from '../../Routes';
import { findActiveTool, UTILITY_TOOLS } from './utilityTools';

const PILL_BASE =
  'inline-flex min-h-[44px] items-center gap-2 rounded-md px-3 text-sm font-medium';

function pillClass(isActive: boolean): string {
  return `${PILL_BASE} ${
    isActive ? 'bg-primary-800 text-white' : 'text-gray-700 hover:bg-gray-100'
  }`;
}

function ToolLinks() {
  return (
    <>
      <NavLink
        to={AppRoutes.Utilities}
        end
        className={({ isActive }) => pillClass(isActive)}
      >
        <Squares2X2Icon className="h-5 w-5 shrink-0" />
        All tools
      </NavLink>
      {UTILITY_TOOLS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => pillClass(isActive)}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {label}
        </NavLink>
      ))}
    </>
  );
}

/**
 * Utilities navigation.
 *
 * The nine entries add up to a ~900px strip, so the shared horizontal
 * ScrollableTabNav clipped labels mid-word behind its scroll chevrons on
 * phones. Instead: a disclosure menu below `lg` (one 44px control naming the
 * open tool) and a wrapping — never scrolling — pill row from `lg` up, so no
 * label is ever truncated and every target clears 44px.
 */
export function UtilitiesToolNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const activeTool = findActiveTool(location.pathname);
  const ActiveIcon = activeTool?.icon ?? Squares2X2Icon;

  // Picking a tool navigates; collapse so the page below is visible again.
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="utilities-tool-menu"
          className="flex min-h-[44px] w-full items-center gap-2 rounded-md px-3 text-start text-sm font-medium text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50"
        >
          <ActiveIcon className="text-primary-700 h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {activeTool ? activeTool.label : 'All tools'}
          </span>
          <span className="shrink-0 text-xs font-normal text-gray-500">
            Change tool
          </span>
          <ChevronUpDownIcon className="h-5 w-5 shrink-0 text-gray-400" />
        </button>
        {/* Kept mounted (display:none when closed) so aria-controls always
            resolves; display:none also keeps the links out of the tab order. */}
        <nav
          id="utilities-tool-menu"
          aria-label="Utilities tools"
          className={`mt-2 gap-1 rounded-md p-1 ring-1 ring-gray-200 sm:grid-cols-2 ${
            open ? 'grid' : 'hidden'
          }`}
        >
          <ToolLinks />
        </nav>
      </div>

      <nav
        aria-label="Utilities"
        className="hidden flex-wrap gap-1 py-2 lg:flex"
      >
        <ToolLinks />
      </nav>
    </div>
  );
}
