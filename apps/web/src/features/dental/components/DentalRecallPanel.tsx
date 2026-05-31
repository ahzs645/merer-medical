import { DentalRecallItem } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function DentalRecallPanel({
  recalls,
}: {
  recalls: DentalRecallItem[];
}) {
  const { t } = useInterfaceLanguage();

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">
        {t('Recall and scheduling')}
      </h2>
      {recalls.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {recalls.slice(0, 5).map((recall) => (
            <article key={recall.id} className="rounded-md bg-gray-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {recall.type || recall.record.title}
                </h3>
                <span className="text-xs font-semibold uppercase text-gray-500">
                  {recall.dueDate?.split('T')[0] || t('No due date')}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-700">
                {[recall.provider, recall.location]
                  .filter(Boolean)
                  .join(' · ') || t('Recall record')}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Prophy, child prophy, perio maintenance, hygiene recall, and appointment context will appear here.',
          )}
        </p>
      )}
    </section>
  );
}
