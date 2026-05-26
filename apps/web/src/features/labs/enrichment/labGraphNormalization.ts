import { format, isValid, parseISO } from 'date-fns';

import {
  getValueQuantity,
  getValueUnit,
} from '../../timeline/utils/fhirpathParsers';
import { LabDocument, LabGroup } from '../types';
import { getLabEnrichmentId } from './labEnrichment';
import { convertLabUnit, normalizeLabUnit } from './labUnitConversions';
import { LabReferenceOverlay } from './types';

export type LabGraphUnitOption = {
  unit: string;
  label: string;
};

export type NormalizedLabChartPoint = {
  date: string;
  timestamp: number;
  value: number;
  sourceValue: number;
  sourceUnit?: string;
  unit?: string;
  conversionNote?: string;
};

const graphUnitAliases: Record<
  string,
  { id: string; label: string; unit?: string }
> = {
  'total-cholesterol': {
    id: 'total-cholesterol',
    label: 'Total cholesterol',
    unit: 'mmol/L',
  },
  'cholesterol-total': {
    id: 'total-cholesterol',
    label: 'Total cholesterol',
    unit: 'mmol/L',
  },
  hdl: { id: 'hdl', label: 'HDL cholesterol', unit: 'mmol/L' },
  ldl: { id: 'ldl', label: 'LDL cholesterol', unit: 'mmol/L' },
  triglycerides: {
    id: 'triglycerides',
    label: 'Triglycerides',
    unit: 'mmol/L',
  },
  glucose: { id: 'glucose', label: 'Glucose', unit: 'mmol/L' },
  creatinine: { id: 'creatinine', label: 'Creatinine', unit: 'umol/L' },
  calcium: { id: 'calcium', label: 'Calcium', unit: 'mmol/L' },
  'total-protein': { id: 'total-protein', label: 'Total protein', unit: 'g/L' },
  albumin: { id: 'albumin', label: 'Albumin', unit: 'g/L' },
  'bilirubin-total': {
    id: 'bilirubin-total',
    label: 'Bilirubin total',
    unit: 'umol/L',
  },
  'urine-microalbumin-creatinine-ratio': {
    id: 'urine-microalbumin-creatinine-ratio',
    label: 'Urine ACR',
    unit: 'mg/mmol',
  },
  b12: { id: 'b12', label: 'Vitamin B12', unit: 'pmol/L' },
  tsh: { id: 'tsh', label: 'TSH', unit: 'mIU/L' },
  estradiol: { id: 'estradiol', label: 'Estradiol', unit: 'pmol/L' },
  'testosterone-total': {
    id: 'testosterone-total',
    label: 'Total testosterone',
    unit: 'nmol/L',
  },
  'vitamin-d': {
    id: 'vitamin-d-nmol',
    label: 'Vitamin D 25-OH',
    unit: 'nmol/L',
  },
  'vitamin-d-nmol': {
    id: 'vitamin-d-nmol',
    label: 'Vitamin D 25-OH',
    unit: 'nmol/L',
  },
  tpsa: { id: 'psa', label: 'PSA', unit: 'ug/L' },
  psa: { id: 'psa', label: 'PSA', unit: 'ug/L' },
  fpsa: { id: 'fpsa', label: 'Free PSA', unit: 'ug/L' },
};

export function getLabGraphAlias(group?: LabGroup): {
  id?: string;
  label?: string;
  unit?: string;
} {
  if (!group) return {};

  const enrichmentId = getLabEnrichmentId(group, group.labs[0]);
  if (!enrichmentId) return { label: group.name };

  return (
    graphUnitAliases[enrichmentId] || { id: enrichmentId, label: group.name }
  );
}

export function getLabGraphUnitOptions(
  group: LabGroup,
  overlays: LabReferenceOverlay[],
): LabGraphUnitOption[] {
  const alias = getLabGraphAlias(group);
  const units = new Set<string>();

  if (alias.unit) units.add(alias.unit);
  group.labs.forEach((lab) => {
    const unit = normalizeLabUnit(getValueUnit(lab));
    if (unit) units.add(unit);
  });
  overlays.forEach((overlay) => {
    const unit = normalizeLabUnit(overlay.unit);
    if (unit) units.add(unit);
  });

  return [...units].map((unit) => ({ unit, label: unit }));
}

export function normalizeLabChartData({
  group,
  labs,
  targetUnit,
}: {
  group?: LabGroup;
  labs: LabDocument[];
  targetUnit?: string;
}): {
  chartData: NormalizedLabChartPoint[];
  skippedCount: number;
  unit?: string;
} {
  const alias = getLabGraphAlias(group),
    normalizedTargetUnit = normalizeLabUnit(targetUnit || alias.unit);
  const chartData: NormalizedLabChartPoint[] = [];
  let skippedCount = 0;

  labs.forEach((lab) => {
    const value = getValueQuantity(lab);
    const parsedDate = parseLabDate(lab.metadata?.date);

    if (!isNumber(value) || !parsedDate) {
      skippedCount += 1;
      return;
    }

    const sourceUnit = normalizeLabUnit(getValueUnit(lab));
    const converted =
      alias.id && normalizedTargetUnit
        ? convertLabUnit(alias.id, value, sourceUnit, normalizedTargetUnit)
        : { value, unit: sourceUnit, converted: false };

    chartData.push({
      date: format(parsedDate, 'yyyy-MM-dd'),
      timestamp: parsedDate.getTime(),
      value: converted.value,
      sourceValue: value,
      sourceUnit,
      unit: converted.unit,
      conversionNote: converted.converted
        ? `${value} ${sourceUnit} converted to ${formatGraphNumber(converted.value)} ${converted.unit}.`
        : undefined,
    });
  });

  const unit =
    normalizedTargetUnit ||
    chartData.find((point) => point.unit)?.unit ||
    normalizeLabUnit(getValueUnit(labs[0]));

  return {
    chartData: chartData.sort((a, b) => a.timestamp - b.timestamp),
    skippedCount,
    unit,
  };
}

export function normalizeReferenceOverlaysForGraph({
  group,
  overlays,
  targetUnit,
}: {
  group?: LabGroup;
  overlays: LabReferenceOverlay[];
  targetUnit?: string;
}): LabReferenceOverlay[] {
  const alias = getLabGraphAlias(group),
    normalizedTargetUnit = normalizeLabUnit(targetUnit || alias.unit);

  if (!alias.id || !normalizedTargetUnit) return overlays;

  return overlays.map((overlay) => {
    const sourceUnit = normalizeLabUnit(overlay.unit);
    const low =
      overlay.low !== undefined
        ? convertLabUnit(
            alias.id || '',
            overlay.low,
            sourceUnit,
            normalizedTargetUnit,
          )
        : undefined;
    const high =
      overlay.high !== undefined
        ? convertLabUnit(
            alias.id || '',
            overlay.high,
            sourceUnit,
            normalizedTargetUnit,
          )
        : undefined;

    return {
      ...overlay,
      low: low?.value ?? overlay.low,
      high: high?.value ?? overlay.high,
      unit: low?.unit || high?.unit || normalizedTargetUnit,
    };
  });
}

function parseLabDate(date?: string): Date | undefined {
  if (!date) return undefined;

  const parsedDate = parseISO(date);
  return isValid(parsedDate) ? parsedDate : undefined;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatGraphNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1).replace(/\.0$/, '');
  if (abs >= 1) return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}
