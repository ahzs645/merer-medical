import { NavLink } from 'react-router-dom';

import { Routes as AppRoutes } from '../../../Routes';

export interface RecordView {
  to: string;
  label: string;
  /** Match only this exact path, for the view that owns the section's root. */
  end?: boolean;
}

/**
 * Two or three ways of reading the same records, as a segmented control in the
 * page banner.
 *
 * Conditions had grown two top-level nav entries — "Problems" and "My
 * conditions" — over one set of thirteen records. Both headers said "13
 * conditions"; the difference was that one showed every field of each diagnosis
 * and the other grouped them by topic with their related labs, medications and
 * care plans. That is a view, not a category, and nothing in either name told a
 * reader which one held what they were after.
 *
 * It lives in the banner's action row rather than beside the filter chips: a
 * filter narrows the list you are on, and this changes which list you are
 * reading. The timeline's "Cards / Clinical timeline" pair is the same idea in
 * the same shape.
 */
export function RecordViewSwitch({
  views,
  label,
}: {
  views: RecordView[];
  /** Accessible name for the group, e.g. "Condition views". */
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex shrink-0 rounded-md bg-white/10 p-0.5 ring-1 ring-inset ring-white/30"
    >
      {views.map((view) => (
        <NavLink
          key={view.to}
          to={view.to}
          end={view.end}
          className={({ isActive }) =>
            `inline-flex min-h-[40px] items-center rounded px-3 text-sm font-semibold ${
              isActive
                ? 'bg-white text-primary-800 shadow-sm'
                : 'text-white hover:bg-white/15'
            }`
          }
        >
          {view.label}
        </NavLink>
      ))}
    </div>
  );
}

/** The two readings of the condition list, shared by both pages that render it. */
export const CONDITION_VIEWS: RecordView[] = [
  { to: AppRoutes.Conditions, label: 'By topic', end: true },
  { to: AppRoutes.ConditionDetails, label: 'Details' },
];
