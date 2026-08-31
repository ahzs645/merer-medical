import { BundleEntry, Observation } from 'fhir/r2';

import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { getLabEnrichmentId } from './labEnrichment';
import { getLabGraphUnitOptions } from './labGraphNormalization';
import { getSelectedReferenceBand } from './labEnrichmentCatalog';
import { unitsAreReconcilable } from './labUnitConversions';
import { LabGroup } from '../types';

type ObservationDocument = ClinicalDocument<BundleEntry<Observation>>;

/**
 * `nameLabAliases` matches a word inside a lab's name, which is right far
 * more often than it is wrong — and every name below is one it was wrong
 * about, taken from a single real lipid panel and prostate screen.
 */
describe('what a lab name is allowed to match', () => {
  it.each([
    ['HDL CHOLESTEROL', 'mmol/L', 'hdl'],
    ['HDL cholesterol', 'mg/dL', 'hdl'],
    ['LDL cholesterol', 'mmol/L', 'ldl'],
    ['Lymphocytes', undefined, 'lymphocytes-pct'],
    ['Lymphocytes %', undefined, 'lymphocytes-pct'],
    ['PSA', 'ug/L', 'psa'],
    // A specific pattern has to beat the general one it sits under.
    ['Corrected calcium', 'mmol/L', 'calcium-corrected'],
    // Named for the specimen it is measured in, so the specimen is not a
    // reason to drop it.
    [
      'Urine microalbumin/creatinine ratio',
      undefined,
      'urine-microalbumin-creatinine-ratio',
    ],
  ])('still matches %s', (name, unit, expected) => {
    expect(idFor(name, unit)).toBe(expected);
  });

  it.each([
    // Same units as HDL and the opposite clinical direction: non-HDL should
    // be low where HDL should be high, so inheriting ">=1.00 mmol/L" put the
    // flag the wrong way round. No unit check could have caught this one.
    ['Non-HDL Cholesterol', 'mmol/L'],
    ['Non-HDL cholesterol', 'mg/dL'],
    // A ratio of two analytes is neither of them.
    ['Chol/HDL ratio', undefined],
    ['Total:HDL cholesterol ratio (risk interpretation)', undefined],
    ['Total/HDL Chol ratio', undefined],
    // A share of a total is not a concentration.
    ['HDL % of total', '%'],
    ['PSA %', '%'],
    ['Index of free PSA', '%'],
    // A urinalysis dipstick was reading serum intervals. None of these carry
    // a unit, so only the name could tell.
    ['Urine glucose', undefined],
    ['Urine bilirubin', undefined],
    ['Urine protein', undefined],
    ['Urine RBC', undefined],
    ['Urine WBC', undefined],
    ['Creatinine (urine)', undefined],
  ])('no longer matches %s', (name, unit) => {
    expect(idFor(name, unit)).toBeUndefined();
  });

  it('reads the specimen off the panel when the name does not say', () => {
    // The urinalysis reports "RBC intact", "Clumps WBC" and a bare "WBC" —
    // blood cell counts read off a slide of urine. Only the category says so.
    for (const name of ['RBC intact', 'Clumps WBC', 'WBC']) {
      expect(
        getLabEnrichmentId(groupFor(name), labDocument(name)),
      ).toBeDefined();
      expect(
        getLabEnrichmentId(
          groupFor(name),
          labDocument(name, undefined, undefined, 'Urinalysis'),
        ),
      ).toBeUndefined();
    }
  });

  it('trusts a LOINC code over the name it came with', () => {
    // The code is the record asserting what it measured, so it is not
    // second-guessed the way a name is.
    const lab = labDocument('HDL cholesterol', 'mmol/L', '2085-9');
    expect(getLabEnrichmentId(groupFor('HDL cholesterol'), lab)).toBe('hdl');
  });
});

describe('choosing a reference band', () => {
  const context = { ageYears: 40, sex: 'male' as const };

  it('will not hand back a band the value cannot be compared with', () => {
    expect(
      getSelectedReferenceBand('canadian', 'hdl', context, '%'),
    ).toBeUndefined();
  });

  it('still hands back one for a unit the conversion table bridges', () => {
    expect(
      getSelectedReferenceBand('canadian', 'hdl', context, 'mg/dL')?.unit,
    ).toBe('mmol/L');
  });

  it('reconciles the two conventions haematocrit is written in', () => {
    // Canada states it as a percentage and Australia as a fraction of one, so
    // a value of 45 was being read against "0.40-0.52" and flagged wildly
    // high for being written the other way round. Both bands are now
    // reachable from either convention, converted rather than compared raw.
    expect(
      getSelectedReferenceBand('australian', 'hematocrit', context, '%')?.unit,
    ).toBe('L/L');
    expect(
      getSelectedReferenceBand('canadian', 'hematocrit', context, 'L/L')?.unit,
    ).toBe('%');
  });

  it('does not withhold a band from a value with no unit at all', () => {
    expect(
      getSelectedReferenceBand('canadian', 'hdl', context, undefined),
    ).toBeDefined();
  });

  it('withholds one when the test is written two ways and the value says neither', () => {
    // 39.5 is mid-range as a percentage and seventy times the upper limit as
    // a fraction of one. With nothing to say which was meant, a guess is
    // worse than no reference.
    expect(
      getSelectedReferenceBand('australian', 'hematocrit', context, undefined),
    ).toBeUndefined();
  });
});

describe('unitsAreReconcilable', () => {
  it('accepts the same unit, and one the table can convert', () => {
    expect(unitsAreReconcilable('hdl', 'mmol/L', 'mmol/L')).toBe(true);
    expect(unitsAreReconcilable('hdl', 'mg/dL', 'mmol/L')).toBe(true);
  });

  it('rejects a percentage against a concentration', () => {
    expect(unitsAreReconcilable('hdl', '%', 'mmol/L')).toBe(false);
  });

  it('treats a missing unit as no contradiction', () => {
    expect(unitsAreReconcilable('hdl', undefined, 'mmol/L')).toBe(true);
    expect(unitsAreReconcilable('hdl', '%', undefined)).toBe(true);
  });
});

describe('the graph', () => {
  it('stops offering to convert a percentage into mmol/L', () => {
    const group = groupFor('HDL % of total', '%');
    expect(getLabGraphUnitOptions(group, []).map((o) => o.unit)).toEqual(['%']);
  });
});

function idFor(name: string, unit?: string): string | undefined {
  return getLabEnrichmentId(groupFor(name, unit), labDocument(name, unit));
}

function groupFor(name: string, unit?: string): LabGroup {
  return {
    key: name.toLowerCase(),
    name,
    labs: [labDocument(name, unit)],
  } as LabGroup;
}

function labDocument(
  name: string,
  unit?: string,
  loinc?: string,
  category?: string,
): ObservationDocument {
  return {
    id: name,
    connection_record_id: 'test-connection',
    user_id: 'test-user',
    metadata: {
      id: name,
      date: '2026-08-03',
      display_name: name,
      ...(loinc ? { loinc_coding: [loinc] } : {}),
    },
    data_record: {
      raw: {
        resource: {
          resourceType: 'Observation',
          id: name,
          status: 'final',
          code: { text: name },
          valueQuantity: unit ? { value: 1, unit } : undefined,
          category: category ? { text: category } : undefined,
        },
      },
      format: 'FHIR.DSTU2',
      content_type: 'application/json',
      resource_type: 'observation',
      version_history: [],
    },
  } as ObservationDocument;
}
