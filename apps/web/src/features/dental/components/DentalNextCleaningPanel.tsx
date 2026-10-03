import { DentalNextCleaning } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { formatRecordDate } from '../../../shared/utils/dateFormatters';

const stateStyles: Record<DentalNextCleaning['state'], string> = {
  overdue: 'bg-amber-50 text-amber-900 ring-amber-200',
  'due-soon': 'bg-sky-50 text-sky-900 ring-sky-200',
  scheduled: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  'not-due': 'bg-gray-50 text-gray-900 ring-gray-200',
  unknown: 'bg-gray-50 text-gray-900 ring-gray-200',
};

/**
 * The first thing most people want from a dental record: when the next
 * cleaning is due. The data to answer it was always there — a last cleaning
 * and its "six-month recall recommended" — and nothing computed it.
 *
 * Overdue is amber, not red: it is a reminder, not a finding.
 */
export function DentalNextCleaningPanel({
  nextCleaning,
  lastImagingDate,
}: {
  nextCleaning: DentalNextCleaning;
  /** The most recent dental X-ray, photo or scan, if any. */
  lastImagingDate?: string;
}) {
  const { t } = useInterfaceLanguage();
  const { state, dueDate, scheduledDate, lastCleaning, basis, intervalMonths } =
    nextCleaning;
  const date = (value?: string) => formatRecordDate(value, '');

  const headline =
    state === 'scheduled'
      ? t('Booked for {date}').replace('{date}', date(scheduledDate))
      : state === 'overdue'
        ? t('Overdue — it was due {date}').replace('{date}', date(dueDate))
        : state === 'unknown'
          ? t('No cleaning on record yet')
          : t('Due {date}').replace('{date}', date(dueDate));

  const basisText =
    basis === 'recall'
      ? t('Set by your dental office’s recall.')
      : basis === 'stated-interval'
        ? t(
            '{months} months after your last cleaning, as its note recommends.',
          ).replace('{months}', `${intervalMonths}`)
        : basis === 'usual-interval'
          ? t(
              'Six months after your last cleaning — the usual interval. Your dentist may set a different one.',
            )
          : t('Add a cleaning or a recall to see when the next one is due.');

  return (
    <section
      aria-labelledby="dental-next-cleaning"
      className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
    >
      <h2
        id="dental-next-cleaning"
        className="text-base font-semibold text-gray-900"
      >
        {t('Next cleaning')}
      </h2>
      <p
        className={`mt-2 inline-flex rounded-md px-3 py-1.5 text-lg font-semibold ring-1 ${stateStyles[state]}`}
      >
        {headline}
      </p>
      <p className="mt-2 text-sm text-gray-600">{basisText}</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {lastCleaning && (
          <div className="rounded-md bg-gray-50 p-3">
            <dt className="text-xs font-medium text-gray-600">
              {t('Last cleaning')}
            </dt>
            <dd className="mt-0.5 font-medium text-gray-900">
              {date(lastCleaning.date)}
              <span className="block text-xs font-normal text-gray-600">
                {lastCleaning.title}
              </span>
            </dd>
          </div>
        )}
        {lastImagingDate && (
          <div className="rounded-md bg-gray-50 p-3">
            <dt className="text-xs font-medium text-gray-600">
              {t('Last X-rays or scans')}
            </dt>
            <dd className="mt-0.5 font-medium text-gray-900">
              {date(lastImagingDate)}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
