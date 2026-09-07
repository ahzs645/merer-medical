import { forecastCountries } from '@mere/immunization-forecast';
import { Menu, Transition } from '@headlessui/react';
import {
  ArrowUturnLeftIcon,
  EllipsisHorizontalIcon,
  EyeSlashIcon,
  NoSymbolIcon,
} from '@heroicons/react/20/solid';
import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Routes as AppRoutes } from '../../../Routes';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { StylizedSelect } from '../../../shared/components/StylizedSelect';
import {
  humanizeIsoDatesInText,
  safeFormatDate,
} from '../../../shared/utils/dateFormatters';
import { useDismissedRecommendations } from '../hooks/useDismissedRecommendations';
import { ImmunizationCountry, ImmunizationRecommendation } from '../types';
import {
  isActionable,
  notAssessedStatusMeta,
  recommendationStatusOf,
} from '../utils/recommendationStatus';

/**
 * The exact day, not the month it falls in. "Oct 2025" here with "Estimated
 * next dose date is Oct 22, 2025." printed underneath was the same fact twice,
 * and the less useful copy was the one in the scannable position.
 */
function formatDue(value: string | undefined, fallback: string) {
  return safeFormatDate(value, 'PP', fallback);
}

/** True when the forecast's reason only repeats the Next due field. */
function restatesNextDueDate(recommendation: ImmunizationRecommendation) {
  return Boolean(
    recommendation.nextDueDate &&
      recommendation.reason?.includes(recommendation.nextDueDate),
  );
}

function byStatusOrder(
  a: ImmunizationRecommendation,
  b: ImmunizationRecommendation,
) {
  return (
    recommendationStatusOf(a.status).order -
    recommendationStatusOf(b.status).order
  );
}

