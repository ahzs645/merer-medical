import { addMonths, differenceInCalendarDays, parseISO } from 'date-fns';

import {
  DentalActionLevel,
  DentalClaimSummary,
  DentalImagingMount,
  DentalNextAction,
  DentalNextCleaning,
  DentalRecallItem,
  DentalRecord,
  DentalWorkflowContext,
  OdontogramToothStatus,
  PerioExamSummary,
  PerioOverview,
  ToothSurface,
  TreatmentPlanItem,
} from '../types';
import { ALL_TEETH } from './dentalReferenceData';
import {
  buildRecordsByTooth,
  compareTeeth,
  extractClaimFields,
  isClaimResourceType,
} from './dentalRecords';

const ACTIVE_KINDS = new Set(['condition', 'finding', 'perio', 'referral']);

const TREATING_KINDS = new Set(['procedure', 'surgery']);

/**
 * Whether a record still asks something of the reader. An active finding,
 * condition, perio measurement or referral is open until its own status says
 * otherwise — or, for a finding on specific teeth, until a completed
 * procedure on every one of those teeth on or after its date. A filling is
 * how a cavity stops being a problem; without this, a 2023 cavity filled the
 * same week kept its tooth red for good.
 */
export function isOpenIssue(
  record: DentalRecord,
  recordsByTooth: Map<string, DentalRecord[]>,
): boolean {
  if (!ACTIVE_KINDS.has(record.kind) || record.status !== 'open') return false;
  if (record.toothNumbers.length === 0 || !record.date) return true;
  const recordDate = record.date;
  const treated = record.toothNumbers.every((tooth) =>
    (recordsByTooth.get(tooth) || []).some(
      (other) =>
        other.id !== record.id &&
        TREATING_KINDS.has(other.kind) &&
        other.status === 'done' &&
        !!other.date &&
        other.date.slice(0, 10) >= recordDate.slice(0, 10),
    ),
  );
  return !treated;
}

/** Kinds whose `planned` status is not an outstanding piece of work. */
const NOT_A_PLAN = new Set(['note', 'image', 'cleaning']);

/**
 * Work that is proposed, accepted or booked but not done: a treatment plan,
 * a planned procedure, a pending surgical consult or ortho phase. A recall
 * (kind `note`) is planned too, but it is a due date with its own line.
 */
export function isOpenPlan(record: DentalRecord): boolean {
  return (
    record.status === 'planned' &&
    !NOT_A_PLAN.has(record.kind) &&
    !ACTIVE_KINDS.has(record.kind)
  );
}

/** The level one record holds on its own, for timeline rows and lists. */
export function recordActionLevel(
  record: DentalRecord,
  recordsByTooth: Map<string, DentalRecord[]>,
): DentalActionLevel {
  if (isOpenIssue(record, recordsByTooth)) return 'active';
  if (isOpenPlan(record)) return 'planned';
  if (record.status === 'done') return 'complete';
  return 'watch';
}

export function buildOdontogramStatuses(
  recordsByTooth: Map<string, DentalRecord[]>,
): OdontogramToothStatus[] {
  // Map across the full dentition (permanent + deciduous) so paediatric tooth
  // records surface too. Teeth without records are filtered out below.
  return ALL_TEETH.map((tooth) => {
    const records = (recordsByTooth.get(tooth.universal) || []).filter(
      (record) => record.status !== 'cancelled',
    );
    const activeRecords = records.filter((record) =>
      isOpenIssue(record, recordsByTooth),
    );
    const plannedRecords = records.filter(isOpenPlan);
    const completeRecords = records.filter(
      (record) => record.status === 'done',
    );

    return {
      tooth: tooth.universal,
      fdi: tooth.fdi,
      label: `#${tooth.universal} / FDI ${tooth.fdi}`,
      actionLevel: getActionLevel(
        activeRecords,
        plannedRecords,
        completeRecords,
      ),
      recordCount: records.length,
      surfaces: collectSurfaces(records),
      latestRecord: records[0],
      activeRecords,
      plannedRecords,
    };
  }).filter((status) => status.recordCount > 0);
}

export function buildTreatmentPlan(
  records: DentalRecord[],
): TreatmentPlanItem[] {
  return records
    .filter(
      (record) =>
        record.kind === 'treatmentPlan' && record.status !== 'cancelled',
    )
    .map((record) => ({
      id: record.id,
      record,
      status: inferTreatmentStatus(record),
      // Priority as the practice stated it. Matching "pain" or "bleeding"
      // anywhere in the note made "no pain reported" a high-priority plan.
      priority: /urgent|high|emergen|asap/i.test(
        record.details?.treatmentPriority || '',
      )
        ? 'high'
        : 'routine',
      toothNumbers: record.toothNumbers,
      date: record.date,
    }));
}

