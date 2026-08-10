import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { ImagingCategory, ImagingCategoryCounts } from '../types';

const BREAKDOWN: { key: ImagingCategory; label: string }[] = [
  { key: 'scan', label: 'Scans' },
  { key: 'xray', label: 'X-rays' },
  { key: 'report', label: 'Reports' },
  { key: 'attachment', label: 'Files' },
];

// Tailwind needs the column classes spelled out to keep them in the build.
const COLUMN_CLASSES: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
};

export function ImagingSummaryPanel({
  total,
  byCategory,
}: {
  total: number;
  byCategory: ImagingCategoryCounts;
}) {
  const { t } = useInterfaceLanguage();

  // A record is tagged with every category it matches, so the breakdown counts
  // overlap. Drop the empty ones (nothing to click through to) and say so
  // whenever the parts do not reconcile with the total, rather than presenting
  // them as a split of it.
  const breakdown = BREAKDOWN.filter(({ key }) => byCategory[key] > 0);
  const breakdownTotal = breakdown.reduce(
    (sum, { key }) => sum + byCategory[key],
    0,
  );
  const partsMatchTotal = breakdownTotal === total;

  if (total === 0) {
    return null;
  }

  const stats = [
    { label: 'All imaging', value: total },
    ...breakdown.map(({ key, label }) => ({ label, value: byCategory[key] })),
  ];

  return (
    <div>
      <div
        className={`grid gap-3 sm:grid-cols-2 ${
          COLUMN_CLASSES[stats.length] ?? 'lg:grid-cols-5'
        }`}
      >
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
      {!partsMatchTotal && (
        <p className="mt-2 text-xs text-gray-500">
          A study can appear in more than one group, so these counts do not add
          up to all imaging.
        </p>
      )}
    </div>
  );
}
