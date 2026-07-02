import { type ReactNode } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { AppPage } from '../AppPage';
import { GenericBanner } from '../GenericBanner';
import { ErrorPanel } from '../StatusPanel';

/**
 * Shared search box used across the record tabs. 44px tall so it clears the
 * minimum touch-target size on mobile.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Accessible label (visually hidden). */
  label: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="focus:border-primary-500 focus:ring-primary-500 h-11 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-1"
      />
    </label>
  );
}

/** Centered placeholder card for loading / empty / no-match states. */
export function EmptyState({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
      {icon && (
        <div className="bg-primary-50 text-primary-700 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
          {icon}
        </div>
      )}
      {text}
    </div>
  );
}

export type RecordListStatus = 'loading' | 'success' | 'error';

/**
 * Standard scaffold for the "simple" record tabs (Allergies, Encounters,
 * Referrals, Procedures, Goals, Histories, Directory, …): banner + optional
 * search box + a consistent loading / error / empty / no-match treatment, with
 * the tab's own cards rendered as `children` in the success state.
 *
 * Centralizing this kills the per-tab copies of the search input, the local
 * `Placeholder` component, and (critically) gives every tab a real error state
 * instead of an indefinite spinner when a query throws.
 */
export function RecordListPage({
  title,
  bannerAction,
  search,
  status,
  error,
  loadingText,
  errorText,
  isEmpty,
  emptyText,
  emptyIcon,
  isNoMatch = false,
  noMatchText,
  children,
}: {
  title: string;
  bannerAction?: ReactNode;
  search?: {
    query: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
  };
  status: RecordListStatus;
  error?: Error | null;
  loadingText: string;
  errorText?: string;
  isEmpty: boolean;
  emptyText: string;
  emptyIcon?: ReactNode;
  isNoMatch?: boolean;
  noMatchText?: string;
  children: ReactNode;
}) {
  return (
    <AppPage banner={<GenericBanner text={title} action={bannerAction} />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {search && (
            <SearchInput
              value={search.query}
              onChange={search.onChange}
              placeholder={search.placeholder}
              label={search.label}
            />
          )}

          {status === 'loading' ? (
            <EmptyState text={loadingText} />
          ) : status === 'error' ? (
            <ErrorPanel error={error} text={errorText} />
          ) : isEmpty ? (
            <EmptyState text={emptyText} icon={emptyIcon} />
          ) : isNoMatch ? (
            <EmptyState text={noMatchText || 'No records match this search.'} />
          ) : (
            children
          )}
        </div>
      </div>
    </AppPage>
  );
}