type SiteDepth = { tooth?: string; depth: number };

/**
 * Pocket depths and bleeding from one perio record, from whichever shape it
 * carries: an importer's per-site string ("tooth 3 MB:3/B:2/DB:5…"), FHIR
 * components ("Pocket depth MB" = 5 mm; "Bleeding on probing" = true), or a
 * plain valueQuantity in mm.
 */
export function readPerioSites(record: DentalRecord): {
  depths: SiteDepth[];
  bleedingSites?: number;
} {
  const depths: SiteDepth[] = [];
  let bleedingSites: number | undefined;
  const fallbackTooth =
    record.toothNumbers.length === 1 ? record.toothNumbers[0] : undefined;

  for (const segment of (record.details?.perioPocketDepths || '').split(';')) {
    const match = segment.match(/tooth\s+(\w+)\s+(.*)/i);
    if (!match) continue;
    for (const site of match[2].matchAll(/[A-Z]{1,2}:(-?\d+(?:\.\d+)?)/g)) {
      depths.push({ tooth: match[1], depth: Number(site[1]) });
    }
  }
  if (record.details?.perioBleeding) {
    bleedingSites = record.details.perioBleeding
      .split(';')
      .map((segment) => segment.replace(/tooth\s+\w+/i, ''))
      .reduce(
        (total, segment) =>
          total + segment.split(',').filter((site) => site.trim()).length,
        0,
      );
  }

  const raw = record.document.data_record.raw as any;
  const resource = raw?.resource || raw || {};
  const label = (item: any) =>
    `${item?.code?.text || ''} ${item?.code?.coding?.[0]?.display || ''}`.toLowerCase();
  const mm = (quantity: any) =>
    quantity && /^mm$|millimet/i.test(quantity.unit || quantity.code || '')
      ? Number(quantity.value)
      : undefined;

  if (depths.length === 0) {
    for (const component of Array.isArray(resource.component)
      ? resource.component
      : []) {
      const name = label(component);
      const depth = mm(component.valueQuantity);
      if (/pocket|probing depth/.test(name) && depth !== undefined) {
        depths.push({ tooth: fallbackTooth, depth });
      }
      if (/bleeding/.test(name) && component.valueBoolean === true) {
        bleedingSites = (bleedingSites || 0) + 1;
      }
    }
    const value = mm(resource.valueQuantity);
    if (value !== undefined && /pocket|probing/.test(label(resource))) {
      depths.push({ tooth: fallbackTooth, depth: value });
    }
  }

  return { depths, bleedingSites };
}

function summarizePerioExam(
  record: DentalRecord,
): PerioExamSummary | undefined {
  const { depths, bleedingSites } = readPerioSites(record);
  if (depths.length === 0) return undefined;
  const max = Math.max(...depths.map((site) => site.depth));
  return {
    record,
    date: record.date,
    sitesProbed: depths.length,
    sitesFourPlus: depths.filter((site) => site.depth >= 4).length,
    sitesFivePlus: depths.filter((site) => site.depth >= 5).length,
    deepest: {
      depth: max,
      teeth: [
        ...new Set(
          depths
            .filter((site) => site.depth === max && site.tooth)
            .map((site) => site.tooth as string),
        ),
      ].sort(compareTeeth),
    },
    bleedingSites,
  };
}

export function buildPerioOverview(records: DentalRecord[]): PerioOverview {
  const perioRecords = records.filter((record) => record.kind === 'perio');
  const maintenanceRecords = records.filter(
    (record) =>
      record.kind === 'cleaning' &&
      hasAnyTerm(record, [
        'periodontal maintenance',
        'scaling',
        'root planing',
      ]),
  );
  const exams = perioRecords
    .map(summarizePerioExam)
    .filter((exam): exam is PerioExamSummary => !!exam)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return {
    latestExam: exams[0],
    previousExam: exams[1],
    recordCount: perioRecords.length,
    latestRecord: perioRecords[0],
    maintenanceRecords,
  };
}

export const UNGROUPED_MOUNT = 'Ungrouped dental imaging';

export function buildImagingMounts(
  records: DentalRecord[],
): DentalImagingMount[] {
  const imageRecords = records.filter((record) => record.kind === 'image');
  const grouped = new Map<string, DentalRecord[]>();

  for (const record of imageRecords) {
    const key =
      record.details?.imagingMount ||
      record.details?.dicomStudyUid ||
      record.details?.imagingModality ||
      UNGROUPED_MOUNT;
    grouped.set(key, [...(grouped.get(key) || []), record]);
  }

  return [...grouped.entries()].map(([title, group]) => {
    const first = group[0];
    const teeth = new Set<string>();
    group.forEach((record) =>
      record.toothNumbers.forEach((tooth) => teeth.add(tooth)),
    );

    return {
      id: title,
      title,
      modality: first.details?.imagingModality,
      acquisitionDate: first.details?.acquisitionDate || first.date,
      dicomStudyUid: first.details?.dicomStudyUid,
      dicomSeriesUid: first.details?.dicomSeriesUid,
      toothNumbers: [...teeth].sort(compareTeeth),
      itemCount: group.length,
    };
  });
}

