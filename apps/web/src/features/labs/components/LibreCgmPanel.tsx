import { useId, useMemo, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { LabDocument } from '../types';
import {
  buildAgp,
  buildDailyProfiles,
  calculateAverage,
  calculateCv,
  calculateGmi,
  calculateTimeInRange,
  getGlucosePoints,
  GlucosePoint,
} from '../utils/libreCgmStats';

export function LibreCgmPanel({ labs }: { labs: LabDocument[] }) {
  const [expanded, setExpanded] = useState(false);
  const headingId = useId();
  const reportId = useId();
  const points = useMemo(() => getGlucosePoints(labs), [labs]);

  if (points.length === 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 sm:px-4">
        <div className="min-w-0 py-1">
          <h2
            id={headingId}
            className="break-words text-sm font-semibold text-gray-900"
          >
            FreeStyle Libre CGM
          </h2>
          <p className="mt-0.5 text-sm text-gray-600">
            {points.length.toLocaleString()} imported readings
          </p>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={reportId}
          onClick={() => setExpanded((open) => !open)}
          className="inline-flex min-h-9 max-w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-start text-sm font-semibold text-primary-800 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          <span className="min-w-0 break-words">
            {expanded ? 'Hide glucose report' : 'Show glucose report'}
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
      <div id={reportId} hidden={!expanded}>
        {/* Daily charts can fill several phone screens. Mount the report only
            when requested so lab browsing does not render or calculate them. */}
        {expanded && <LibreCgmReport points={points} />}
      </div>
    </section>
  );
}

function LibreCgmReport({ points }: { points: GlucosePoint[] }) {
  const average = useMemo(() => calculateAverage(points), [points]);
  const cv = useMemo(() => calculateCv(points), [points]);
  const gmi = useMemo(() => calculateGmi(average), [average]);
  const ranges = useMemo(() => calculateTimeInRange(points), [points]);
  const agp = useMemo(() => buildAgp(points), [points]);
  const dailyProfiles = useMemo(() => buildDailyProfiles(points), [points]);

  return (
    <div className="min-w-0 border-t border-gray-200 p-3 sm:p-4">
      <p className="mb-3 text-sm text-gray-600">
        AGP, time in range, and daily glucose profiles from imported LibreView
        readings.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
        <Metric label="Readings" value={points.length.toLocaleString()} />
        <Metric label="Average" value={average ? `${average} mg/dL` : '-'} />
        <Metric label="GMI" value={gmi ? `${gmi}%` : '-'} />
        <Metric label="Variability" value={cv ? `${cv}% CV` : '-'} />
        <Metric
          label="Date range"
          value={`${points[0].day} to ${points[points.length - 1].day}`}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="min-w-0 rounded-md border border-gray-200 p-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Time In Ranges
          </h3>
          <RangeBar
            label="Very High >250"
            value={ranges.veryHigh}
            color="bg-red-600"
          />
          <RangeBar
            label="High 181-250"
            value={ranges.high}
            color="bg-amber-500"
          />
          <RangeBar
            label="Target 70-180"
            value={ranges.target}
            color="bg-emerald-500"
          />
          <RangeBar label="Low 54-69" value={ranges.low} color="bg-rose-400" />
          <RangeBar
            label="Very Low <54"
            value={ranges.veryLow}
            color="bg-rose-700"
          />
        </div>

        <div className="min-w-0 rounded-md border border-gray-200 p-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Ambulatory Glucose Profile
          </h3>
          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={agp}
                margin={{ top: 12, right: 16, bottom: 24, left: 8 }}
              >
                <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                <ReferenceArea
                  y1={70}
                  y2={180}
                  fill="#DCFCE7"
                  fillOpacity={0.55}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#4B5563', fontSize: 12 }}
                  minTickGap={24}
                />
                <YAxis
                  domain={[40, 260]}
                  tick={{ fill: '#4B5563', fontSize: 12 }}
                  width={56}
                />
                <Tooltip />
                <Line dataKey="p95" stroke="#93C5FD" dot={false} />
                <Line dataKey="p75" stroke="#60A5FA" dot={false} />
                <Line
                  dataKey="p50"
                  name="Median"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={false}
                />
                <Line dataKey="p25" stroke="#60A5FA" dot={false} />
                <Line dataKey="p5" stroke="#93C5FD" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dailyProfiles.map((profile) => (
          <div
            key={profile.date}
            className="min-w-0 rounded-md border border-gray-200 p-3"
          >
            <p className="text-sm font-semibold text-gray-900">
              {profile.label}
            </p>
            <div className="mt-2 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={profile.points}
                  margin={{ top: 8, right: 8, bottom: 8, left: -8 }}
                >
                  <ReferenceArea
                    y1={70}
                    y2={180}
                    fill="#DCFCE7"
                    fillOpacity={0.55}
                  />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[40, 260]} hide />
                  <Tooltip />
                  <Line dataKey="value" stroke="#2563EB" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-md border border-gray-200 p-3 ${className}`}
    >
      <p className="break-words text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words text-base font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function RangeBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{value}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
