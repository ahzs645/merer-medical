import { OptometryWorkspaceData } from '../types';

export function OptometrySummaryPanel({
  counts,
}: {
  counts: OptometryWorkspaceData['counts'];
}) {
  const stats = [
    { label: 'Prescriptions', value: counts.prescriptions },
    { label: 'Refractions', value: counts.refractions },
    { label: 'Visual acuity', value: counts.visualAcuity },
    { label: 'IOP', value: counts.iop },
    { label: 'Diagnoses', value: counts.diagnoses },
    { label: 'Imaging', value: counts.imaging },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
        >
          <p className="text-sm font-medium text-gray-600">{stat.label}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
