import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { ImagingCategory, ImagingCategoryCounts } from '../types';

const FILTERS: { key: ImagingCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'xray', label: 'X-rays' },
  { key: 'ct', label: 'CT' },
  { key: 'mri', label: 'MRI' },
  { key: 'ultrasound', label: 'Ultrasound' },
  { key: 'scan', label: 'Scans' },
  { key: 'report', label: 'Reports' },
  { key: 'attachment', label: 'Files' },
  { key: 'dental', label: 'Dental' },
  { key: 'optometry', label: 'Eye care' },
];

export function ImagingCategoryTabs({
  selected,
  onSelect,
  total,
  counts,
}: {
  selected: ImagingCategory | 'all';
  onSelect: (category: ImagingCategory | 'all') => void;
  total: number;
  counts: ImagingCategoryCounts;
}) {
  const { t } = useInterfaceLanguage();

  // Nothing to filter: the empty state below says more than a lone "All 0".
  if (total === 0) {
    return null;
  }

  const filters = FILTERS.map((filter) => ({
    ...filter,
    count: filter.key === 'all' ? total : counts[filter.key],
  })).filter(
    // Hide chips that would return an empty list, but keep the active one so
    // the filter you are on is always visible and undoable.
    (filter) => filter.count > 0 || filter.key === selected,
  );

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => onSelect(filter.key)}
          aria-pressed={selected === filter.key}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium shadow-sm ${
            selected === filter.key
              ? 'bg-primary-700 text-white'
              : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
          }`}
        >
          {t(filter.label)}
          <span
            className={`text-xs tabular-nums ${
              selected === filter.key ? 'text-primary-100' : 'text-gray-500'
            }`}
          >
            {filter.count}
          </span>
        </button>
      ))}
    </div>
  );
}
