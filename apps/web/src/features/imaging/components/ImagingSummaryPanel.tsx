import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function ImagingSummaryPanel({
  total,
  scans,
  xray,
  reports,
  attachments,
}: {
  total: number;
  scans: number;
  xray: number;
  reports: number;
  attachments: number;
}) {
  const { t } = useInterfaceLanguage();
  const stats = [
    { label: 'All imaging', value: total },
    { label: 'DICOM scans', value: scans },
    { label: 'X-rays', value: xray },
    { label: 'Reports', value: reports },
    { label: 'Files', value: attachments },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
