import { type ComponentType, type ReactNode } from 'react';
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
 *   row 1  [back link] title (+icon) / description / count   |   search + action
 *   row 2  filter chips
 *
 * Everything stacks below `md`. The shrinkable children (title block, search
 * box) carry `min-w-0` so a long title or placeholder wraps instead of forcing
 * the banner wider than a 390px viewport.
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
  const hasControls = Boolean(search || action);

  return (
    <div
      className={`bg-primary-800 px-4 py-4 text-white sm:px-6 sm:py-5 lg:px-8 ${className}`}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
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

          {hasControls && (
            <div
              className={`flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center ${
                // A search box claims half the row and then stops; an action
                // row keeps its intrinsic width so it hugs the right edge.
                // `w-full` (not `flex-1`) so the title and the search box give
                // ground in proportion instead of the title collapsing to one
                // word per line at exactly `md`.
                search ? 'md:max-w-2xl' : 'md:w-auto'
              }`}
            >
              {search && <HeaderSearch {...search} />}
              {action && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {action}
                </div>
              )}
            </div>
          )}
        </div>

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
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {items.map((filter) => {
        const Icon = filter.icon;
        const isSelected = filter.id === selectedId;

        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onSelect(filter.id)}
            aria-pressed={isSelected}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-md px-3 text-sm font-medium shadow-sm ring-1 ring-inset ${
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
 */
function actionClass(variant: 'solid' | 'subtle'): string {
  return `inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ${
    variant === 'solid'
      ? 'bg-white text-primary-800 ring-primary-100 hover:bg-primary-50'
      : 'bg-white/15 text-white ring-white/30 hover:bg-white/25'
  }`;
}

export function RecordHeaderLink({
  to,
  label,
  icon: Icon = PlusIcon,
  variant = 'solid',
}: {
  to: string;
  label: string;
  icon?: IconComponent;
  variant?: 'solid' | 'subtle';
}) {
  return (
    <Link to={to} className={actionClass(variant)}>
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}

export function RecordHeaderButton({
  onClick,
  label,
  icon: Icon = PlusIcon,
  variant = 'solid',
}: {
  onClick: () => void;
  label: string;
  icon?: IconComponent;
  variant?: 'solid' | 'subtle';
}) {
  return (
    <button type="button" onClick={onClick} className={actionClass(variant)}>
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </button>
  );
}
