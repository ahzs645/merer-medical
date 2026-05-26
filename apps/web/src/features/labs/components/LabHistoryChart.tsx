import { format, isValid, parseISO } from 'date-fns';
import { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  getReferenceRangeHigh,
  getReferenceRangeLow,
  getValueQuantity,
  getValueString,
  getValueUnit,
} from '../../timeline/utils/fhirpathParsers';
import { LabDocument, LabGroup } from '../types';

type LabHistoryChartProps = {
  group?: LabGroup;
  history?: LabDocument[];
  className?: string;
  heightClassName?: string;
  showReferenceRange?: boolean;
};

type LabChartPoint = {
  date: string;
  timestamp: number;
  value: number;
  referenceLow?: number;
  referenceHigh?: number;
};

export function LabHistoryChart({
  group,
  history,
  className = '',
  heightClassName = 'h-72',
  showReferenceRange = true,
}: LabHistoryChartProps) {
  const labs = useMemo(
    () => [...(history || group?.labs || [])].sort(compareDocumentsByDateAsc),
    [group?.labs, history],
  );

  const { chartData, skippedCount } = useMemo(
    () => buildLabChartData(labs, showReferenceRange),
    [labs, showReferenceRange],
  );

  const latestNumericLab = useMemo(
    () => labs.find((lab) => isNumber(getValueQuantity(lab))),
    [labs],
  );
  const chartDisplayName =
    group?.name || latestNumericLab?.metadata?.display_name || 'Lab result';
  const chartValueUnit = latestNumericLab
    ? getValueUnit(latestNumericLab)
    : undefined;

  const chartDomain = useMemo(
    () =>
      getPaddedChartDomain(
        chartData
          .flatMap((point) => [
            point.value,
            point.referenceLow,
            point.referenceHigh,
          ])
          .filter(isNumber),
      ),
    [chartData],
  );
  if (chartData.length === 0) {
    return (
      <div
        className={`flex ${heightClassName} w-full items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 text-center ${className}`}
      >
        <div>
          <p className="text-sm font-medium text-gray-700">
            No numeric lab values to chart
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {formatNonNumericSummary(labs)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${heightClassName} w-full [&_.recharts-surface:focus]:outline-none [&_.recharts-wrapper:focus]:outline-none [&_[tabindex]:focus]:outline-none ${className}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 16, right: 16, bottom: 36, left: 20 }}
        >
          <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            domain={['dataMin', 'dataMax']}
            interval="preserveStartEnd"
            tickFormatter={formatAxisDate}
            tick={{ fill: '#4B5563', fontSize: 12 }}
            angle={-55}
            scale="time"
            textAnchor="end"
            type="number"
          />
          <YAxis
            domain={chartDomain}
            label={{
              value: chartValueUnit ? `(${chartValueUnit})` : '',
              angle: -90,
              position: 'insideLeft',
              fill: '#4B5563',
            }}
            tick={{ fill: '#4B5563', fontSize: 12 }}
            tickFormatter={formatChartTick}
            width={64}
          />
          <Tooltip
            content={({ active, label, payload }) => {
              if (!active) return null;

              const value = payload?.find((p) => p.dataKey === 'value')?.value;
              const low = payload?.find(
                (p) => p.dataKey === 'referenceLow',
              )?.value;
              const high = payload?.find(
                (p) => p.dataKey === 'referenceHigh',
              )?.value;

              return (
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-semibold text-gray-900">
                    {formatTooltipDate(label)}
                  </p>
                  <p className="text-gray-700">
                    {chartDisplayName}: {formatChartTick(Number(value))}
                    {chartValueUnit ? ` ${chartValueUnit}` : ''}
                  </p>
                  {isNumber(low) && isNumber(high) ? (
                    <p className="text-gray-500">
                      Range: {formatChartTick(low)} - {formatChartTick(high)}
                    </p>
                  ) : null}
                  {skippedCount > 0 ? (
                    <p className="mt-1 text-gray-400">
                      {skippedCount} non-numeric result
                      {skippedCount === 1 ? '' : 's'} omitted
                    </p>
                  ) : null}
                </div>
              );
            }}
          />
          {showReferenceRange ? (
            <>
              <Line
                dataKey="referenceLow"
                connectNulls={false}
                dot={{ r: 2, fill: '#9DDDEA', strokeWidth: 0 }}
                fill="#D8F1F8"
                isAnimationActive={false}
                stroke="#9DDDEA"
                strokeDasharray="4 4"
                strokeWidth={1}
                type="monotone"
              />
              <Line
                dataKey="referenceHigh"
                connectNulls={false}
                dot={{ r: 2, fill: '#9DDDEA', strokeWidth: 0 }}
                fill="#D8F1F8"
                isAnimationActive={false}
                stroke="#9DDDEA"
                strokeDasharray="4 4"
                strokeWidth={1}
                type="monotone"
              />
            </>
          ) : null}
          <Line
            dataKey="value"
            dot={{ r: 3, fill: '#00A2D5', strokeWidth: 0 }}
            name={chartDisplayName}
            stroke="#00A2D5"
            strokeWidth={2}
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildLabChartData(
  labs: LabDocument[],
  showReferenceRange: boolean,
): { chartData: LabChartPoint[]; skippedCount: number } {
  const chartData: LabChartPoint[] = [];
  let skippedCount = 0;

  labs.forEach((lab) => {
    const value = getValueQuantity(lab);
    const parsedDate = parseLabDate(lab.metadata?.date);

    if (!isNumber(value) || !parsedDate) {
      skippedCount += 1;
      return;
    }

    const low = getReferenceRangeLow(lab)?.value;
    const high = getReferenceRangeHigh(lab)?.value;
    const hasReferenceRange =
      showReferenceRange && isNumber(low) && isNumber(high);

    chartData.push({
      date: format(parsedDate, 'yyyy-MM-dd'),
      timestamp: parsedDate.getTime(),
      value,
      referenceLow: hasReferenceRange ? low : undefined,
      referenceHigh: hasReferenceRange ? high : undefined,
    });
  });

  return {
    chartData: chartData.sort((a, b) => a.timestamp - b.timestamp),
    skippedCount,
  };
}

function compareDocumentsByDateAsc(a: LabDocument, b: LabDocument): number {
  return (a.metadata?.date || '').localeCompare(b.metadata?.date || '');
}

function parseLabDate(date?: string): Date | undefined {
  if (!date) return undefined;

  const parsedDate = parseISO(date);
  return isValid(parsedDate) ? parsedDate : undefined;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getPaddedChartDomain(
  values: number[],
): [number | 'dataMin', number | 'dataMax'] {
  if (values.length === 0) {
    return ['dataMin', 'dataMax'];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const padding = range > 0 ? range * 0.12 : Math.max(Math.abs(max) * 0.12, 1);

  return [Math.max(0, min - padding), max + padding];
}

function formatChartTick(value: number) {
  return Number.isInteger(value)
    ? `${value}`
    : value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function formatAxisDate(value: number | string) {
  const date = new Date(value);
  return isValid(date) ? format(date, 'yyyy-MM') : `${value}`;
}

function formatTooltipDate(value: unknown) {
  if (typeof value !== 'string') return '';

  const parsedDate = parseLabDate(value);
  return parsedDate ? format(parsedDate, 'MMM d, yyyy') : value;
}

function formatNonNumericSummary(labs: LabDocument[]) {
  const nonNumericValues = labs
    .map((lab) => getValueString(lab))
    .filter(Boolean)
    .slice(0, 2);

  if (nonNumericValues.length > 0) {
    return `Result values include ${nonNumericValues.join(', ')}.`;
  }

  if (labs.length > 0) {
    return `${labs.length} result${labs.length === 1 ? '' : 's'} found without numeric quantities.`;
  }

  return 'No lab history was provided.';
}
