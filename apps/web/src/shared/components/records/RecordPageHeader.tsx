import { useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

type IconComponent = ComponentType<{ className?: string }>;

export interface RecordHeaderSearch {
  query: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Visually hidden label for the input. Defaults to the placeholder. */
  label?: string;
}

export interface RecordHeaderFilter<Id extends string = string> {
  id: Id;
  label: string;
  /** Optional tally rendered as a pill after the label. */
  count?: number;
  icon?: IconComponent;
}

export interface RecordHeaderFilters<Id extends string = string> {
  items: RecordHeaderFilter<Id>[];
  selectedId: Id;
  onSelect: (id: Id) => void;
  /** Accessible name for the chip group, e.g. "Filter problems". */
  label: string;
}

export interface RecordPageHeaderProps<Id extends string = string> {
  /** The page `<h1>`. Every page renders exactly one, and it lives here. */
  title: string;
  icon?: IconComponent;
  /** One line saying what the page holds. */
  description?: ReactNode;
  /** Tally line, e.g. "128 records · 4 images". */
  count?: ReactNode;
  /** "Back to …" link for detail routes, rendered above the title. */
  backLink?: { to: string; label: string };
  search?: RecordHeaderSearch;
  /** Primary action(s): `RecordHeaderLink` / `RecordHeaderButton`. */
  action?: ReactNode;
  filters?: RecordHeaderFilters<Id>;
  /** Escape hatch for per-route visibility only (e.g. `print:hidden`). */
  className?: string;
}

/**
 * The one header every record page wears.
 *
 * Record pages reached from the same navigation used to carry three different
 * banners — plain title, title + search + action, and title + description +
 * chips + search + action — so the furniture moved as you crossed categories.
 * This covers the union of those slots and collapses the ones a page does not
 * pass, so a bare title page and the busiest tab still share one skeleton:
 *
 *   row 1  [back link] title (+icon) / description / count   |   action
 *   row 2  search
 *   row 3  filter chips
 *
 * The action sits beside the title rather than under the search box, so a page
 * with one button ("Add lab result") wears it in the top-right corner at every
 * width instead of spending a whole phone row on it. Pages whose buttons
 * genuinely cannot share the line — Medications has two, Visit prep has three —
 * wrap the whole group onto its own row, right-aligned, rather than shrinking
 * the labels: "Add medication" and "Add allergy" are not interchangeable, and
 * an icon-only banner is the wrong place to make the reader guess which is
 * which. The title block carries `min-w-0` so a long title wraps instead of
 * forcing the banner wider than a 390px viewport.
 */
export function RecordPageHeader<Id extends string = string>({
  title,
  icon: Icon,
  description,
  count,
  backLink,
  search,
  action,
  filters,
  className = '',
}: RecordPageHeaderProps<Id>) {
  return (
    <div
      className={`bg-primary-800 px-4 py-4 text-white sm:px-6 sm:py-5 lg:px-8 ${className}`}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        {/* `flex-wrap` + a 10rem floor on the title is what decides inline vs.
            own-row: one button fits beside a title on a 390px phone, two or
            three do not, and the group drops whole rather than half. */}
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1 basis-40">
            {backLink && (
              <Link
                to={backLink.to}
                className="-mt-1 mb-1 inline-flex min-h-[44px] w-fit items-center gap-1.5 text-sm font-medium text-primary-100 hover:text-white"
              >
                <ArrowLeftIcon className="h-4 w-4 shrink-0 rtl:rotate-180" />
                {backLink.label}
              </Link>
            )}
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-7 w-7 shrink-0" />}
              <h1 className="min-w-0 break-words text-2xl font-bold sm:text-3xl">
                {title}
              </h1>
            </div>
            {description && (
              <p className="mt-1 max-w-3xl text-sm text-primary-100">
                {description}
              </p>
            )}
            {count && <p className="mt-1 text-sm text-primary-100">{count}</p>}
          </div>

          {action && (
            <div className="ms-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
              {action}
            </div>
          )}
        </div>

        {search && (
          <div className="min-w-0 md:max-w-2xl">
            <HeaderSearch {...search} />
          </div>
        )}

        {filters && <HeaderFilters {...filters} />}
      </div>
    </div>
  );
}

function HeaderSearch({
  query,
  onChange,
  placeholder,
  label,
}: RecordHeaderSearch) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label ?? placeholder}</span>
      {/* Logical `start-3` / `ps-10` so the icon swaps sides in Arabic without
          the component having to read the interface language. */}
      <MagnifyingGlassIcon className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        // h-11 is the 44px minimum touch target.
        className="h-11 w-full rounded-md border-0 bg-white pe-3 ps-10 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
      />
    </label>
  );
}

