import { type ReactNode } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { AppPage } from '../AppPage';
import { ErrorPanel } from '../StatusPanel';
import {
  RecordPageHeader,
  type RecordHeaderSearch,
  type RecordPageHeaderProps,
} from './RecordPageHeader';

/** Centered placeholder card for loading / empty / no-match states. */
export function EmptyState({
  text,
  icon,
  action,
}: {
  text: string;
  icon?: ReactNode;
  /** Second door to the page's add flow, drawn under the text. */
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
      {icon && (
        <div className="bg-primary-50 text-primary-700 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
          {icon}
        </div>
      )}
      {text}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * The empty state's own add affordance. The banner action is white-on-primary
 * because it sits on the dark banner; on the white placeholder card it would
 * disappear, so these are the filled version Problems and Care plans already
 * hand-rolled.
 */
const emptyActionClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700';

export function EmptyStateLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className={emptyActionClass}>
      <PlusIcon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}

export function EmptyStateButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button type="button" onClick={onClick} className={emptyActionClass}>
      <PlusIcon className="h-5 w-5 shrink-0" />
      {label}
    </button>
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
  emptyAction,
  isNoMatch = false,
  noMatchText,
  dialogs,
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
  /**
   * Add affordance for the empty state. A brand-new user meets this card
   * before they meet anything else, and the banner action alone reads as
   * decoration next to "No allergies recorded yet."
   */
  emptyAction?: ReactNode;
  isNoMatch?: boolean;
  noMatchText?: string;
  /**
   * Page-level dialogs, mounted in every status. `children` render only in the
   * success-and-non-empty branch, so a modal placed there is unreachable from
   * the empty list its button sits above — the Allergies "Add allergy" button
   * was a dead click for exactly that reason, and reopened the dialog by
   * itself once a record finally existed.
   */
  dialogs?: ReactNode;
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
      {dialogs}
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <EmptyState text={loadingText} />
          ) : status === 'error' ? (
            <ErrorPanel error={error} text={errorText} />
          ) : isEmpty ? (
            <EmptyState
              text={emptyText}
              icon={emptyIcon}
              action={emptyAction}
            />
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
