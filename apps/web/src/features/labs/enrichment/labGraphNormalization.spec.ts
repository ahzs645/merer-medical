import { BundleEntry, Observation } from 'fhir/r2';

import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  getLabGraphUnitOptions,
  normalizeLabChartData,
} from './labGraphNormalization';
import { normalizeLabUnit } from './labUnitConversions';

type ObservationDocument = ClinicalDocument<BundleEntry<Observation>>;

describe('normalizeLabChartData', () => {
  it.each([
    ['10*9/L', '10^9/L'],
    ['x10(3)/uL', '10^9/L'],
    ['x10(3)/µL', '10^9/L'],
    ['x10(3)/μL', '10^9/L'],
    ['x10 (3) / uL', '10^9/L'],
    ['10*3/uL', '10^9/L'],
    ['x10E3/uL', '10^9/L'],
    ['x10e3/uL', '10^9/L'],
    ['10^3/uL', '10^9/L'],
    ['K/uL', '10^9/L'],
    ['10*12/L', '10^12/L'],
    ['x10(6)/uL', '10^12/L'],
    ['10*6/uL', '10^12/L'],
    ['x10E6/uL', '10^12/L'],
    ['x10e6/uL', '10^12/L'],
    ['10^6/uL', '10^12/L'],
    ['M/uL', '10^12/L'],
    ['gm/dL', 'g/dL'],
    ['gm/dl', 'g/dL'],
    ['mg/dl', 'mg/dL'],
    ['ng/ml', 'ng/mL'],
    ['mmol/l', 'mmol/L'],
    ['umol/l', 'umol/L'],
    ['cells/ul', 'cells/uL'],
    ['IU/L', 'U/L'],
    ['uIU/mL', 'mIU/L'],
    ['µmol/L', 'umol/L'],
    ['μmol/L', 'umol/L'],
    ['mcg/L', 'ug/L'],
  ])('normalizes equivalent lab unit %s to %s', (sourceUnit, targetUnit) => {
    expect(normalizeLabUnit(sourceUnit)).toBe(targetUnit);
  });

  it('collapses equivalent absolute count unit notation into one graph unit option', () => {
    const group = {
      key: 'basophils-absolute',
      name: 'Basophils Absolute',
      code: '704-7',
      labs: [
        labDocument('basophils-star', {
          valueQuantity: {
            value: 0,
            unit: '10*9/L',
            system: 'http://unitsofmeasure.org',
            code: '10*9/L',
          },
        }),
      ],
    };

    const result = getLabGraphUnitOptions(group, [
      {
        mode: 'canadian',
        label: 'Canadian',
        low: 0,
        high: 0.3,
        unit: '10^9/L',
        color: '#2D4A3E',
      },
    ]);

    expect(result).toEqual([{ unit: '10^9/L', label: '10^9/L' }]);
  });

  it('does not chart qualitative lab results', () => {
    const labs = [
      labDocument('leukocytes', {
        valueString: 'Negative',
        referenceRange: [{ text: 'Negative Leu/uL' }],
      }),
      labDocument('nitrite', {
        valueCodeableConcept: {
          text: 'Negative',
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '260385009',
              display: 'Negative',
            },
          ],
        },
        referenceRange: [{ text: 'Negative' }],
      }),
      labDocument('blood-urine', {
        valueString: 'Negative',
        referenceRange: [{ text: 'Negative' }],
      }),
    ];

    const result = normalizeLabChartData({ labs });

    expect(result.chartData).toEqual([]);
    expect(result.skippedCount).toBe(3);
  });

  it('charts numeric quantities while skipping non-numeric results', () => {
    const result = normalizeLabChartData({
      labs: [
        labDocument('glucose-negative', {
          valueString: 'Negative mmol/L',
          referenceRange: [{ text: 'Negative' }],
        }),
        labDocument('glucose-numeric', {
          valueQuantity: {
            value: 5.2,
            unit: 'mmol/L',
            system: 'http://unitsofmeasure.org',
            code: 'mmol/L',
          },
          referenceRange: [{ text: '3.6-7.7 mmol/L' }],
        }),
      ],
    });

    expect(result.chartData).toHaveLength(1);
    expect(result.chartData[0]).toEqual(
      expect.objectContaining({
        date: '2018-06-08',
        value: 5.2,
        unit: 'mmol/L',
      }),
    );
    expect(result.skippedCount).toBe(1);
  });
});

function labDocument(
  id: string,
  observation: Partial<Observation>,
): ObservationDocument {
  return {
    id,
    connection_record_id: 'test-connection',
    user_id: 'test-user',
    metadata: {
      id,
      date: '2018-06-08',
      display_name: id,
    },
    data_record: {
      raw: {
        resource: {
          resourceType: 'Observation',
          id,
          status: 'final',
          code: { text: id },
          ...observation,
        },
      },
      format: 'FHIR.DSTU2',
      content_type: 'application/json',
      resource_type: 'observation',
      version_history: [],
    },
  } as ObservationDocument;
}
