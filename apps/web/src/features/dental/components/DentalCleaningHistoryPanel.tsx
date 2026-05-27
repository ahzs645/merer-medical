import { Link } from 'react-router-dom';

import { Routes as AppRoutes } from '../../../Routes';
import { isManualRecord } from '../../../shared/utils/manualRecordUtils';
import { DentalRecord } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function DentalCleaningHistoryPanel({
  records,
}: {
  records: DentalRecord[];
}) {
  const { t } = useInterfaceLanguage();
  const cleanings = records
    .filter((record) => record.kind === 'cleaning')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Cleaning history')}
          </h2>
          <p className="text-sm text-gray-600">
            {t(
              'Prophy, periodontal maintenance, scaling/root planing, fluoride, and hygiene recall.',
            )}
          </p>
        </div>
        <span className="text-sm font-medium text-gray-600">
          {t('{count} visits').replace('{count}', `${cleanings.length}`)}
        </span>
      </div>
      {cleanings.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {cleanings.map((record) => (
            <article key={record.id} className="rounded-md bg-gray-50 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  {record.title}
                </h3>
                <div className="flex items-center gap-2">
                  {isManualRecord(record.document) && (
                    <Link
                      to={AppRoutes.EditRecord.replace(
                        ':recordId',
                        record.document.id,
                      )}
                      className="text-xs font-semibold text-primary-700 hover:text-primary-900"
                    >
                      {t('Edit')}
                    </Link>
                  )}
                  <span className="text-xs font-medium uppercase text-gray-500">
                    {record.date?.split('T')[0] || t('Undated')}
                  </span>
                </div>
              </div>
              {record.summary && (
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {record.summary}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Dental cleanings and hygiene recalls will appear here when synced or added.',
          )}
        </p>
      )}
    </section>
  );
}
