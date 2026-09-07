import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { OptometryWorkspaceData } from '../types';

export function OptometrySummaryPanel({
  counts,
}: {
  counts: OptometryWorkspaceData['counts'];
}) {
  const { t } = useInterfaceLanguage();
  // Empty categories are left out rather than drawn as a tile reading 0, the
  // same rule the dental overview follows: a count of nothing is not a fact
  // about your eyes, and on an empty workspace seven zeroes were the whole
  // page. The header still reports the totals, including zero.
  const stats = [
    { label: 'Prescriptions', value: counts.prescriptions },
    { label: 'Refractions', value: counts.refractions },
    { label: 'Visual acuity', value: counts.visualAcuity },
    { label: 'IOP', value: counts.iop },
    { label: 'Diagnoses', value: counts.diagnoses },
    { label: 'Surgeries', value: counts.surgeries },
    { label: 'Imaging', value: counts.imaging },
  ].filter((stat) => stat.value > 0);

  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
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
