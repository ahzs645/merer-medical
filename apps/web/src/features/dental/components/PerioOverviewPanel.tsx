import { PerioExamSummary, PerioOverview } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { useToothNumbering } from '../hooks/useToothNumbering';
import { formatTeeth } from '../utils/dentalReferenceData';
import { formatRecordDate } from '../../../shared/utils/dateFormatters';

type Band = 'healthy' | 'watch' | 'disease';

/**
 * Pocket depth bands as patient guides give them: 1–3 mm is healthy, 4 mm is
 * borderline, 5 mm and deeper goes with attachment loss.
 */
function bandFor(depth: number): Band {
  if (depth <= 3) return 'healthy';
  if (depth === 4) return 'watch';
  return 'disease';
}

const bandStyles: Record<Band, string> = {
  healthy: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  watch: 'bg-amber-50 text-amber-900 ring-amber-200',
  disease: 'bg-red-50 text-red-900 ring-red-200',
};

/**
 * Your gums, in words. This used to be three counts of records ("Perio
 * records 2, Affected teeth 3, Maintenance 2"), three lower-case keywords
 * scraped from notes ("bleeding" — including "bleeding improved"), and the
 * title of whichever record the classifier had called perio, which was a
 * treatment-plan PDF.
 */
export function PerioOverviewPanel({ overview }: { overview: PerioOverview }) {
  const { t } = useInterfaceLanguage();
  const [numbering] = useToothNumbering();
  const { latestExam, previousExam } = overview;

  return (
    <section
      aria-labelledby="dental-perio"
      className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
    >
      <h2 id="dental-perio" className="text-base font-semibold text-gray-900">
        {t('Gums (perio)')}
      </h2>
      {latestExam ? (
        <>
          <p className="mt-1 text-sm text-gray-600">
            {t('Last measured {date}').replace(
              '{date}',
              formatRecordDate(latestExam.date, t('Undated')),
            )}
          </p>
          <Verdict exam={latestExam} numbering={numbering} />
          <dl className="mt-3 grid grid-cols-3 gap-2">
            <Stat
              label={t('Deepest pocket')}
              value={`${latestExam.deepest?.depth} mm`}
            />
            <Stat
              label={t('Sites 4 mm+')}
              value={`${latestExam.sitesFourPlus} / ${latestExam.sitesProbed}`}
            />
            <Stat
              label={t('Bleeding sites')}
              value={
                latestExam.bleedingSites === undefined
                  ? '—'
                  : `${latestExam.bleedingSites}`
              }
            />
          </dl>
          {previousExam?.deepest && latestExam.deepest && (
            <p className="mt-2 text-sm text-gray-700">
              {compare(latestExam.deepest.depth, previousExam.deepest.depth, t)
                .replace('{depth}', `${previousExam.deepest.depth}`)
                .replace(
                  '{date}',
                  formatRecordDate(previousExam.date, t('Undated')),
                )}
            </p>
          )}
          <p className="mt-3 text-xs text-gray-600">
            {t(
              'Pocket depth: 1–3 mm is healthy, 4 mm is borderline, 5 mm or more is a sign of gum disease.',
            )}
          </p>
        </>
      ) : overview.latestRecord ? (
        <>
          <p className="mt-2 text-sm text-gray-700">
            {t(
              'Your gum records have no pocket measurements to show — only notes.',
            )}
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {overview.latestRecord.title}
            <span className="font-normal text-gray-600">
              {' · '}
              {formatRecordDate(overview.latestRecord.date, t('Undated'))}
            </span>
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {t(
            'No gum measurements yet. A periodontal exam measures the pocket around each tooth in millimetres.',
          )}
        </p>
      )}
      {overview.maintenanceRecords.length > 0 && (
        <p className="mt-2 text-sm text-gray-600">
          {t('Gum maintenance visits on record: {count}').replace(
            '{count}',
            `${overview.maintenanceRecords.length}`,
          )}
        </p>
      )}
    </section>
  );
}

function Verdict({
  exam,
  numbering,
}: {
  exam: PerioExamSummary;
  numbering: 'universal' | 'fdi';
}) {
  const { t } = useInterfaceLanguage();
  const deepest = exam.deepest?.depth ?? 0;
  const band = bandFor(deepest);
  const teeth = exam.deepest?.teeth.length
    ? formatTeeth(exam.deepest.teeth, numbering)
    : '';
  const text =
    band === 'healthy'
      ? t('Healthy: every site measured was 3 mm or less.')
      : band === 'watch'
        ? t(
            'Mostly healthy. {count} at 4 mm, which dentists keep an eye on.',
          ).replace(
            '{count}',
            exam.sitesFourPlus === 1
              ? t('One site')
              : t('{n} sites').replace('{n}', `${exam.sitesFourPlus}`),
          )
        : (teeth
            ? t(
                '{count} at 5 mm or deeper — deepest {depth} mm, tooth {teeth}. Pockets this deep go with gum disease your dentist will want to follow.',
              )
            : t(
                '{count} at 5 mm or deeper — deepest {depth} mm. Pockets this deep go with gum disease your dentist will want to follow.',
              )
          )
            .replace(
              '{count}',
              exam.sitesFivePlus === 1
                ? t('One site')
                : t('{n} sites').replace('{n}', `${exam.sitesFivePlus}`),
            )
            .replace('{depth}', `${deepest}`)
            .replace('{teeth}', teeth);
  return (
    <p
      className={`mt-2 rounded-md px-3 py-2 text-sm font-medium ring-1 ${bandStyles[band]}`}
    >
      {text}
    </p>
  );
}

function compare(
  latest: number,
  previous: number,
  t: (key: string) => string,
): string {
  if (latest < previous)
    return t('Better than last time: deepest was {depth} mm on {date}.');
  if (latest > previous)
    return t('Deeper than last time: deepest was {depth} mm on {date}.');
  return t('Same deepest pocket as last time ({depth} mm on {date}).');
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-2">
      <dt className="text-xs font-medium text-gray-600">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold text-gray-900">{value}</dd>
    </div>
  );
}
