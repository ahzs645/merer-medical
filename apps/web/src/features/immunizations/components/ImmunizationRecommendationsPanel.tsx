import { forecastCountries } from '@mere/immunization-forecast';
import { useMemo } from 'react';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { StylizedSelect } from '../../../shared/components/StylizedSelect';
import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import { ImmunizationCountry, ImmunizationRecommendation } from '../types';
import {
  isActionable,
  recommendationStatusOf,
} from '../utils/recommendationStatus';

function formatDue(value: string | undefined, fallback: string) {
  return safeFormatDate(value, 'MMM yyyy', fallback);
}

export function ImmunizationRecommendationsPanel({
  country,
  onCountryChange,
  recommendations,
}: {
  country: ImmunizationCountry;
  onCountryChange: (country: ImmunizationCountry) => void;
  recommendations: ImmunizationRecommendation[];
}) {
  const { t } = useInterfaceLanguage();

  // Only surface items the patient should act on (overdue / due). Up-to-date
  // and on-record statuses are conveyed via the chips in "Vaccines by type".
  const actionable = useMemo(
    () =>
      recommendations
        .filter((item) => isActionable(item.status))
        .sort(
          (a, b) =>
            recommendationStatusOf(a.status).order -
            recommendationStatusOf(b.status).order,
        ),
    [recommendations],
  );

  const attention = actionable.length;

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Booster and schedule recommendations')}
          </h2>
          <p className="mt-0.5 text-sm text-gray-600">
            {attention > 0
              ? `${attention} ${t('item(s) need attention based on the selected schedule.')}`
              : t('Everything looks up to date for the selected schedule.')}
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 sm:w-44">
          {t('Country schedule')}
          <StylizedSelect<ImmunizationCountry>
            value={country}
            onChange={onCountryChange}
            options={forecastCountries.map((item) => ({
              value: item.code,
              label: t(item.label),
            }))}
          />
        </label>
      </div>

      {actionable.length === 0 ? null : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {actionable.map((recommendation) => {
            const meta = recommendationStatusOf(recommendation.status);
            const StatusIcon = meta.icon;
            return (
              <article
                key={recommendation.rule.id}
                className="flex flex-col rounded-lg border border-gray-200 bg-white p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t(recommendation.rule.seriesLabel)}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {t(recommendation.rule.vaccineName)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.badge}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(meta.label)}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md bg-gray-50 px-2 py-1.5">
                    <dt className="font-medium text-gray-500">
                      {t('Last dose')}
                    </dt>
                    <dd className="mt-0.5 font-medium text-gray-900">
                      {safeFormatDate(
                        recommendation.lastDoseDate,
                        'MMM yyyy',
                        t('None'),
                      )}
                    </dd>
                  </div>
                  <div className="rounded-md bg-gray-50 px-2 py-1.5">
                    <dt className="font-medium text-gray-500">
                      {t('Next due')}
                    </dt>
                    <dd className="mt-0.5 font-medium text-gray-900">
                      {formatDue(recommendation.nextDueDate, t('Depends'))}
                    </dd>
                  </div>
                  <div className="rounded-md bg-gray-50 px-2 py-1.5">
                    <dt className="font-medium text-gray-500">{t('Doses')}</dt>
                    <dd className="mt-0.5 font-medium text-gray-900">
                      {recommendation.doseCount}
                    </dd>
                  </div>
                </dl>

                <p className="mt-2.5 text-xs leading-5 text-gray-600">
                  {t(recommendation.reason)}
                </p>
                {recommendation.rule.recommendedAgeText && (
                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    {t('Recommended:')}{' '}
                    {t(recommendation.rule.recommendedAgeText)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
