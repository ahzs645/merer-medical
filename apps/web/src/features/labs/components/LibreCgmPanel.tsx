import { useMemo } from 'react';
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
} from '../utils/libreCgmStats';

export function LibreCgmPanel({ labs }: { labs: LabDocument[] }) {
  const points = useMemo(() => getGlucosePoints(labs), [labs]);
  const average = useMemo(() => calculateAverage(points), [points]);
  const cv = useMemo(() => calculateCv(points), [points]);
  const gmi = useMemo(() => calculateGmi(average), [average]);
  const ranges = useMemo(() => calculateTimeInRange(points), [points]);
  const agp = useMemo(() => buildAgp(points), [points]);
  const dailyProfiles = useMemo(() => buildDailyProfiles(points), [points]);

  if (points.length === 0) return null;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          FreeStyle Libre CGM
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          AGP, time in range, and daily glucose profiles from imported LibreView
          readings.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Readings" value={points.length.toLocaleString()} />
        <Metric label="Average" value={average ? `${average} mg/dL` : '-'} />
        <Metric label="GMI" value={gmi ? `${gmi}%` : '-'} />
        <Metric label="Variability" value={cv ? `${cv}% CV` : '-'} />
        <Metric
          label="Date range"
          value={`${points[0].day} to ${points[points.length - 1].day}`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="rounded-md border border-gray-200 p-3">
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

        <div className="rounded-md border border-gray-200 p-3">
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
            className="rounded-md border border-gray-200 p-3"
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
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-gray-900">{value}</p>
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
