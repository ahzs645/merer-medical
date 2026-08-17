import { Link } from 'react-router-dom';

import { Routes as AppRoutes } from '../../../Routes';
import { DentalWorkflowContext } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { safeFormatDate } from '../../../shared/utils/dateFormatters';

/** Enough to act on without turning the overview into the records list. */
const SHOWN = 5;

export function DentalWorkflowContextPanel({
  context,
}: {
  context: DentalWorkflowContext;
}) {
  const { t } = useInterfaceLanguage();
  const actions = context.nextActions;
  const shown = actions.slice(0, SHOWN);

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">
          {t('What to do next')}
        </h2>
        {/* The chart moved to its own tab, so point people at it from here. */}
        <Link
          to={AppRoutes.DentalChart}
          className="text-primary-700 hover:text-primary-900 inline-flex min-h-[44px] items-center text-sm font-medium"
        >
          {t('Open your tooth chart')}
        </Link>
      </div>

      {/* The count is the length of the list beneath it. It used to be a tally
          of active-kind records while the list was four fixed sentences, so a
          reader naturally took the four as the seven. */}
      {actions.length === 0 ? (
        <p className="mt-1 text-sm text-gray-600">
          {t('Nothing open. Every dental record here is complete.')}
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-600">
            {(actions.length === 1
              ? t('{count} record still open')
              : t('{count} records still open')
            ).replace('{count}', `${actions.length}`)}
          </p>
          <ul className="mt-3 divide-y divide-gray-100 rounded-md bg-gray-50">
            {shown.map((action) => (
              <li key={action.id}>
                {/* A row you can open, not a sentence about a category. */}
                <Link
                  to={action.to}
                  className="focus:ring-primary-600 flex min-h-[44px] flex-col justify-center gap-0.5 rounded-md px-3 py-2 hover:bg-gray-100 focus:outline-none focus:ring-2"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {action.label}
                  </span>
                  <span className="text-xs text-gray-600">
                    {formatDetail(action.detail)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {actions.length > shown.length && (
            <Link
              to={AppRoutes.DentalRecords}
              className="text-primary-700 hover:text-primary-900 mt-2 inline-flex min-h-[44px] items-center text-sm font-medium"
            >
              {t('{count} more in Records').replace(
                '{count}',
                `${actions.length - shown.length}`,
              )}
            </Link>
          )}
        </>
      )}

      {context.latestRecord && (
        <p className="mt-3 text-sm text-gray-600">
          {t('Latest')}: {context.latestRecord.title}
        </p>
      )}
    </section>
  );
}

/**
 * The detail line carries an ISO date as its last part, because that is what
 * sorts; the house format is what reads.
 */
function formatDetail(detail: string): string {
  const parts = detail.split(' · ');
  const last = parts[parts.length - 1];
  if (!/^\d{4}-\d{2}-\d{2}/.test(last)) return detail;
  const formatted = safeFormatDate(last, 'PP', last);
  return [...parts.slice(0, -1), formatted].join(' · ');
}
