import {
  getObservationInterpretationFlag,
  getReferenceRangeDisplay,
  getReferenceRangeHigh,
  getReferenceRangeLow,
  getReferenceRangeString,
  getValueQuantity,
  getValueUnit,
} from '../../timeline/utils/fhirpathParsers';
import { LabDocument, LabGroup, ReportLink } from '../types';
import {
  getReferenceStandard,
  getSelectedReferenceBand,
  loincLabAliases,
  nameLabAliases,
} from './labEnrichmentCatalog';
import { labCitations } from './labCitations';
import {
  LabAuditSummary,
  LabEnrichment,
  LabReferenceOverlay,
  LabFlag,
  LabReferenceEvaluation,
  LabStatusSummary,
  NormalizedLabValue,
  ReferenceKind,
  ReferenceOverlayMode,
  ReferenceStandardId,
} from './types';
import { convertLabUnit } from './labUnitConversions';

const DEFAULT_REFERENCE_CONTEXT = {
  ageYears: 40,
  sex: 'unknown' as const,
};

const plannerRelevantLabIds = new Set([
  'glucose',
  'hdl',
  'ldl',
  'triglycerides',
  'vitamin-d-nmol',
  'hemoglobin-a1c',
]);

export const referenceOverlayModes: ReferenceOverlayMode[] = [
  'canadian',
  'australian',
  'uk',
  'original',
];

export const referenceOverlayColors: Record<ReferenceOverlayMode, string> = {
  canadian: '#2D4A3E',
  australian: '#8A5A13',
  uk: '#565190',
  original: '#8A7F66',
};

export const referenceOverlayLabels: Record<ReferenceOverlayMode, string> = {
  canadian: 'Canadian',
  australian: 'Australian',
  uk: 'UK',
  original: 'Original',
};

export function buildLabEnrichment({
  group,
  lab,
  reports,
  standardId,
}: {
  group: LabGroup;
  lab: LabDocument;
  reports: ReportLink[];
  standardId: ReferenceStandardId;
}): LabEnrichment {
  const standard = getReferenceStandard(standardId),
    labId = getLabEnrichmentId(group, lab),
    band = labId
      ? getSelectedReferenceBand(standardId, labId, DEFAULT_REFERENCE_CONTEXT)
      : undefined,
    value = getValueQuantity(lab),
    sourceFlag = getSourceFlag(lab),
    recomputedFlag =
      band && value !== undefined
        ? evaluateFlag(band.kind, value, band.low, band.high, sourceFlag)
        : sourceFlag,
    referenceNote = [band?.note, band?.defaultNote].filter(Boolean).join(' '),
    citation = band?.citationId ? labCitations[band.citationId] : undefined;

  return {
    standardId,
    standardLabel: standard?.label || standardId,
    labId,
    originalReferenceRange: getReferenceRangeString(lab),
    referenceRange: band?.display,
    originalFlag: sourceFlag,
    recomputedFlag,
    referenceCitation: citation,
    referenceAgeBand: band?.label,
    referenceNote: referenceNote || undefined,
    sourceReferenceRange: getReferenceRangeDisplay(lab),
    normalizedValue:
      value !== undefined && labId
        ? getNormalizedLabValue(labId, value, getValueUnit(lab), band?.unit)
        : undefined,
    usedByPlanner: labId ? plannerRelevantLabIds.has(labId) : false,
    audit: buildAuditSummary(lab, reports),
  };
}

export function getLabEnrichmentId(
  group: LabGroup,
  lab?: LabDocument,
): string | undefined {
  const loinc = lab?.metadata?.loinc_coding?.[0] || group.code;
  if (loinc && loincLabAliases[loinc]) return loincLabAliases[loinc];

  const name = [lab?.metadata?.display_name, group.name]
    .filter(Boolean)
    .join(' ');
  return nameLabAliases.find((alias) => alias.pattern.test(name))?.id;
}

export function buildLabReferenceOverlays({
  group,
  lab,
}: {
  group: LabGroup;
  lab: LabDocument;
}): LabReferenceOverlay[] {
  const labId = getLabEnrichmentId(group, lab);
  const overlays: LabReferenceOverlay[] = [];

  if (labId) {
    (['canadian', 'australian', 'uk'] as ReferenceStandardId[]).forEach(
      (standardId) => {
        const band = getSelectedReferenceBand(
          standardId,
          labId,
          DEFAULT_REFERENCE_CONTEXT,
        );
        if (!band) return;

        overlays.push({
          mode: standardId,
          label: band.standardLabel,
          display: band.display,
          color: referenceOverlayColors[standardId],
          kind: band.kind,
          unit: band.unit,
          low: band.low,
          high: band.high,
          citation: labCitations[band.citationId],
          citationId: band.citationId,
          ageBand: band.label,
          note:
            [band.note, band.defaultNote].filter(Boolean).join(' ') ||
            undefined,
        });
      },
    );
  }

  const originalOverlay = buildOriginalReferenceOverlay(lab);
  if (originalOverlay) overlays.push(originalOverlay);

  return overlays;
}