export function buildClaimSummaries(
  records: DentalRecord[],
): DentalClaimSummary[] {
  return records
    .filter(
      (record) =>
        // A coverage, claim or EOB, or a record that states a claim. A
        // procedure that merely names its carrier, or a note that says
        // "benefit", is not one.
        isClaimResourceType(record.document.data_record.resource_type) ||
        !!record.details?.claimStatus ||
        !!record.details?.eobAttachment,
    )
    .map((record) => ({
      id: record.id,
      record,
      ...extractClaimFields(record.document),
    }));
}

/**
 * Recall records: what a practice set as the next due visit. Past cleanings
 * used to qualify by mentioning "recall" or "prophy", so the panel listed
 * three visits that had already happened, each reading "No due date".
 */
export function buildRecallItems(records: DentalRecord[]): DentalRecallItem[] {
  return records
    .filter(
      (record) =>
        record.status !== 'cancelled' &&
        record.kind !== 'cleaning' &&
        (record.details?.subtype === 'recall' ||
          !!record.details?.recallType ||
          !!record.details?.recallDueDate),
    )
    .map((record) => ({
      id: record.id,
      record,
      type: record.details?.recallType || record.details?.dentalRecall,
      dueDate: isoDay(record.details?.recallDueDate),
      provider: record.details?.dentalProvider,
      location: record.details?.dentalLocation,
    }));
}

/** The usual interval when nothing says otherwise. NICE CG19 allows 3–24. */
const USUAL_RECALL_MONTHS = 6;
const DUE_SOON_DAYS = 30;

function isoDay(value?: string): string | undefined {
  const match = value?.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : undefined;
}

/** "Six-month recall", "recall in 4 months", "annual exam" → months. */
export function statedRecallMonths(text: string): number | undefined {
  const words: Record<string, number> = {
    three: 3,
    four: 4,
    six: 6,
    nine: 9,
    twelve: 12,
    eighteen: 18,
    'twenty-four': 24,
  };
  const match = text
    .toLowerCase()
    .match(
      /\b(\d{1,2}|three|four|six|nine|twelve|eighteen|twenty-four)[- ]?months?\b[^.]{0,30}\b(recall|cleaning|hygiene|check|exam|visit)|\b(recall|cleaning|hygiene|return|review)\b[^.]{0,30}?\b(\d{1,2}|three|four|six|nine|twelve|eighteen|twenty-four)[- ]?months?\b/,
    );
  if (match) {
    const value = match[1] || match[4];
    const months = words[value] ?? Number(value);
    return months >= 1 && months <= 24 ? months : undefined;
  }
  if (
    /\b(annual|yearly|12-month)\b[^.]{0,20}\b(recall|cleaning|exam)/i.test(text)
  )
    return 12;
  return undefined;
}

/**
 * When the next cleaning is due. A recall record from the practice wins,
 * unless a cleaning has happened since it was due; then the interval the
 * last cleaning's note states; then the usual six months. "Overdue" is only
 * said when nothing is booked.
 */
