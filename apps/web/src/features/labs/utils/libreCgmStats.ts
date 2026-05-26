import { format, parseISO } from 'date-fns';

import { LabDocument } from '../types';

export type GlucosePoint = {
  date: string;
  timestamp: number;
  value: number;
  minuteOfDay: number;
  day: string;
  time: string;
};

export type AgpPoint = {
  time: string;
  minuteOfDay: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
};

type RawObservation = {
  resource?: {
    effectiveDateTime?: string;
    valueQuantity?: {
      value?: number;
    };
  };
};

export function getGlucosePoints(docs: LabDocument[]): GlucosePoint[] {
  return docs
    .map((doc) => {
      const resource = (doc.data_record.raw as RawObservation).resource;
      const date = resource?.effectiveDateTime || doc.metadata?.date;
      const value = resource?.valueQuantity?.value;
      if (!date || typeof value !== 'number' || !Number.isFinite(value)) {
        return undefined;
      }

      const parsedDate = parseISO(date);
      const minuteOfDay = parsedDate.getHours() * 60 + parsedDate.getMinutes();

      return {
        date,
        timestamp: parsedDate.getTime(),
        value,
        minuteOfDay,
        day: format(parsedDate, 'yyyy-MM-dd'),
        time: format(parsedDate, 'HH:mm'),
      };
    })
    .filter((point): point is GlucosePoint => !!point)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function calculateAverage(points: GlucosePoint[]): number | undefined {
  if (points.length === 0) return undefined;
  return Math.round(
    points.reduce((sum, point) => sum + point.value, 0) / points.length,
  );
}

export function calculateCv(points: GlucosePoint[]): number | undefined {
  if (points.length < 2) return undefined;
  const average =
    points.reduce((sum, point) => sum + point.value, 0) / points.length;
  const variance =
    points.reduce((sum, point) => sum + (point.value - average) ** 2, 0) /
    points.length;

  return Math.round((Math.sqrt(variance) / average) * 1000) / 10;
}

export function calculateGmi(averageGlucose?: number): number | undefined {
  if (!averageGlucose) return undefined;
  return Math.round((3.31 + 0.02392 * averageGlucose) * 10) / 10;
}

export function calculateTimeInRange(points: GlucosePoint[]) {
  const count = points.length || 1;
  const percent = (matches: (point: GlucosePoint) => boolean) =>
    Math.round((points.filter(matches).length / count) * 100);

  return {
    veryHigh: percent((point) => point.value > 250),
    high: percent((point) => point.value > 180 && point.value <= 250),
    target: percent((point) => point.value >= 70 && point.value <= 180),
    low: percent((point) => point.value >= 54 && point.value < 70),
    veryLow: percent((point) => point.value < 54),
  };
}

export function buildAgp(points: GlucosePoint[]): AgpPoint[] {
  const buckets = new Map<number, GlucosePoint[]>();

  points.forEach((point) => {
    const bucket = Math.round(point.minuteOfDay / 10) * 10;
    const normalizedBucket = bucket >= 1440 ? 0 : bucket;
    buckets.set(normalizedBucket, [
      ...(buckets.get(normalizedBucket) || []),
      point,
    ]);
  });

  return Array.from(buckets.entries())
    .map(([minuteOfDay, bucketPoints]) => {
      const values = bucketPoints
        .map((point) => point.value)
        .sort((a, b) => a - b);
      return {
        time: minuteToLabel(minuteOfDay),
        minuteOfDay,
        p5: percentile(values, 5),
        p25: percentile(values, 25),
        p50: percentile(values, 50),
        p75: percentile(values, 75),
        p95: percentile(values, 95),
      };
    })
    .sort((a, b) => a.minuteOfDay - b.minuteOfDay);
}

export function buildDailyProfiles(points: GlucosePoint[]) {
  const byDay = new Map<string, GlucosePoint[]>();

  points.forEach((point) => {
    byDay.set(point.day, [...(byDay.get(point.day) || []), point]);
  });

  return Array.from(byDay.entries())
    .map(([date, dayPoints]) => ({
      date,
      label: format(parseISO(date), 'EEE d'),
      points: dayPoints.sort((a, b) => a.minuteOfDay - b.minuteOfDay),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function percentile(values: number[], target: number): number {
  if (values.length === 0) return 0;
  const index = ((values.length - 1) * target) / 100;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return values[lower];
  return values[lower] + (values[upper] - values[lower]) * (index - lower);
}

function minuteToLabel(minute: number): string {
  const hour = Math.floor(minute / 60);
  const mins = minute % 60;
  return `${String(hour).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
