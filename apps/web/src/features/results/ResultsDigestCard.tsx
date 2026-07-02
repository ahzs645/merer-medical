import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  BeakerIcon,
  DocumentTextIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../Routes';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useResultsData } from './hooks/useResultsData';
import { ResultSummary, ResultType } from './types';

const HIGHLIGHT_COUNT = 4;

function digestIcon(type: ResultType) {
  switch (type) {
    case 'imaging':
      return PhotoIcon;
    case 'document':
    case 'diagnostic-report':
      return DocumentTextIcon;
    default:
      return BeakerIcon;
  }
}

/**
 * Compact results digest for the Summary page: headline counts plus the few
 * results that most likely need a look, linking to the full Results hub at
 * /records/results. Replaces the previous approach of embedding the entire
 * master–detail Results hub (stat tiles, reference-standard picker and all)
 * inside Summary, so "results" has one canonical home.
 */
export function ResultsDigestCard() {
  const { t } = useInterfaceLanguage();
  const { groups, status } = useResultsData('canadian');

  const { totals, highlights } = useMemo(() => {
    const results = groups.flatMap((group) => group.results);
    const byDateDesc = (a: ResultSummary, b: ResultSummary) =>
      (b.date ?? '').localeCompare(a.date ?? '');
    const abnormal = results.filter((result) => result.abnormal);
    return {
      totals: {
        total: results.length,
        labs: results.filter((result) => result.type === 'lab').length,
        imaging: results.filter((result) => result.type === 'imaging').length,
        attention: abnormal.length,
      },
      // Lead with abnormal results; when everything is normal, show the most
      // recent results instead so the card is never an empty box.
      highlights: (abnormal.length > 0 ? abnormal : results)
        .slice()
        .sort(byDateDesc)
        .slice(0, HIGHLIGHT_COUNT),
    };
  }, [groups]);

  return (
    <section className="col-span-6 rounded-md bg-gray-50 p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('Results')}
          </h2>
          <p className="text-sm text-gray-600">
            {totals.attention > 0
              ? t('{attention} of {total} results may need attention.')
                  .replace('{attention}', `${totals.attention}`)
                  .replace('{total}', `${totals.total}`)
              : t('{total} results, none flagged for attention.').replace(
                  '{total}',
                  `${totals.total}`,
                )}
          </p>
        </div>
        <Link
          to={AppRoutes.Results}
          className="text-primary-700 hover:text-primary-900 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-sm font-semibold"
        >
          {t('Open all results')}
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      {status === 'loading' ? (
        <p className="mt-3 text-sm text-gray-600">{t('Loading results...')}</p>
      ) : totals.total === 0 ? (
        <p className="mt-3 text-sm text-gray-600">{t('No results found.')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 rounded-md border border-gray-200 bg-white shadow-sm">
          {highlights.map((result) => {
            const Icon = digestIcon(result.type);
            return (
              <li key={result.detailId}>
                <Link
                  to={AppRoutes.Results}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 hover:bg-blue-50"
                >
                  <Icon className="text-primary-700 h-5 w-5" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-900">
                      {result.title}
                    </span>
                    <span className="block text-xs text-gray-600">
                      {safeFormatDate(result.date, 'PP', t('Unknown date'))}
                    </span>
                  </span>
                  {result.abnormal && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {t('Attention')}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
