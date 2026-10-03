import {
  DentalActionLevel,
  DentalClaimSummary,
  DentalImagingMount,
  DentalNextAction,
  DentalPerioMeasurement,
  DentalRecallItem,
  DentalRecord,
  DentalToothTimelineItem,
  DentalWorkflowContext,
  OdontogramToothStatus,
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

const HIGH_PRIORITY_TERMS = [
  'abscess',
  'acute',
  'bleeding',
  'caries',
  'cavity',
  'cracked',
  'fracture',
  'infection',
  'pain',
  'urgent',
];

const PERIO_RISK_TERMS = [
  'attachment loss',
  'bleeding',
  'calculus',
  'furcation',
  'mobility',
  'pocket',
  'probing',
  'recession',
  'suppuration',
];

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
      priority: hasAnyTerm(record, HIGH_PRIORITY_TERMS) ? 'high' : 'routine',
      toothNumbers: record.toothNumbers,
      label: record.toothNumbers.length
        ? `Teeth ${record.toothNumbers.join(', ')}`
        : 'No tooth number detected',
      date: record.date,
    }));
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
  const affectedTeeth = new Set<string>();
  const riskSignals = new Set<string>();

  for (const record of perioRecords) {
    record.toothNumbers.forEach((tooth) => affectedTeeth.add(tooth));
    for (const term of PERIO_RISK_TERMS) {
      if (hasAnyTerm(record, [term])) riskSignals.add(term);
    }
  }

  return {
    recordCount: perioRecords.length,
    latestRecord: perioRecords[0],
    riskSignals: [...riskSignals],
    affectedTeeth: [...affectedTeeth].sort(compareTeeth),
    maintenanceRecords,
    latestMeasurements: buildPerioMeasurements(perioRecords).slice(0, 6),
  };
}

/**
 * Each tooth's history, newest first, with every row showing its own
 * standing. It used to list only open and planned records and stamp each with
 * the tooth's level, so a completed crown prep on a tooth with an open pocket
 * read "ACTIVE".
 */
export function buildToothTimeline(
  statuses: OdontogramToothStatus[],
  recordsByTooth: Map<string, DentalRecord[]>,
): DentalToothTimelineItem[] {
  return statuses.flatMap((status) =>
    (recordsByTooth.get(status.tooth) || [])
      .filter((record) => record.status !== 'cancelled')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 4)
      .map((record) => ({
        id: `${status.tooth}-${record.id}`,
        tooth: status.tooth,
        record,
        date: record.date,
        actionLevel: recordActionLevel(record, recordsByTooth),
        label: status.label,
      })),
  );
}

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
      'Ungrouped dental imaging';
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
        isClaimResourceType(record.document.data_record.resource_type) ||
        !!record.details?.claimStatus ||
        !!record.details?.carrierName ||
        !!record.details?.eobAttachment ||
        hasAnyTerm(record, ['claim', 'eob', 'benefit', 'deductible']),
    )
    .map((record) => ({
      id: record.id,
      record,
      ...extractClaimFields(record.document),
    }));
}

export function buildRecallItems(records: DentalRecord[]): DentalRecallItem[] {
  return records
    .filter(
      (record) =>
        !!record.details?.recallType ||
        !!record.details?.recallDueDate ||
        !!record.details?.dentalRecall ||
        hasAnyTerm(record, ['recall', 'prophy', 'periodontal maintenance']),
    )
    .map((record) => ({
      id: record.id,
      record,
      type: record.details?.recallType || record.details?.dentalRecall,
      dueDate: record.details?.recallDueDate || record.details?.dentalFollowUp,
      provider: record.details?.dentalProvider,
      location: record.details?.dentalLocation,
    }));
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

function describeTeeth(record: DentalRecord): string {
  if (record.toothNumbers.length === 0) return '';
  if (record.toothNumbers.length === 1)
    return `tooth ${record.toothNumbers[0]}`;
  return `teeth ${record.toothNumbers.join(', ')}`;
}

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
      const teeth = describeTeeth(record);
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
        detail: [kindLabel, teeth, record.date].filter(Boolean).join(' · '),
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

function buildPerioMeasurements(
  records: DentalRecord[],
): DentalPerioMeasurement[] {
  return records
    .map((record) => ({
      record,
      date: record.date,
      teeth: record.toothNumbers,
      pocketDepths: record.details?.perioPocketDepths,
      recession: record.details?.perioRecession,
      bleeding: record.details?.perioBleeding,
      plaque: record.details?.perioPlaque,
      mobility: record.details?.perioMobility,
      furcation: record.details?.perioFurcation,
      suppuration: record.details?.perioSuppuration,
    }))
    .filter((measurement) =>
      [
        measurement.pocketDepths,
        measurement.recession,
        measurement.bleeding,
        measurement.plaque,
        measurement.mobility,
        measurement.furcation,
        measurement.suppuration,
      ].some(Boolean),
    );
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