export function buildNextCleaning(
  records: DentalRecord[],
  today: Date = new Date(),
): DentalNextCleaning {
  const lastCleaning = records
    .filter(
      (record) =>
        record.kind === 'cleaning' && record.status === 'done' && !!record.date,
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  const lastDay = isoDay(lastCleaning?.date);

  const recall = buildRecallItems(records)
    .filter((item) => !!item.dueDate && item.record.status !== 'resolved')
    .filter((item) => !lastDay || (item.dueDate as string) > lastDay)
    .sort((a, b) =>
      (a.dueDate as string).localeCompare(b.dueDate as string),
    )[0];

  let dueDate: string | undefined;
  let basis: DentalNextCleaning['basis'] = 'none';
  let intervalMonths: number | undefined;
  let scheduledDate: string | undefined;

  if (recall) {
    dueDate = recall.dueDate;
    basis = 'recall';
    const scheduled = isoDay(recall.record.details?.dentalFollowUp);
    if (scheduled && scheduled !== dueDate) scheduledDate = scheduled;
  } else if (lastCleaning && lastDay) {
    const stated = statedRecallMonths(
      [
        lastCleaning.title,
        lastCleaning.summary,
        lastCleaning.details?.dentalRecall,
      ]
        .filter(Boolean)
        .join('. '),
    );
    intervalMonths = stated ?? USUAL_RECALL_MONTHS;
    basis = stated ? 'stated-interval' : 'usual-interval';
    dueDate = addMonths(parseISO(lastDay), intervalMonths)
      .toISOString()
      .slice(0, 10);
  }

  const todayDay = today.toISOString().slice(0, 10);
  let state: DentalNextCleaning['state'] = 'unknown';
  if (scheduledDate && scheduledDate >= todayDay) state = 'scheduled';
  else if (dueDate) {
    const days = differenceInCalendarDays(parseISO(dueDate), today);
    state =
      days < 0 ? 'overdue' : days <= DUE_SOON_DAYS ? 'due-soon' : 'not-due';
  }

  return { lastCleaning, dueDate, scheduledDate, intervalMonths, basis, state };
}

/** Where a record of each kind is read in full. */
const ROUTE_BY_KIND: Record<string, string> = {
  condition: '/records/dental/chart',
  finding: '/records/dental/chart',
  perio: '/records/dental/hygiene',
  referral: '/records/dental/records',
  treatmentPlan: '/records/dental/treatment',
  surgery: '/records/dental/treatment',
  orthodontic: '/records/dental/treatment',
  procedure: '/records/dental/treatment',
};

/**
 * The open items on the dental overview, each named as the record it is.
 *
 * Only records that are genuinely outstanding qualify: an active finding or
 * condition, a perio measurement, a referral, or a treatment still marked as
 * planned. A completed procedure is not something to do next, and neither is
 * "you own some imaging".
 */
function buildNextActions(records: DentalRecord[]): DentalNextAction[] {
  const recordsByTooth = buildRecordsByTooth(records);
  return records
    .filter(
      (record) => isOpenIssue(record, recordsByTooth) || isOpenPlan(record),
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map((record) => {
      const kindLabel = isOpenPlan(record)
        ? record.kind === 'surgery'
          ? 'Planned surgery or consult'
          : 'Planned treatment'
        : record.kind === 'perio'
          ? 'Periodontal measurement'
          : record.kind === 'referral'
            ? 'Referral'
            : 'Active finding';
      return {
        id: record.id,
        label: record.title,
        reason: kindLabel,
        teeth: record.toothNumbers,
        date: record.date,
        to: ROUTE_BY_KIND[record.kind] ?? '/records/dental/records',
      };
    });
}

export function buildWorkflowContext(
  records: DentalRecord[],
  imagingCount: number,
): DentalWorkflowContext {
  const recordsByTooth = buildRecordsByTooth(records);
  const openDentalIssues = records.filter((record) =>
    isOpenIssue(record, recordsByTooth),
  ).length;
  const plannedTreatmentCount = records.filter(isOpenPlan).length;
  const perioRecordCount = records.filter(
    (record) => record.kind === 'perio',
  ).length;
  const nextActions = buildNextActions(records);

  return {
    latestRecord: records[0],
    openDentalIssues,
    plannedTreatmentCount,
    perioRecordCount,
    imagingCount,
    nextActions,
  };
}

function getActionLevel(
  activeRecords: DentalRecord[],
  plannedRecords: DentalRecord[],
  completeRecords: DentalRecord[],
): DentalActionLevel {
  if (activeRecords.length > 0) return 'active';
  if (plannedRecords.length > 0) return 'planned';
  if (completeRecords.length > 0) return 'complete';
  return 'watch';
}

function collectSurfaces(records: DentalRecord[]): ToothSurface[] {
  const surfaces = new Set<ToothSurface>();
  for (const record of records) {
    record.surfaces.forEach((surface) => surfaces.add(surface));
  }
  return [...surfaces];
}

/**
 * A plan's stage from its stated status only. It used to fall back to the
 * prose, so a completed crown prep whose note said "final crown delivery
 * planned" was "proposed", and an accepted aligner plan, whose note did not
 * say "active", was too.
 */
function inferTreatmentStatus(
  record: DentalRecord,
): TreatmentPlanItem['status'] {
  if (record.status === 'done') return 'completed';
  const stated = [
    record.details?.dentalStatus,
    record.details?.treatmentStatus,
    record.details?.orthoStatus,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/complete/.test(stated)) return 'completed';
  if (/scheduled|booked/.test(stated)) return 'scheduled';
  if (/active|progress|accepted|started|tracking/.test(stated)) return 'active';
  return 'proposed';
}

function hasAnyTerm(record: DentalRecord, terms: string[]) {
  const text = [
    record.title,
    record.summary,
    record.details?.dentalStatus,
    record.details?.dentalSeverity,
    record.details?.procedureCode,
    record.details?.dentalFollowUp,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return terms.some((term) => text.includes(term));
}
