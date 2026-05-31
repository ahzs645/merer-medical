import {
  DentalActionLevel,
  DentalClaimSummary,
  DentalImagingMount,
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
import { UNIVERSAL_TEETH } from './dentalReferenceData';

const ACTIVE_KINDS = new Set(['condition', 'finding', 'perio', 'referral']);
const PLANNED_KINDS = new Set(['treatmentPlan']);
const COMPLETE_KINDS = new Set(['procedure', 'cleaning', 'surgery']);

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

export function buildOdontogramStatuses(
  recordsByTooth: Map<string, DentalRecord[]>,
): OdontogramToothStatus[] {
  return UNIVERSAL_TEETH.map((tooth) => {
    const records = recordsByTooth.get(tooth.universal) || [];
    const activeRecords = records.filter((record) =>
      ACTIVE_KINDS.has(record.kind),
    );
    const plannedRecords = records.filter((record) =>
      PLANNED_KINDS.has(record.kind),
    );
    const completeRecords = records.filter((record) =>
      COMPLETE_KINDS.has(record.kind),
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
    .filter((record) => record.kind === 'treatmentPlan')
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
    affectedTeeth: [...affectedTeeth].sort((a, b) => Number(a) - Number(b)),
    maintenanceRecords,
    latestMeasurements: buildPerioMeasurements(perioRecords).slice(0, 6),
  };
}

export function buildToothTimeline(
  statuses: OdontogramToothStatus[],
): DentalToothTimelineItem[] {
  return statuses.flatMap((status) =>
    [...status.activeRecords, ...status.plannedRecords]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 4)
      .map((record) => ({
        id: `${status.tooth}-${record.id}`,
        tooth: status.tooth,
        record,
        date: record.date,
        actionLevel: status.actionLevel,
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
      toothNumbers: [...teeth].sort((a, b) => Number(a) - Number(b)),
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
        !!record.details?.claimStatus ||
        !!record.details?.carrierName ||
        !!record.details?.eobAttachment ||
        hasAnyTerm(record, ['claim', 'eob', 'benefit', 'deductible']),
    )
    .map((record) => ({
      id: record.id,
      record,
      status: record.details?.claimStatus,
      carrier: record.details?.carrierName,
      plan: record.details?.planName,
      subscriberId: record.details?.subscriberId,
      annualMaximum: record.details?.annualMaximum,
      deductible: record.details?.deductible,
      patientPortion: record.details?.patientPortion,
      eobAttachment: record.details?.eobAttachment,
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

export function buildWorkflowContext(
  records: DentalRecord[],
  imagingCount: number,
): DentalWorkflowContext {
  const openDentalIssues = records.filter((record) =>
    ACTIVE_KINDS.has(record.kind),
  ).length;
  const plannedTreatmentCount = records.filter(
    (record) => record.kind === 'treatmentPlan',
  ).length;
  const perioRecordCount = records.filter(
    (record) => record.kind === 'perio',
  ).length;
  const nextActions: string[] = [];

  if (openDentalIssues > 0) {
    nextActions.push('Review active findings and conditions');
  }
  if (plannedTreatmentCount > 0) {
    nextActions.push('Confirm planned treatment status');
  }
  if (perioRecordCount > 0) {
    nextActions.push('Track periodontal measurements and maintenance');
  }
  if (imagingCount > 0) {
    nextActions.push('Link imaging to tooth-specific records');
  }
  if (records.some((record) => record.details?.claimStatus)) {
    nextActions.push('Review dental claims and EOBs');
  }
  if (records.some((record) => record.details?.recallDueDate)) {
    nextActions.push('Confirm recall and hygiene timing');
  }
  if (nextActions.length === 0) {
    nextActions.push('Add dental findings, plans, or imaging to build context');
  }

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

function inferTreatmentStatus(
  record: DentalRecord,
): TreatmentPlanItem['status'] {
  const structuredStatus = record.details?.dentalStatus?.toLowerCase();
  if (structuredStatus?.includes('complete')) return 'completed';
  if (structuredStatus?.includes('scheduled')) return 'scheduled';
  if (
    structuredStatus?.includes('active') ||
    structuredStatus?.includes('progress')
  ) {
    return 'active';
  }

  if (hasAnyTerm(record, ['completed', 'complete', 'done'])) return 'completed';
  if (hasAnyTerm(record, ['scheduled', 'booked', 'appointment'])) {
    return 'scheduled';
  }
  if (hasAnyTerm(record, ['active', 'in progress', 'started'])) return 'active';
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
