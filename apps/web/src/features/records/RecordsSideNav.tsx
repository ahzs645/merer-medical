import { NavLink, useLocation } from 'react-router-dom';

import { RECORD_GROUPS, RecordCategory } from './recordCategories';
import { countForCategory, useRecordCounts } from './useRecordCounts';

/**
 * Grouped vertical navigation for Records, shown on wide viewports in place of
 * the old horizontal 19-tab strip. Every destination is visible at once, so
 * there is no horizontal scrolling and nothing hides off-screen. Specialty
 * categories (Dental, Optometry) expand their sub-pages inline while active,
 * replacing the second tab row those workspaces used to render on desktop.
 */
export function RecordsSideNav() {
  const { counts } = useRecordCounts();
  const location = useLocation();

  const isSectionActive = (item: RecordCategory) => {
    const pathname = location.pathname.replace(/\/+$/, '');
    const target = item.to.replace(/\/+$/, '');
    return pathname === target || pathname.startsWith(`${target}/`);
  };

  return (
    <nav aria-label="Record categories" className="p-3">
      {RECORD_GROUPS.map((group) => (
        <div key={group.heading} className="mb-4">
          <h2 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {group.heading}
          </h2>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const count = countForCategory(item, counts);
              const showChildren = !!item.children && isSectionActive(item);
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={!!item.children}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium ${
                        isActive || showChildren
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
                              isActive || showChildren
                                ? 'text-primary-100'
                                : 'text-gray-500'
                            }
                          >
                            {count}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                  {showChildren && (
                    <ul className="mt-0.5 space-y-0.5 border-l border-gray-200 pl-4 ml-4">
                      {item.children?.map((child) => (
                        <li key={`${child.to}-${child.label}`}>
                          <NavLink
                            to={child.to}
                            end={child.end}
                            className={({ isActive }) =>
                              `block rounded-md px-2 py-1.5 text-sm ${
                                isActive
                                  ? 'bg-primary-50 text-primary-800 font-semibold'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`
                            }
                          >
                            {child.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
