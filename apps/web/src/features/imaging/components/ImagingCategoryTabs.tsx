import { ImagingCategory } from '../types';

const FILTERS: { key: ImagingCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'dental', label: 'Dental' },
  { key: 'xray', label: 'X-rays' },
  { key: 'scan', label: 'Scans' },
  { key: 'report', label: 'Reports' },
];

export function ImagingCategoryTabs({
  selected,
  onSelect,
}: {
  selected: ImagingCategory | 'all';
  onSelect: (category: ImagingCategory | 'all') => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => onSelect(filter.key)}
          className={`rounded-md px-3 py-2 text-sm font-medium shadow-sm ${
            selected === filter.key
              ? 'bg-primary-700 text-white'
              : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
