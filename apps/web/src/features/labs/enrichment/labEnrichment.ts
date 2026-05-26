import {
  getInterpretationText,
  getReferenceRangeString,
  getValueQuantity,
  getValueUnit,
  isOutOfRangeResult,
} from '../../timeline/utils/fhirpathParsers';
import { LabDocument, LabGroup, ReportLink } from '../types';
import {
  getReferenceStandard,
  getSelectedReferenceBand,
  labCitations,
  loincLabAliases,
  nameLabAliases,
} from './labEnrichmentCatalog';
import {
  LabAuditSummary,
  LabEnrichment,
  LabFlag,
  NormalizedLabValue,
  ReferenceKind,
  ReferenceStandardId,
} from './types';

type UnitConversion = {
  unit: string;
  factor: number;
};

const DEFAULT_REFERENCE_CONTEXT = {
  ageYears: 40,
  sex: 'unknown' as const,
};

const labUnitConversions: Record<string, Record<string, UnitConversion>> = {
  glucose: {
    'mg/dL': { unit: 'mmol/L', factor: 1 / 18.0182 },
  },
  creatinine: {
    'mg/dL': { unit: 'umol/L', factor: 88.42 },
  },
  'total-cholesterol': {
    'mg/dL': { unit: 'mmol/L', factor: 1 / 38.67 },
  },
  hdl: {
    'mg/dL': { unit: 'mmol/L', factor: 1 / 38.67 },
  },
  ldl: {
    'mg/dL': { unit: 'mmol/L', factor: 1 / 38.67 },
  },
  triglycerides: {
    'mg/dL': { unit: 'mmol/L', factor: 1 / 88.57 },
  },
  'vitamin-d-nmol': {
    'ng/mL': { unit: 'nmol/L', factor: 2.496 },
  },
};

const plannerRelevantLabIds = new Set([
  'glucose',
  'hdl',
  'ldl',
  'triglycerides',
  'vitamin-d-nmol',
  'hemoglobin-a1c',
]);

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

function getNormalizedLabValue(
  labId: string,
  value: number,
  sourceUnit?: string,
  targetUnit?: string,
): NormalizedLabValue {
  const conversion = sourceUnit
    ? labUnitConversions[labId]?.[sourceUnit]
    : undefined;
  if (!conversion || (targetUnit && conversion.unit !== targetUnit)) {
    return {
      value,
      unit: targetUnit || sourceUnit,
      sourceValue: value,
      sourceUnit,
    };
  }

  const convertedValue = roundForDisplay(value * conversion.factor);
  return {
    value: convertedValue,
    unit: conversion.unit,
    sourceValue: value,
    sourceUnit,
    note: `${value} ${sourceUnit} converted to ${convertedValue} ${conversion.unit}.`,
  };
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
  const interpretation = getInterpretationText(lab)?.toLowerCase() || '';
  if (interpretation.includes('low')) return 'low';
  if (interpretation.includes('high')) return 'high';
  if (interpretation.includes('border')) return 'borderline';
  return isOutOfRangeResult(lab) ? 'high' : 'normal';
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
