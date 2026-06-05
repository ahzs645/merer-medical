import { forecastCountries } from '@mere/immunization-forecast';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { ImmunizationCountry, ImmunizationRecommendation } from '../types';

const statusClasses: Record<ImmunizationRecommendation['status'], string> = {
  overdue: 'bg-red-50 text-red-700 ring-red-200',
  due: 'bg-amber-50 text-amber-700 ring-amber-200',
  upcoming: 'bg-blue-50 text-blue-700 ring-blue-200',
  complete: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  history: 'bg-gray-50 text-gray-700 ring-gray-200',
};

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

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Booster and schedule recommendations')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('General timing checks based on the selected country schedule.')}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {t('Country')}
          <select
            value={country}
            onChange={(event) =>
              onCountryChange(event.target.value as ImmunizationCountry)
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {forecastCountries.map((item) => (
              <option key={item.code} value={item.code}>
                {t(item.label)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {recommendations.map((recommendation) => (
          <article
            key={recommendation.rule.id}
            className="rounded-md bg-gray-50 p-3 ring-1 ring-gray-200"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {t(recommendation.rule.seriesLabel)}
                </h3>
                <p className="text-xs text-gray-600">
                  {t(recommendation.rule.vaccineName)}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${statusClasses[recommendation.status]}`}
              >
                {t(recommendation.status)}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="font-medium text-gray-500">{t('Last dose')}</dt>
                <dd className="text-gray-900">
                  {recommendation.lastDoseDate?.split('T')[0] ||
                    t('None found')}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">{t('Next due')}</dt>
                <dd className="text-gray-900">
                  {recommendation.nextDueDate || t('Depends')}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">{t('Doses')}</dt>
                <dd className="text-gray-900">{recommendation.doseCount}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">
                  {t('Recommended')}
                </dt>
                <dd className="text-gray-900">
                  {t(recommendation.rule.recommendedAgeText || 'Review')}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs leading-5 text-gray-600">
              {t(recommendation.reason)}
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              {t(recommendation.rule.notes)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
