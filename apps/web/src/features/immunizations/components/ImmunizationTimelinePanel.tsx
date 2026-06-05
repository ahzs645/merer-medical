import { Link } from 'react-router-dom';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../../Routes';
import { isManualRecord } from '../../../shared/utils/manualRecordUtils';
import { ImmunizationRecord } from '../types';

export function ImmunizationTimelinePanel({
  records,
}: {
  records: ImmunizationRecord[];
}) {
  const { t } = useInterfaceLanguage();

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Immunization timeline')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('Doses sorted by administration date.')}
          </p>
        </div>
        <span className="text-xs font-semibold uppercase text-gray-500">
          {records.length} {t('doses')}
        </span>
      </div>

      {records.length > 0 ? (
        <ol className="mt-4">
          {records.map((record, index) => (
            <li key={record.id} className="relative flex gap-3 pb-4">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-primary-600 ring-2 ring-white" />
                {index !== records.length - 1 && (
                  <span className="w-px flex-1 bg-gray-200" />
                )}
              </div>
              <div className="min-w-0 flex-1 rounded-md bg-gray-50 p-3 ring-1 ring-gray-200">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {record.vaccineName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {[record.manufacturer, record.performer]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
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
                    <span className="text-xs font-medium text-gray-500">
                      {record.date?.split('T')[0] || t('Undated')}
                    </span>
                  </div>
                </div>
                {(record.lotNumber || record.status || record.doseNumber) && (
                  <p className="mt-2 text-xs text-gray-600">
                    {[
                      record.doseNumber && `${t('Dose')} ${record.doseNumber}`,
                      record.lotNumber && `${t('Lot')} ${record.lotNumber}`,
                      record.status && `${t('Status')}: ${record.status}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {record.summary && (
                  <p className="mt-2 whitespace-pre-line text-xs leading-5 text-gray-600">
                    {record.summary}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Immunizations will appear here once they are added manually or synced from a patient portal.',
          )}
        </p>
      )}
    </section>
  );
}
