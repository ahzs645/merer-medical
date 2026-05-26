export function ImagingSummaryPanel({
  total,
  dental,
  scans,
  xray,
}: {
  total: number;
  dental: number;
  scans: number;
  xray: number;
}) {
  const stats = [
    { label: 'All imaging', value: total },
    { label: 'Dental', value: dental },
    { label: 'DICOM scans', value: scans },
    { label: 'X-rays', value: xray },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
