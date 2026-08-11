import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { OptometryRecord } from '../types';
import { formatRecordDate } from '../../../shared/utils/dateFormatters';

const metricKinds = new Set(['refraction', 'visualAcuity', 'iop']);

export function EyeMetricsPanel({ records }: { records: OptometryRecord[] }) {
  const { t } = useInterfaceLanguage();
  const metrics = records.filter((record) => metricKinds.has(record.kind));

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">
        {t('Exam measurements')}
      </h2>
      {metrics.length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4">{t('Date')}</th>
                <th className="py-2 pr-4">{t('Type')}</th>
                <th className="py-2 pr-4">{t('Eye')}</th>
                <th className="py-2 pr-4">{t('Title')}</th>
                <th className="py-2">{t('Values')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {metrics.map((record) => (
                <tr key={record.id}>
                  <td className="py-2 pr-4">{formatShortDate(record.date)}</td>
                  <td className="py-2 pr-4">{record.kind}</td>
                  <td className="py-2 pr-4">{record.laterality || '-'}</td>
                  <td className="py-2 pr-4 font-medium text-gray-900">
                    {record.title}
                  </td>
                  <td className="py-2">
                    {Object.entries(record.metrics)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(' · ') ||
                      record.summary ||
                      '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Visual acuity, IOP, refraction, OCT, visual field, and topography metrics will appear here as eye-specific Observations.',
          )}
        </p>
      )}
    </section>
  );
}

function formatShortDate(date?: string) {
  return formatRecordDate(date, '-');
}