export function buildLabReferenceEvaluation({
  group,
  lab,
  mode,
}: {
  group: LabGroup;
  lab: LabDocument;
  mode: ReferenceOverlayMode;
}): LabReferenceEvaluation {
  if (mode === 'original') {
    return buildOriginalReferenceEvaluation(lab);
  }

  const labId = getLabEnrichmentId(group, lab),
    sourceFlag = getSourceFlag(lab);

  if (!labId) {
    return {
      ...buildOriginalReferenceEvaluation(lab),
      mode,
      label: referenceOverlayLabels[mode],
      isMappedStandard: false,
      sourceReferenceRange: getReferenceRangeDisplay(lab),
    };
  }

  const band = getSelectedReferenceBand(mode, labId, DEFAULT_REFERENCE_CONTEXT);
  if (!band) {
    return {
      ...buildOriginalReferenceEvaluation(lab),
      mode,
      label: referenceOverlayLabels[mode],
      isMappedStandard: false,
      sourceReferenceRange: getReferenceRangeDisplay(lab),
    };
  }

  const value = getValueQuantity(lab),
    unit = getValueUnit(lab),
    normalizedValue =
      value !== undefined
        ? getNormalizedLabValue(labId, value, unit, band.unit)
        : undefined,
    flag =
      normalizedValue?.value !== undefined
        ? evaluateFlag(
            band.kind,
            normalizedValue.value,
            band.low,
            band.high,
            sourceFlag,
          )
        : sourceFlag,
    referenceNote = [band.note, band.defaultNote].filter(Boolean).join(' ');

  return {
    mode,
    label: band.standardLabel,
    referenceRange: band.display,
    referenceCitation: labCitations[band.citationId],
    referenceAgeBand: band.label,
    referenceNote: referenceNote || undefined,
    sourceReferenceRange: getReferenceRangeDisplay(lab),
    flag,
    normalizedValue,
    isMappedStandard: true,
  };
}

export function summarizeLabGroupStatus(
  group: LabGroup,
  mode: ReferenceOverlayMode,
): LabStatusSummary {
  const flags = group.labs.map(
      (lab) => buildLabReferenceEvaluation({ group, lab, mode }).flag,
    ),
    highCount = flags.filter((flag) => flag === 'high').length,
    lowCount = flags.filter((flag) => flag === 'low').length,
    borderlineCount = flags.filter((flag) => flag === 'borderline').length,
    abnormalCount = highCount + lowCount + borderlineCount;

  const parts = [
    highCount > 0 ? `${highCount} high` : undefined,
    lowCount > 0 ? `${lowCount} low` : undefined,
    borderlineCount > 0 ? `${borderlineCount} borderline` : undefined,
  ].filter(Boolean);

  return {
    highCount,
    lowCount,
    borderlineCount,
    abnormalCount,
    label: parts.length > 0 ? parts.join(' / ') : 'In range',
  };
}

function getNormalizedLabValue(
  labId: string,
  value: number,
  sourceUnit?: string,
  targetUnit?: string,
): NormalizedLabValue {
  const converted = convertLabUnit(labId, value, sourceUnit, targetUnit);
  if (!converted.converted) {
    return {
      value: converted.value,
      unit: converted.unit,
      sourceValue: value,
      sourceUnit,
    };
  }

  const convertedValue = roundForDisplay(converted.value);
  return {
    value: convertedValue,
    unit: converted.unit,
    sourceValue: value,
    sourceUnit,
    note: `${value} ${sourceUnit} converted to ${convertedValue} ${converted.unit}.`,
  };
}

