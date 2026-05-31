import { Link } from 'react-router-dom';

import { Routes as AppRoutes } from '../../../Routes';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { isManualRecord } from '../../../shared/utils/manualRecordUtils';
import { DentalRecord } from '../types';

const surgeryTracks = [
  'consult',
  'extraction',
  'implant surgery',
  'bone graft',
  'post-op',
  'referral',
];

export function DentalSurgeryPanel({ records }: { records: DentalRecord[] }) {
  const { t } = useInterfaceLanguage();
  const surgeryRecords = records
    .filter((record) => record.kind === 'surgery')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Dental surgery')}
          </h2>
          <p className="text-sm text-gray-600">
            {t(
              'Consults, extractions, implant surgery, grafting, post-op notes, and referrals.',
            )}
          </p>
        </div>
        <Link
          to={`${AppRoutes.AddRecord}?specialty=dental&dental=oralSurgeryConsult`}
          className="text-sm font-semibold text-primary-700 hover:text-primary-900"
        >
          {t('Add surgery record')}
        </Link>
      </div>
      {surgeryRecords.length > 0 ? (
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {surgeryRecords.map((record) => (
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
              <p className="mt-1 text-sm text-gray-600">
                {record.toothNumbers.length > 0
                  ? `${t('Teeth')}: ${record.toothNumbers.join(', ')}`
                  : t('No tooth number detected')}
                {record.details?.procedureCode
                  ? ` · ${t('Code')}: ${record.details.procedureCode}`
                  : ''}
              </p>
              {record.summary && (
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-700">
                  {record.summary}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {surgeryTracks.map((item) => (
            <div key={item} className="rounded-md bg-gray-50 p-3">
              <p className="text-sm font-semibold capitalize text-gray-900">
                {t(item)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
