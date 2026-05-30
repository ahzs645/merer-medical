export interface LabUnitConversion {
  unit: string;
  factor: number;
}

export const labUnitConversions: Record<
  string,
  Record<string, LabUnitConversion>
> = {
  glucose: {
    'mg/dL': { unit: 'mmol/L', factor: 1 / 18.0182 },
  },
  creatinine: {
    'mg/dL': { unit: 'umol/L', factor: 88.42 },
  },
  calcium: {
    'mg/dL': { unit: 'mmol/L', factor: 0.2495 },
  },
  'total-protein': {
    'g/dL': { unit: 'g/L', factor: 10 },
  },
  albumin: {
    'g/dL': { unit: 'g/L', factor: 10 },
  },
  'bilirubin-total': {
    'mg/dL': { unit: 'umol/L', factor: 17.104 },
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
  'urine-microalbumin-creatinine-ratio': {
    'mg/g': { unit: 'mg/mmol', factor: 1 / 8.84 },
  },
  tsh: {
    'uIU/mL': { unit: 'mIU/L', factor: 1 },
  },
  estradiol: {
    'pg/mL': { unit: 'pmol/L', factor: 3.671 },
  },
  'testosterone-total': {
    'ng/mL': { unit: 'nmol/L', factor: 3.467 },
  },
  psa: {
    'ng/mL': { unit: 'ug/L', factor: 1 },
  },
  fpsa: {
    'ng/mL': { unit: 'ug/L', factor: 1 },
  },
  'vitamin-d-nmol': {
    'ng/mL': { unit: 'nmol/L', factor: 2.496 },
  },
};

const equivalentUnits: Record<string, string> = {
  'K/uL': '10^9/L',
  'M/uL': '10^12/L',
  'gm/dL': 'g/dL',
  'IU/L': 'U/L',
  'uIU/mL': 'mIU/L',
  'µmol/L': 'umol/L',
  'μmol/L': 'umol/L',
  'mcg/L': 'ug/L',
};

export function normalizeLabUnit(unit?: string): string | undefined {
  if (!unit) return undefined;
  const trimmed = normalizeLiterDenominatorCasing(unit.trim());
  return normalizePowerCountUnit(trimmed) || equivalentUnits[trimmed] || trimmed;
}

function normalizeLiterDenominatorCasing(unit: string): string {
  return unit.replace(/\/(d|m|u|µ|μ)?l\b/g, (_, prefix = '') => {
    const normalizedPrefix = prefix === 'u' ? 'u' : prefix;
    return `/${normalizedPrefix}L`;
  });
}

function normalizePowerCountUnit(unit: string): string | undefined {
  const compactUnit = unit.replace(/\s+/g, '');
  const match = compactUnit.match(
    /^(?:x?10(?:\^|\*|E|e|\()(\d+)\)?)(?:\/(uL|µL|μL|L))$/i,
  );
  if (!match) return undefined;

  const exponent = Number(match[1]);
  if (!Number.isInteger(exponent)) return undefined;

  const denominator = match[2].toLowerCase();
  const literExponent = denominator === 'l' ? exponent : exponent + 6;
  return `10^${literExponent}/L`;
}

export function convertLabUnit(
  aliasId: string,
  value: number,
  sourceUnit?: string,
  targetUnit?: string,
): { value: number; unit?: string; converted: boolean } {
  const normalizedSourceUnit = normalizeLabUnit(sourceUnit);
  const normalizedTargetUnit = normalizeLabUnit(targetUnit);

  if (!normalizedSourceUnit) {
    return { value, unit: normalizedTargetUnit, converted: false };
  }

  if (!normalizedTargetUnit || normalizedSourceUnit === normalizedTargetUnit) {
    return {
      value,
      unit: normalizedTargetUnit || normalizedSourceUnit,
      converted: false,
    };
  }

  const conversion = labUnitConversions[aliasId]?.[normalizedSourceUnit];
  if (
    conversion &&
    normalizeLabUnit(conversion.unit) === normalizedTargetUnit
  ) {
    return {
      value: value * conversion.factor,
      unit: normalizedTargetUnit,
      converted: true,
    };
  }

  const inverseConversion = Object.entries(
    labUnitConversions[aliasId] || {},
  ).find(
    ([, candidate]) =>
      normalizeLabUnit(candidate.unit) === normalizedSourceUnit,
  );
  if (inverseConversion?.[0] && inverseConversion[0] === normalizedTargetUnit) {
    return {
      value: value / inverseConversion[1].factor,
      unit: normalizedTargetUnit,
      converted: true,
    };
  }

  return { value, unit: normalizedSourceUnit, converted: false };
}
