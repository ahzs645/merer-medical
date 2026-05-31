import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { EyeLaterality, OptometryRecord } from '../types';

export type RxClass = 'glasses' | 'contacts';

export type EyeRx = {
  sphere?: number;
  cylinder?: number;
  axis?: number;
  add?: number;
  prism?: string;
  backCurve?: number;
  diameter?: number;
};

export type EyeRxDelta = {
  sphere?: number;
  cylinder?: number;
  axis?: number;
  add?: number;
};

export type PrescriptionEntry = {
  id: string;
  date?: string;
  title: string;
  rxClass: RxClass;
  product?: string;
  prescriber?: string;
  pd?: number;
  notes?: string;
  od?: EyeRx;
  os?: EyeRx;
  document: ClinicalDocument<unknown>;
};

export type PrescriptionTimelineEntry = PrescriptionEntry & {
  odDelta?: EyeRxDelta;
  osDelta?: EyeRxDelta;
  /** True for the most recent prescription of its rxClass. */
  isCurrent: boolean;
};

/** Numeric Rx fields that can be diffed between two prescriptions. */
const DELTA_FIELDS: Array<keyof EyeRxDelta> = [
  'sphere',
  'cylinder',
  'axis',
  'add',
];

/**
 * Pull the structured glasses/contact prescriptions out of the optometry
 * records and order them oldest-to-newest within each class so we can compute
 * how each value changed from the previous prescription.
 */
export function buildPrescriptionTimeline(
  records: OptometryRecord[],
): PrescriptionTimelineEntry[] {
  const entries = records
    .filter((record) => record.kind === 'prescription')
    .map((record) => parseVisionPrescription(record))
    .filter((entry): entry is PrescriptionEntry => entry !== null);

  // Oldest first so deltas read "change since the previous prescription".
  const ascending = [...entries].sort(
    (a, b) => dateValue(a.date) - dateValue(b.date),
  );

  const previousByClass: Partial<Record<RxClass, PrescriptionEntry>> = {};
  const latestIdByClass: Partial<Record<RxClass, string>> = {};

  for (const entry of ascending) {
    // ascending order means the last one we see per class is the newest.
    latestIdByClass[entry.rxClass] = entry.id;
  }

  const withDeltas: PrescriptionTimelineEntry[] = ascending.map((entry) => {
    const previous = previousByClass[entry.rxClass];
    const timelineEntry: PrescriptionTimelineEntry = {
      ...entry,
      odDelta: computeDelta(previous?.od, entry.od),
      osDelta: computeDelta(previous?.os, entry.os),
      isCurrent: latestIdByClass[entry.rxClass] === entry.id,
    };
    previousByClass[entry.rxClass] = entry;
    return timelineEntry;
  });

  // Newest first for display.
  return withDeltas.sort((a, b) => dateValue(b.date) - dateValue(a.date));
}

/** Most recent prescription of each class, for the "current Rx" summary. */
export function getCurrentPrescriptions(records: OptometryRecord[]): {
  glasses?: PrescriptionTimelineEntry;
  contacts?: PrescriptionTimelineEntry;
} {
  const timeline = buildPrescriptionTimeline(records);
  return {
    glasses: timeline.find(
      (entry) => entry.rxClass === 'glasses' && entry.isCurrent,
    ),
    contacts: timeline.find(
      (entry) => entry.rxClass === 'contacts' && entry.isCurrent,
    ),
  };
}

export function parseVisionPrescription(
  record: OptometryRecord,
): PrescriptionEntry | null {
  const resource = getResource(record.document);
  const lensSpecs: any[] = Array.isArray(resource?.lensSpecification)
    ? resource.lensSpecification
    : [];

  const od = mapLensSpec(findLensSpec(lensSpecs, 'OD'));
  const os = mapLensSpec(findLensSpec(lensSpecs, 'OS'));
  const notes = collectNotes(resource);

  return {
    id: record.id,
    date: record.date || resource?.dateWritten || resource?.created,
    title: record.title,
    rxClass: classifyRx(record.title, lensSpecs, notes),
    product: lensSpecs.find((spec) => spec?.product?.text)?.product?.text,
    prescriber: resource?.prescriber?.display,
    pd: parsePd(notes),
    notes,
    od,
    os,
    document: record.document,
  };
}

