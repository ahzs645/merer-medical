import { type ReactNode } from 'react';

import { AppPage } from '../AppPage';
import { ErrorPanel } from '../StatusPanel';
import {
  RecordPageHeader,
  type RecordHeaderSearch,
  type RecordPageHeaderProps,
} from './RecordPageHeader';

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
 * Referrals, Procedures, Goals, Histories, Directory, …): the shared record
 * header + a consistent loading / error / empty / no-match treatment, with the
 * tab's own cards rendered as `children` in the success state.
 *
 * Centralizing this kills the per-tab copies of the search input and the local
 * `Placeholder` component, and (critically) gives every tab a real error state
 * instead of an indefinite spinner when a query throws. Header slots are
 * forwarded straight to `RecordPageHeader`, so a tab that only needs a title
 * and a tab that needs search + an action share one banner.
 */
export function RecordListPage({
  title,
  icon,
  description,
  count,
  action,
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
}: Pick<
  RecordPageHeaderProps,
  'title' | 'icon' | 'description' | 'count' | 'action'
> & {
  search?: RecordHeaderSearch;
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
    <AppPage
      banner={
        <RecordPageHeader
          title={title}
          icon={icon}
          description={description}
          count={count}
          action={action}
          search={search}
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 pb-24 sm:px-6 lg:px-8">
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