function HeaderFilters<Id extends string>({
  items,
  selectedId,
  onSelect,
  label,
}: RecordHeaderFilters<Id>) {
  const rowRef = useRef<HTMLDivElement>(null);

  // A one-line row can hold the selected chip off-screen — after a reload, or
  // when the selection is set from somewhere other than a tap — which leaves
  // the list filtered by something the reader cannot see. Bring it back only
  // when it is actually out of view, so tapping a visible chip never yanks the
  // row out from under the finger.
  useEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !chip) return;

    const start = chip.offsetLeft;
    const end = start + chip.offsetWidth;
    if (start < row.scrollLeft) {
      row.scrollLeft = start - 8;
    } else if (end > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = end - row.clientWidth + 8;
    }
  }, [selectedId]);

  return (
    // Six chips wrapped onto three rows on a phone, so the banner grew taller
    // than the first record underneath it. Below `sm` they stay on one line and
    // scroll sideways instead — the affordance the record tab strip already
    // uses — and only wrap once there is width to wrap into. The negative
    // margin lets the row bleed to the banner's edge so a half-cut chip reads
    // as "more this way"; the matching padding keeps focus rings unclipped.
    <div
      ref={rowRef}
      role="group"
      aria-label={label}
      className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0"
    >
      {items.map((filter) => {
        const Icon = filter.icon;
        const isSelected = filter.id === selectedId;

        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onSelect(filter.id)}
            aria-pressed={isSelected}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium shadow-sm ring-1 ring-inset ${
              isSelected
                ? 'bg-white text-primary-800 ring-white'
                : 'bg-white/10 text-white ring-white/30 hover:bg-white/20'
            }`}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span>{filter.label}</span>
            {filter.count != null && (
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${
                  isSelected ? 'bg-primary-50 text-primary-800' : 'bg-white/15'
                }`}
              >
                {filter.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Banner actions came in three different skins (solid white, translucent, and
 * a filled `primary-700`). Two are enough: `solid` for the page's primary
 * action, `subtle` for anything sitting next to it.
 *
 * `compact` drops the label below `sm`, leaving a 44px square icon that keeps
 * the title's line on a phone. It is opt-in, not the default: an unlabelled
 * glyph is only safe when the page has exactly one action and the icon is the
 * universal one for it. Two glyphs side by side ask the reader to guess.
 */
function actionClass(variant: 'solid' | 'subtle'): string {
  return `inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ${
    variant === 'solid'
      ? 'bg-white text-primary-800 ring-primary-100 hover:bg-primary-50'
      : 'bg-white/15 text-white ring-white/30 hover:bg-white/25'
  }`;
}

/** The label: always the accessible name, visible unless `compact` on a phone. */
function ActionLabel({
  label,
  compact,
}: {
  label: string;
  compact: boolean;
}): JSX.Element {
  return compact ? (
    <>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="hidden sm:inline">
        {label}
      </span>
    </>
  ) : (
    <>{label}</>
  );
}

export function RecordHeaderLink({
  to,
  label,
  icon: Icon = PlusIcon,
  variant = 'solid',
  compact = false,
}: {
  to: string;
  label: string;
  icon?: IconComponent;
  variant?: 'solid' | 'subtle';
  compact?: boolean;
}) {
  return (
    <Link to={to} className={actionClass(variant)} title={label}>
      <Icon className="h-5 w-5 shrink-0" />
      <ActionLabel label={label} compact={compact} />
    </Link>
  );
}

export function RecordHeaderButton({
  onClick,
  label,
  icon: Icon = PlusIcon,
  variant = 'solid',
  compact = false,
}: {
  onClick: () => void;
  label: string;
  icon?: IconComponent;
  variant?: 'solid' | 'subtle';
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={actionClass(variant)}
      title={label}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <ActionLabel label={label} compact={compact} />
    </button>
  );
}