function buildOriginalReferenceEvaluation(
  lab: LabDocument,
): LabReferenceEvaluation {
  const originalOverlay = buildOriginalReferenceOverlay(lab),
    sourceFlag = getSourceFlag(lab),
    value = getValueQuantity(lab),
    flag =
      originalOverlay && value !== undefined
        ? evaluateFlag(
            originalOverlay.kind,
            value,
            originalOverlay.low,
            originalOverlay.high,
            sourceFlag,
          )
        : sourceFlag;

  return {
    mode: 'original',
    label: referenceOverlayLabels.original,
    referenceRange: originalOverlay?.display || getReferenceRangeString(lab),
    sourceReferenceRange: getReferenceRangeDisplay(lab),
    flag,
    normalizedValue:
      value !== undefined
        ? {
            value,
            sourceValue: value,
            unit: getValueUnit(lab),
            sourceUnit: getValueUnit(lab),
          }
        : undefined,
    isMappedStandard: true,
  };
}

function buildOriginalReferenceOverlay(
  lab: LabDocument,
): LabReferenceOverlay | undefined {
  const display = getReferenceRangeString(lab);
  const parsed = display ? parseNumericReferenceRange(display) : undefined;
  const low = getReferenceRangeLow(lab)?.value;
  const high = getReferenceRangeHigh(lab)?.value;

  if (!display && low === undefined && high === undefined) return undefined;

  return {
    mode: 'original',
    label: referenceOverlayLabels.original,
    display:
      display ||
      [low, high].filter((value) => value !== undefined).join(' - ') ||
      'Source range',
    color: referenceOverlayColors.original,
    kind: parsed?.kind || 'range',
    unit: getValueUnit(lab),
    low: parsed?.low ?? low,
    high: parsed?.high ?? high,
  };
}

function parseNumericReferenceRange(
  display: string,
): Pick<LabReferenceOverlay, 'kind' | 'low' | 'high'> | undefined {
  const normalized = display
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[–—]/g, '-')
    .replace(/,/g, '');
  const lteMatch = normalized.match(/^(<=|<)\s*(-?\d+(?:\.\d+)?)/);
  if (lteMatch?.[1] && lteMatch[2]) {
    return {
      kind: lteMatch[1] === '<=' ? 'lte' : 'lt',
      high: Number(lteMatch[2]),
    };
  }
  const gteMatch = normalized.match(/^(>=|>)\s*(-?\d+(?:\.\d+)?)/);
  if (gteMatch?.[1] && gteMatch[2]) {
    return { kind: 'gte', low: Number(gteMatch[2]) };
  }
  const rangeMatch = normalized.match(
    /(-?\d+(?:\.\d+)?)\s*(?:-|to)\s*(-?\d+(?:\.\d+)?)/i,
  );
  if (rangeMatch?.[1] && rangeMatch[2]) {
    return {
      kind: 'range',
      low: Number(rangeMatch[1]),
      high: Number(rangeMatch[2]),
    };
  }
  return undefined;
}

function evaluateFlag(
  kind: ReferenceKind,
  value: number,
  low: number | undefined,
  high: number | undefined,
  fallback: LabFlag,
): LabFlag {
  if (kind === 'note' || kind === 'text') return fallback;
  if (
    (kind === 'range' || kind === 'gte') &&
    low !== undefined &&
    value < low
  ) {
    return 'low';
  }
  if (
    (kind === 'range' || kind === 'lt' || kind === 'lte') &&
    high !== undefined
  ) {
    if (kind === 'lt' && value >= high) return 'high';
    if (kind === 'lte' && value > high) return 'high';
    if (kind === 'range' && value > high) return 'high';
  }
  return 'normal';
}

function getSourceFlag(lab: LabDocument): LabFlag {
  const flag = getObservationInterpretationFlag(lab);
  if (flag === 'abnormal') return 'borderline';
  return flag;
}

function buildAuditSummary(
  lab: LabDocument,
  reports: ReportLink[],
): LabAuditSummary {
  const linkedReport = reports[0],
    hasLinkedReport = reports.length > 0;

  return {
    status: hasLinkedReport ? 'key-fields-verified' : 'needs-review',
    verifiedBy: hasLinkedReport ? 'EMR linked DiagnosticReport' : undefined,
    verifiedAt: lab.metadata?.date,
    sourceImage: linkedReport?.displayName,
    notes: hasLinkedReport
      ? [
          'Value, unit, date, source range, and report link came from the connected record feed.',
          'No human source-image audit has been recorded in Mere yet.',
        ]
      : [
          'No linked report was found for this observation; manual provenance review is still needed.',
        ],
  };
}

function roundForDisplay(value: number): number {
  if (Math.abs(value) >= 100) return Number(value.toFixed(1));
  if (Math.abs(value) >= 10) return Number(value.toFixed(2));
  return Number(value.toFixed(3));
}