export function ImmunizationRecommendationsPanel({
  country,
  onCountryChange,
  recommendations,
  hasRecords,
  hasBirthDate,
}: {
  country: ImmunizationCountry;
  onCountryChange: (country: ImmunizationCountry) => void;
  recommendations: ImmunizationRecommendation[];
  /**
   * Whether any immunization record exists. The forecast cannot tell "no dose
   * on file" from "no dose given", so with nothing on file it marks the whole
   * routine schedule due — five amber "Due now" cards for somebody who may be
   * fully vaccinated. With no records the same rules are shown as the schedule
   * they are, and nothing is counted as needing attention.
   */
  hasRecords: boolean;
  /**
   * Whether the profile carries a birth date. Without one the forecast keeps
   * every age-gated rule ("Adults 50+", "Adolescents and eligible adults")
   * rather than dropping guidance silently — so the panel says out loud that
   * the list is not age-filtered, the way Health maintenance already does.
   */
  hasBirthDate: boolean;
}) {
  const { t } = useInterfaceLanguage();
  const { dismissals, dismiss, restore } = useDismissedRecommendations();
  const [showDismissed, setShowDismissed] = useState(false);

  // Only surface items the patient should act on (overdue / due). Up-to-date
  // and on-record statuses are conveyed via the chips in "Vaccines by type".
  const actionable = useMemo(
    () =>
      recommendations
        .filter((item) => isActionable(item.status))
        .sort(byStatusOrder),
    [recommendations],
  );

  // Hidden / "don't recommend" items drop out of the active list.
  const visible = useMemo(
    () => actionable.filter((item) => !dismissals[item.rule.vaccineGroup]),
    [actionable, dismissals],
  );

  const dismissed = useMemo(
    () =>
      recommendations
        .filter((item) => dismissals[item.rule.vaccineGroup])
        .sort(byStatusOrder),
    [recommendations, dismissals],
  );

  // Nothing to be behind on when nothing has been recorded.
  const attention = hasRecords ? visible.length : 0;

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Booster and schedule recommendations')}
          </h2>
          <p className="mt-0.5 text-sm text-gray-600">
            {!hasRecords
              ? t(
                  'No immunization records yet, so nothing below is a finding about you — it is the routine schedule for the selected country.',
                )
              : attention > 0
                ? `${attention} ${
                    attention === 1
                      ? t(
                          'item needs attention based on the selected schedule.',
                        )
                      : t(
                          'items need attention based on the selected schedule.',
                        )
                  }`
                : dismissed.length > 0
                  ? t('No active recommendations for the selected schedule.')
                  : t('Everything looks up to date for the selected schedule.')}
          </p>
          {/* Two whole sentences rather than a sentence with a link spliced
              into the middle of it: the second half is the link, so neither
              half depends on English word order to translate. */}
          {!hasBirthDate && (
            <p className="mt-1 text-sm text-gray-600">
              {t(
                'Without a birth date this list is not filtered by age, so it includes vaccines for every age group.',
              )}{' '}
              <Link
                to={AppRoutes.Settings}
                className="font-semibold text-primary-700 hover:text-primary-900"
              >
                {t('Add a birth date in Settings')}
              </Link>
            </p>
          )}
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

      {visible.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {visible.map((recommendation) => {
            const meta = hasRecords
              ? recommendationStatusOf(recommendation.status)
              : notAssessedStatusMeta;
            const StatusIcon = meta.icon;
            const group = recommendation.rule.vaccineGroup;
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
                  <div className="flex shrink-0 items-center gap-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta.badge}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {t(meta.label)}
                    </span>
                    <Menu as="div" className="relative">
                      {/* 44px, like every other standalone control in the app.
                          It was 24 — a 20px icon in 2px of padding — and it is
                          the control that dismisses a vaccine recommendation.
                          Negative margin so the larger hit area does not push
                          the status pill off the card's top row. */}
                      <Menu.Button className="-my-2.5 -me-2 flex h-11 w-11 items-center justify-center rounded text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-200">
                        <span className="sr-only">{t('Dismiss options')}</span>
                        <EllipsisHorizontalIcon
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      </Menu.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute end-0 z-20 mt-1 w-56 origin-top-right rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                type="button"
                                onClick={() => dismiss(group, 'snoozed')}
                                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm ${
                                  active
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'text-gray-700'
                                }`}
                              >
                                <EyeSlashIcon
                                  className="h-4 w-4 text-gray-400"
                                  aria-hidden="true"
                                />
                                {t('Hide for now')}
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                type="button"
                                onClick={() => dismiss(group, 'permanent')}
                                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm ${
                                  active
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'text-gray-700'
                                }`}
                              >
                                <NoSymbolIcon
                                  className="h-4 w-4 text-gray-400"
                                  aria-hidden="true"
                                />
                                {t("Don't recommend this")}
                              </button>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </div>
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

                {/* Only when it says something the field above did not. Where
                    a next due date exists the forecast's whole reason is
                    "Estimated next dose date is 2025-10-22." — the field
                    directly above it, in another format, for the second time.
                    The field now carries the exact day, so the sentence has
                    nothing left to add; for every other reason ("No matching
                    doses found in the record.") it is the only explanation
                    there is, and still prints. Dates inside it are normalised
                    on the way out either way: we do not own that string. */}
                {!restatesNextDueDate(recommendation) && (
                  <p className="mt-2.5 text-xs leading-5 text-gray-600">
                    {humanizeIsoDatesInText(t(recommendation.reason))}
                  </p>
                )}
                {recommendation.rule.recommendedAgeText && (
                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    {t('Recommended:')}{' '}
                    {t(recommendation.rule.recommendedAgeText)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {dismissed.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setShowDismissed((value) => !value)}
            className="text-xs font-semibold text-gray-500 transition-colors hover:text-gray-700"
          >
            {showDismissed
              ? t('Hide dismissed')
              : `${t('Show dismissed')} (${dismissed.length})`}
          </button>

          {showDismissed && (
            <ul className="mt-2 space-y-2">
              {dismissed.map((recommendation) => {
                const meta = recommendationStatusOf(recommendation.status);
                const mode = dismissals[recommendation.rule.vaccineGroup];
                return (
                  <li
                    key={recommendation.rule.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-700">
                        {t(recommendation.rule.seriesLabel)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {mode === 'permanent'
                          ? t("Won't recommend")
                          : t('Hidden')}{' '}
                        · {t(meta.label)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => restore(recommendation.rule.vaccineGroup)}
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-700 transition-colors hover:text-primary-900"
                    >
                      <ArrowUturnLeftIcon
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      {t('Restore')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
