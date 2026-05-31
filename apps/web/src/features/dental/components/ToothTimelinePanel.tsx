import { DentalToothTimelineItem } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

const actionStyles = {
  active: 'bg-red-50 text-red-800 ring-red-200',
  planned: 'bg-amber-50 text-amber-800 ring-amber-200',
  complete: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  watch: 'bg-gray-50 text-gray-700 ring-gray-200',
};

export function ToothTimelinePanel({
  items,
}: {
  items: DentalToothTimelineItem[];
}) {
  const { t } = useInterfaceLanguage();

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Tooth timeline')}
          </h2>
          <p className="text-sm text-gray-600">
            {t(
              'Patient-facing history of active issues, planned work, and linked tooth-specific records.',
            )}
          </p>
        </div>
        <span className="text-xs font-semibold uppercase text-gray-500">
          {items.length} {t('timeline items')}
        </span>
      </div>
      {items.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 9).map((item) => (
            <article key={item.id} className="rounded-md bg-gray-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {item.label}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ring-1 ${actionStyles[item.actionLevel]}`}
                >
                  {t(item.actionLevel)}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-gray-800">
                {item.record.title}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {item.date?.split('T')[0] || t('Undated')}
                {item.record.surfaces.length > 0
                  ? ` · ${t('Surfaces')}: ${item.record.surfaces.join(', ')}`
                  : ''}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'The timeline will populate when records include tooth numbers and status.',
          )}
        </p>
      )}
    </section>
  );
}
