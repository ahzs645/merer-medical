import { DentalWorkspaceData } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function DentalSummaryPanel({
  counts,
}: {
  counts: DentalWorkspaceData['counts'];
}) {
  const { t } = useInterfaceLanguage();
  const stats = [
    { label: 'Findings', value: counts.findings },
    { label: 'Conditions', value: counts.conditions },
    { label: 'Cleanings', value: counts.cleanings },
    { label: 'Orthodontics', value: counts.orthodontics },
    { label: 'Procedures', value: counts.procedures },
    { label: 'Treatment plan', value: counts.treatmentPlan },
    { label: 'Perio', value: counts.perio },
    { label: 'Images', value: counts.images },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
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
