import { Link } from 'react-router-dom';

import { Routes as AppRoutes } from '../../../Routes';
import { isManualRecord } from '../../../shared/utils/manualRecordUtils';
import { DentalRecord } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function DentalRecordsPanel({ records }: { records: DentalRecord[] }) {
  const { t } = useInterfaceLanguage();

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">
        {t('Dental records projection')}
      </h2>
      {records.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {records
            .filter((record) => record.kind !== 'cleaning')
            .slice(0, 12)
            .map((record) => (
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
                      {record.kind}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {record.toothNumbers.length > 0
                    ? `${t('Teeth')}: ${record.toothNumbers.join(', ')}`
                    : t('No tooth number detected')}
                  {record.surfaces.length > 0
                    ? ` · ${t('Surfaces')}: ${record.surfaces.join(', ')}`
                    : ''}
                </p>
                {[
                  record.details?.dentalArch &&
                    `${t('Arch')}: ${record.details.dentalArch}`,
                  record.details?.dentition &&
                    `${t('Dentition')}: ${record.details.dentition}`,
                  record.details?.dentalStatus &&
                    `${t('Status')}: ${record.details.dentalStatus}`,
                  record.details?.dentalSeverity &&
                    `${t('Severity')}: ${record.details.dentalSeverity}`,
                  record.details?.procedureCode &&
                    `${t('Code')}: ${record.details.procedureCode}`,
                ].filter(Boolean).length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {[
                      record.details?.dentalArch &&
                        `${t('Arch')}: ${record.details.dentalArch}`,
                      record.details?.dentition &&
                        `${t('Dentition')}: ${record.details.dentition}`,
                      record.details?.dentalStatus &&
                        `${t('Status')}: ${record.details.dentalStatus}`,
                      record.details?.dentalSeverity &&
                        `${t('Severity')}: ${record.details.dentalSeverity}`,
                      record.details?.procedureCode &&
                        `${t('Code')}: ${record.details.procedureCode}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {record.summary && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-700">
                    {record.summary}
                  </p>
                )}
              </article>
            ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Dental findings, procedures, treatment plans, referrals, and perio records will appear here when synced or added.',
          )}
        </p>
      )}
    </section>
  );
}
