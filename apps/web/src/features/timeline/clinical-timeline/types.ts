/**
 * Normalized data model for the STAR-style clinical timeline.
 *
 * Every clinical parameter is reduced to a "lane" that shares a single,
 * real-date x-axis with every other lane. Series lanes (labs/vitals) draw a
 * line with optional reference range; duration lanes (medications/conditions)
 * draw Gantt-style bars; marker lanes (encounters) draw points.
 */

export type LaneCategory =
  | 'labs'
  | 'vitals'
  | 'medications'
  | 'conditions'
  | 'encounters';

export type LaneKind = 'series' | 'duration' | 'marker';

export interface SeriesPoint {
  /** epoch milliseconds */
  t: number;
  value: number;
  /** Pre-formatted value string for the tooltip, e.g. "112 mg/dL". */
  display: string;
  /** Flagged out-of-range / abnormal by the source interpretation or ref range. */
  abnormal?: boolean;
}

export interface DurationItem {
  /** epoch milliseconds */
  start: number;
  /** epoch milliseconds (equal to start when it is effectively a point) */
  end: number;
  label: string;
  /** Still active / no recorded end. */
  ongoing?: boolean;
  /** Secondary line shown in the tooltip (dose, status, …). */
  detail?: string;
  /** Assigned during layout so overlapping bars stack onto separate rows. */
  rowIndex?: number;
}

export interface MarkerItem {
  /** epoch milliseconds */
  t: number;
  label: string;
  detail?: string;
}

export interface TimelineLane {
  id: string;
  title: string;
  subtitle?: string;
  kind: LaneKind;
  category: LaneCategory;
  /** series lanes */
  series?: SeriesPoint[];
  refLow?: number;
  refHigh?: number;
  unit?: string;
  /** duration lanes */
  durations?: DurationItem[];
  /** marker lanes */
  markers?: MarkerItem[];
}

export interface ClinicalTimelineData {
  lanes: TimelineLane[];
  /** Every distinct timestamp across all lanes — drives the context density. */
  allTimestamps: number[];
  /** Full [min, max] epoch-ms extent across all lanes. */
  extent: [number, number] | null;
  status: 'loading' | 'success';
}

export const CATEGORY_LABEL: Record<LaneCategory, string> = {
  labs: 'Laboratory',
  vitals: 'Vital Signs',
  medications: 'Medications',
  conditions: 'Conditions',
  encounters: 'Encounters',
};

/** Lane accent colors, roughly mirroring the STAR palette. */
export const CATEGORY_COLOR: Record<LaneCategory, string> = {
  labs: '#1d1d1f',
  vitals: '#0071e3',
  medications: '#5856d6',
  conditions: '#ff9500',
  encounters: '#34a853',
};
