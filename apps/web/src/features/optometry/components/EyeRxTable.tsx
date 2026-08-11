import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/solid';

import {
  EyeRx,
  EyeRxDelta,
  formatAxis,
  formatDelta,
  formatDiopter,
} from '../utils/prescriptionTimeline';

type PowerColumn = {
  key: keyof EyeRxDelta;
  label: string;
  isAxis?: boolean;
};

const COLUMNS: PowerColumn[] = [
  { key: 'sphere', label: 'Sphere' },
  { key: 'cylinder', label: 'Cyl' },
  { key: 'axis', label: 'Axis', isAxis: true },
  { key: 'add', label: 'Add' },
];

/**
 * Readable OD/OS prescription grid. When deltas are supplied each changed value
 * is annotated with how it moved from the previous prescription.
 */
export function EyeRxTable({
  od,
  os,
  odDelta,
  osDelta,
}: {
  od?: EyeRx;
  os?: EyeRx;
  odDelta?: EyeRxDelta;
  osDelta?: EyeRxDelta;
}) {
  return (
    <table className="mt-3 w-full border-separate border-spacing-0 text-sm">
      <thead>
        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <th className="pb-1 pr-3">Eye</th>
          {COLUMNS.map((column) => (
            <th key={column.key} className="pb-1 pr-3">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <EyeRow eye="OD" label="Right" rx={od} delta={odDelta} />
        <EyeRow eye="OS" label="Left" rx={os} delta={osDelta} />
      </tbody>
    </table>
  );
}

function EyeRow({
  eye,
  label,
  rx,
  delta,
}: {
  eye: 'OD' | 'OS';
  label: string;
  rx?: EyeRx;
  delta?: EyeRxDelta;
}) {
  return (
    <tr className="align-top">
      <td className="border-t border-gray-100 py-2 pr-3">
        <span className="font-semibold text-gray-900">{eye}</span>
        <span className="ml-1 text-xs text-gray-600">{label}</span>
      </td>
      {COLUMNS.map((column) => {
        const value = rx?.[column.key] as number | undefined;
        const formatted = column.isAxis
          ? formatAxis(value)
          : formatDiopter(value);
        const deltaValue = delta?.[column.key];
        return (
          <td key={column.key} className="border-t border-gray-100 py-2 pr-3">
            <span className="font-semibold tabular-nums text-gray-900">
              {formatted}
            </span>
            <DeltaChip value={deltaValue} isAxis={column.isAxis} />
          </td>
        );
      })}
    </tr>
  );
}

function DeltaChip({ value, isAxis }: { value?: number; isAxis?: boolean }) {
  const label = formatDelta(value, isAxis ? 'axis' : 'power');
  if (!label || value === undefined) return null;

  const increasing = value > 0;
  const Icon = increasing ? ArrowUpIcon : ArrowDownIcon;

  return (
    <span
      className={`ml-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-xs font-semibold tabular-nums ${
        increasing ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'
      }`}
      title="Change since previous prescription"
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