function classifyRx(title: string, lensSpecs: any[], notes: string): RxClass {
  const hasContactGeometry = lensSpecs.some(
    (spec) => spec?.backCurve !== undefined || spec?.diameter !== undefined,
  );
  const text = [title, notes, ...lensSpecs.map((spec) => spec?.product?.text)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (hasContactGeometry || text.includes('contact')) return 'contacts';
  return 'glasses';
}

function findLensSpec(lensSpecs: any[], eye: EyeLaterality) {
  const target = eye === 'OD' ? 'right' : 'left';
  return lensSpecs.find((spec) => {
    const value = `${spec?.eye ?? ''}`.toLowerCase();
    return value === target || value === eye.toLowerCase();
  });
}

function mapLensSpec(spec: any): EyeRx | undefined {
  if (!spec) return undefined;
  const rx: EyeRx = {
    sphere: toNumber(spec.sphere),
    cylinder: toNumber(spec.cylinder),
    axis: toNumber(spec.axis),
    add: toNumber(spec.add),
    backCurve: toNumber(spec.backCurve),
    diameter: toNumber(spec.diameter),
    prism: formatPrism(spec.prism),
  };
  const hasValue = Object.values(rx).some((value) => value !== undefined);
  return hasValue ? rx : undefined;
}

function computeDelta(
  previous?: EyeRx,
  current?: EyeRx,
): EyeRxDelta | undefined {
  if (!previous || !current) return undefined;
  const delta: EyeRxDelta = {};
  let hasDelta = false;

  for (const field of DELTA_FIELDS) {
    const prevValue = previous[field];
    const curValue = current[field];
    if (typeof prevValue === 'number' && typeof curValue === 'number') {
      const change = round(curValue - prevValue);
      if (change !== 0) {
        delta[field] = change;
        hasDelta = true;
      }
    }
  }

  return hasDelta ? delta : undefined;
}

function formatPrism(prism: any): string | undefined {
  if (!Array.isArray(prism) || prism.length === 0) return undefined;
  return prism
    .map((entry) => {
      const amount = toNumber(entry?.amount);
      const base = entry?.base ? ` ${entry.base}` : '';
      return amount !== undefined ? `${amount}Δ${base}` : undefined;
    })
    .filter(Boolean)
    .join(', ');
}

function collectNotes(resource: any): string {
  const notes = resource?.note;
  if (!Array.isArray(notes)) {
    if (typeof notes === 'string') return notes;
    return '';
  }
  return notes
    .map((note) => (typeof note === 'string' ? note : note?.text))
    .filter(Boolean)
    .join(' ');
}

function parsePd(notes: string): number | undefined {
  const match = notes.match(/PD\s*[:=]?\s*(\d{2,3}(?:\.\d)?)/i);
  return match ? Number(match[1]) : undefined;
}

function dateValue(date?: string): number {
  if (!date) return 0;
  const value = new Date(date).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function getResource(document: ClinicalDocument<unknown>): any {
  const raw = document.data_record.raw as any;
  return raw?.resource || raw || {};
}

/** Display helpers shared by the prescription panels. */
export function formatDiopter(value?: number): string {
  if (value === undefined) return '—';
  if (value === 0) return '0.00';
  const sign = value > 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toFixed(2)}`;
}

export function formatAxis(value?: number): string {
  if (value === undefined) return '—';
  return `${Math.round(value)}°`;
}

export function formatDelta(value?: number, kind: 'power' | 'axis' = 'power') {
  if (value === undefined || value === 0) return undefined;
  const sign = value > 0 ? '+' : '−';
  const magnitude =
    kind === 'axis'
      ? `${Math.abs(Math.round(value))}°`
      : Math.abs(value).toFixed(2);
  return `${sign}${magnitude}`;
}
