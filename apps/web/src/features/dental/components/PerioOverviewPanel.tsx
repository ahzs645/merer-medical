import { PerioOverview } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function PerioOverviewPanel({ overview }: { overview: PerioOverview }) {
  const { t } = useInterfaceLanguage();

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">
        {t('Perio overview')}
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric label="Perio records" value={overview.recordCount} />
        <Metric label="Affected teeth" value={overview.affectedTeeth.length} />
        <Metric
          label="Maintenance"
          value={overview.maintenanceRecords.length}
        />
      </div>
      {overview.riskSignals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {overview.riskSignals.map((signal) => (
            <span
              key={signal}
              className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
            >
              {t(signal)}
            </span>
          ))}
        </div>
      )}
      {overview.latestRecord ? (
        <div className="mt-3">
          <p className="line-clamp-2 text-sm text-gray-700">
            {overview.latestRecord.title}
          </p>
          {overview.latestMeasurements.length > 0 && (
            <div className="mt-3 grid gap-2">
              {overview.latestMeasurements.map((measurement) => (
                <div
                  key={measurement.record.id}
                  className="rounded-md bg-gray-50 p-3 text-sm text-gray-700"
                >
                  <p className="font-semibold text-gray-900">
                    {measurement.date?.split('T')[0] || t('Undated')}
                    {measurement.teeth.length > 0
                      ? ` · ${t('Teeth')}: ${measurement.teeth.join(', ')}`
                      : ''}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {[
                      measurement.pocketDepths &&
                        `${t('Pockets')}: ${measurement.pocketDepths}`,
                      measurement.recession &&
                        `${t('Recession')}: ${measurement.recession}`,
                      measurement.bleeding &&
                        `${t('BOP')}: ${measurement.bleeding}`,
                      measurement.plaque &&
                        `${t('Plaque')}: ${measurement.plaque}`,
                      measurement.mobility &&
                        `${t('Mobility')}: ${measurement.mobility}`,
                      measurement.furcation &&
                        `${t('Furcation')}: ${measurement.furcation}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Periodontal measurements, risk signals, and maintenance history will appear here.',
          )}
        </p>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const { t } = useInterfaceLanguage();

  return (
    <div className="rounded-md bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase text-gray-500">
        {t(label)}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
