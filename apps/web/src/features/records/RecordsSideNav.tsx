import { NavLink } from 'react-router-dom';

import { RECORD_GROUPS } from './recordCategories';
import { countForCategory, useRecordCounts } from './useRecordCounts';

/**
 * Grouped vertical navigation for Records, shown on wide viewports in place of
 * the old horizontal 19-tab strip. Every destination is visible at once, so
 * there is no horizontal scrolling and nothing hides off-screen.
 */
export function RecordsSideNav() {
  const { counts } = useRecordCounts();

  return (
    <nav aria-label="Record categories" className="p-3">
      {RECORD_GROUPS.map((group) => (
        <div key={group.heading} className="mb-4">
          <h2 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {group.heading}
          </h2>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const count = countForCategory(item, counts);
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium ${
                        isActive
                          ? 'bg-primary-800 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {typeof count === 'number' && count > 0 && (
                          <span
                            className={
                              isActive ? 'text-primary-100' : 'text-gray-400'
                            }
                          >
                            {count}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
