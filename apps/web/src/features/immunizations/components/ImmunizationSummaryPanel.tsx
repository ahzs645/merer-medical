import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function ImmunizationSummaryPanel({
  counts,
}: {
  counts: {
    total: number;
    vaccineTypes: number;
    covid: number;
    influenza: number;
    boostersTracked: number;
  };
}) {
  const { t } = useInterfaceLanguage();
  const stats = [
    { label: 'Total doses', value: counts.total },
    { label: 'Vaccine types', value: counts.vaccineTypes },
    { label: 'COVID-19', value: counts.covid },
    { label: 'Influenza', value: counts.influenza },
    { label: 'Booster records', value: counts.boostersTracked },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
        >
          <p className="text-sm font-medium text-gray-600">{t(stat.label)}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
