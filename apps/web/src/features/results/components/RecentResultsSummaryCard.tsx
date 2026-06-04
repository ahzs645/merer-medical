import { Link } from 'react-router-dom';
import {
  BeakerIcon,
  DocumentTextIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../../Routes';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import { formatResultValue } from '../utils/resultNormalization';
import { useResultsData } from '../hooks/useResultsData';
import { ResultSummary, ResultType } from '../types';

export function RecentResultsSummaryCard() {
  const { t } = useInterfaceLanguage();
  const { groups, detailsById, status } = useResultsData('canadian');
  const results = groups.flatMap((group) => group.results);
  const attention = results.filter((result) => result.abnormal).length;
  const recentResults = results.slice(0, 5);

  return (
    <section className="col-span-6 mb-2 rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Recent results')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('Labs, imaging, reports, and linked result documents.')}
          </p>
        </div>
        <Link
          to={AppRoutes.Results}
          className="text-sm font-semibold text-primary-700 hover:text-primary-900"
        >
          {t('Open results')}
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <SummaryMetric label="Total" value={results.length} />
        <SummaryMetric
          label="Labs"
          value={results.filter((result) => result.type === 'lab').length}
        />
        <SummaryMetric label="Attention" value={attention} tone="attention" />
      </div>

      <div className="mt-3 divide-y divide-gray-100 rounded-md border border-gray-200">
        {status === 'loading' ? (
          <div className="px-3 py-4 text-sm text-gray-600">
            {t('Loading results...')}
          </div>
        ) : recentResults.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-600">
            {t('No results found.')}
          </div>
        ) : (
          recentResults.map((result) => (
            <ResultSummaryRow
              key={result.detailId}
              result={result}
              value={getResultValue(result, detailsById)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'attention';
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold ${
          tone === 'attention' ? 'text-amber-800' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ResultSummaryRow({
  result,
  value,
}: {
  result: ResultSummary;
  value?: string;
}) {
  const Icon = resultTypeIcon(result.type);

  return (
    <Link
      to={AppRoutes.Results}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-3 py-3 hover:bg-primary-50"
    >
      <Icon className="mt-0.5 h-5 w-5 text-primary-700" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">
          {result.title}
        </p>
        <p className="mt-1 truncate text-xs text-gray-600">
          {result.source || resultTypeLabel(result.type)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">
          {value || safeFormatDate(result.date, 'PP', '')}
        </p>
        <p
          className={`text-xs font-medium ${
            result.abnormal ? 'text-amber-700' : 'text-gray-500'
          }`}
        >
          {result.abnormal ? 'Attention' : result.status}
        </p>
      </div>
    </Link>
  );
}

function getResultValue(
  result: ResultSummary,
  detailsById: ReturnType<typeof useResultsData>['detailsById'],
) {
  const detail = detailsById.get(result.detailId);
  if (detail?.lab) return formatResultValue(detail.lab);
  return undefined;
}

function resultTypeIcon(type: ResultType) {
  if (type === 'lab') return BeakerIcon;
  if (type === 'imaging') return PhotoIcon;
  return DocumentTextIcon;
}

function resultTypeLabel(type: ResultType) {
  if (type === 'lab') return 'Lab result';
  if (type === 'imaging') return 'Imaging / radiology';
  if (type === 'diagnostic-report') return 'Diagnostic report';
  if (type === 'document') return 'Document';
  return 'Result';
}
