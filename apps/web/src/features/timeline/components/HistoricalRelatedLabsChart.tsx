import { BundleEntry, Observation } from 'fhir/r2';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { RxDocument } from 'rxdb';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  getReferenceRangeHigh,
  getReferenceRangeLow,
  getValueQuantity,
  getValueUnit,
} from '../utils/fhirpathParsers';
import { safeFormatDate } from '../../../shared/utils/dateFormatters';

/**
 * The historical chart behind a lab row's "graph" view, in its own module so
 * that recharts is fetched only when someone opens one.
 *
 * The timeline is the app's landing route and is deliberately not code-split,
 * so anything it imports statically lands in the entry chunk that every phone
 * downloads before first paint. This chart was one of those imports — and it
 * only renders after you expand a row and switch it from the table to the
 * graph, which most sessions never do.
 */
export function HistoricalRelatedLabsChart({
  relatedLabs,
  item,
}: {
  relatedLabs: RxDocument<ClinicalDocument<BundleEntry<Observation>>>[];
  item: ClinicalDocument<BundleEntry<Observation>>;
}) {
  const chartDisplayName = `${item.metadata?.display_name}`,
    chartValueUnit = getValueUnit(item);
  const chartData = useMemo(
    () =>
      relatedLabs.map((rl) => {
        const low = getReferenceRangeLow(rl)?.value,
          high = getReferenceRangeHigh(rl)?.value;

        return {
          date: safeFormatDate(rl.metadata?.date, 'yyyy-MM-dd'),
          value: getValueQuantity(rl),
          referenceRange:
            low !== undefined && high !== undefined ? [low, high] : undefined,
        };
      }),
    [relatedLabs],
  );
  const chartDomain = useMemo(
    () =>
      getPaddedChartDomain(
        chartData
          .flatMap((d) => [
            d.value,
            d.referenceRange?.[0],
            d.referenceRange?.[1],
          ])
          .filter(isNumber),
      ),
    [chartData],
  );

  return (
    <div className="h-72 w-full [&_.recharts-surface:focus]:outline-none [&_.recharts-wrapper:focus]:outline-none [&_[tabindex]:focus]:outline-none">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 16, right: 16, bottom: 36, left: 20 }}
        >
          <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            interval="preserveStartEnd"
            tickFormatter={(value) => format(new Date(value), 'yyyy-MM')}
            tick={{ fill: '#4B5563', fontSize: 12 }}
            angle={-55}
            textAnchor="end"
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
              if (!active) {
                return null;
              }

              const value = payload?.find((p) => p.dataKey === 'value')?.value,
                range = payload?.find((p) => p.dataKey === 'referenceRange')
                  ?.value as number[] | undefined;

              const formattedLabel =
                label !== undefined
                  ? format(new Date(label), 'MMM Mo, yyyy')
                  : '';

              return (
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-semibold text-gray-900">
                    {formattedLabel}
                  </p>
                  <p className="text-gray-700">
                    {chartDisplayName}: {value}
                    {chartValueUnit ? ` ${chartValueUnit}` : ''}
                  </p>
                  {range ? (
                    <p className="text-gray-500">
                      Range: {range[0]} - {range[1]}
                    </p>
                  ) : null}
                </div>
              );
            }}
          />
          <Area
            dataKey="referenceRange"
            fill="#D8F1F8"
            fillOpacity={0.8}
            stroke="transparent"
            strokeWidth={0}
            type="monotone"
          />
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

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getPaddedChartDomain(
  values: number[],
): [number | 'dataMin', number | 'dataMax'] {
  if (values.length === 0) {
    return ['dataMin', 'dataMax'];
  }

  const min = Math.min(...values),
    max = Math.max(...values),
    range = max - min,
    padding = range > 0 ? range * 0.12 : Math.max(Math.abs(max) * 0.12, 1);

  return [Math.max(0, min - padding), max + padding];
}

function formatChartTick(value: number) {
  return Number.isInteger(value)
    ? `${value}`
    : value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export default HistoricalRelatedLabsChart;
