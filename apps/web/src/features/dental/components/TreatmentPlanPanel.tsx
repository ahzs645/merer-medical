import { TreatmentPlanItem } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function TreatmentPlanPanel({ items }: { items: TreatmentPlanItem[] }) {
  const { t } = useInterfaceLanguage();

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">
        {t('Treatment plan')}
      </h2>
      {items.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {items.slice(0, 6).map((item) => (
            <article key={item.id} className="rounded-md bg-gray-50 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  {item.record.title}
                </h3>
                <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase">
                  <span
                    className={
                      item.priority === 'high'
                        ? 'text-red-700'
                        : 'text-gray-500'
                    }
                  >
                    {t(item.priority)}
                  </span>
                  <span className="text-primary-700">{t(item.status)}</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-600">{t(item.label)}</p>
              {item.record.summary && (
                <p className="mt-2 line-clamp-2 text-sm text-gray-700">
                  {item.record.summary}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t('Planned dental procedures and referrals will appear here.')}
        </p>
      )}
    </section>
  );
}
