import { OdontogramToothStatus } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

const actionStyles = {
  active: 'border-red-200 bg-red-50 text-red-800',
  planned: 'border-amber-200 bg-amber-50 text-amber-800',
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  watch: 'border-gray-200 bg-gray-50 text-gray-700',
};

export function OdontogramStatusPanel({
  statuses,
}: {
  statuses: OdontogramToothStatus[];
}) {
  const { t } = useInterfaceLanguage();
  const actionable = statuses.filter(
    (status) =>
      status.actionLevel === 'active' || status.actionLevel === 'planned',
  );

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Actionable odontogram')}
          </h2>
          <p className="text-sm text-gray-600">
            {t(
              'Tooth-level status derived from findings, conditions, plans, and completed care.',
            )}
          </p>
        </div>
        <span className="text-xs font-semibold uppercase text-gray-500">
          {actionable.length} {t('needs review')}
        </span>
      </div>
      {statuses.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {statuses.slice(0, 12).map((status) => (
            <article
              key={status.tooth}
              className={`rounded-md border p-3 ${actionStyles[status.actionLevel]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{status.label}</h3>
                <span className="text-xs font-semibold uppercase">
                  {t(status.actionLevel)}
                </span>
              </div>
              <p className="mt-1 text-xs">
                {status.recordCount} {t('records')}
                {status.surfaces.length > 0
                  ? ` · ${t('Surfaces')}: ${status.surfaces.join(', ')}`
                  : ''}
              </p>
              {status.latestRecord && (
                <p className="mt-2 line-clamp-2 text-sm">
                  {status.latestRecord.title}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Tooth-specific findings will appear here when records include tooth numbers.',
          )}
        </p>
      )}
    </section>
  );
}
