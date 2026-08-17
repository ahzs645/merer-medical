import { DentalWorkspaceData } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function DentalSummaryPanel({
  counts,
}: {
  counts: DentalWorkspaceData['counts'];
}) {
  const { t } = useInterfaceLanguage();
  // No Images tile: the page header already reads "N dental images or scans".
  // Empty categories are left out rather than drawn as a tile reading 0: a
  // count of nothing is not a fact about your teeth, and eight tiles including
  // "Procedures 0" pushed the one panel with something to act on below them.
  const stats = [
    { label: 'Findings', value: counts.findings },
    { label: 'Conditions', value: counts.conditions },
    { label: 'Cleanings', value: counts.cleanings },
    { label: 'Orthodontics', value: counts.orthodontics },
    { label: 'Procedures', value: counts.procedures },
    { label: 'Treatment plan', value: counts.treatmentPlan },
    { label: 'Perio', value: counts.perio },
    { label: 'Surgery', value: counts.surgery },
  ].filter((stat) => stat.value > 0);

  if (stats.length === 0) return null;

  return (
    // A single-digit count doesn't need a full-width card: three across keeps
    // every tile on one phone screen instead of eight mostly-empty rows.
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-8">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-md bg-white p-3 shadow-sm ring-1 ring-gray-200 sm:p-4"
        >
          <p className="text-xs font-medium leading-tight text-gray-600 sm:text-sm">
            {t(stat.label)}
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 sm:mt-2 sm:text-3xl">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
