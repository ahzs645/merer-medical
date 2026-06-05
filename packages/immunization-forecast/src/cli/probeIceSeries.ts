import { evaluateIceSeries } from '../iceSeriesEvaluator.js';
import { iceDatasetPathsFromRepoRoot } from '../icePaths.js';
import { loadIceDataset } from '../iceYaml.js';

const repoRoot = process.argv[2] ?? process.cwd();
const seriesId = process.argv[3] ?? 'HPV_2_DOSE_SERIES';
const scenario = process.argv[4] ?? 'one-dose';
const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));
const forecasts = evaluateIceSeries({
  dataset,
  seriesId,
  evaluationDate: '2026-06-01',
  patient: scenarioPatient(scenario),
  immunizations: scenarioImmunizations(scenario),
});

console.log(
  JSON.stringify(
    forecasts.map((forecast) => ({
      series: forecast.series.id,
      status: forecast.status,
      completedDoses: forecast.completedDoses,
      requiredDoses: forecast.requiredDoses,
      invalidDoses: forecast.invalidDoses.map((match) => ({
        id: match.immunization.id,
        doseNumber: match.dose.doseNumber,
        reasons: match.reasons,
      })),
      acceptedDoses: forecast.acceptedDoses.map((match) => ({
        id: match.immunization.id,
        vaccineCode: match.immunization.vaccineCode,
        doseNumber: match.dose.doseNumber,
        status: match.status,
        reasons: match.reasons,
      })),
      nextDose: forecast.nextDose
        ? {
            doseNumber: forecast.nextDose.doseNumber,
            intervals: forecast.nextDose.intervals,
            allowedCvx: forecast.nextDose.vaccines.map((vaccine) => vaccine.cvx),
          }
        : undefined,
      nextDoseForecast: forecast.nextDoseForecast
        ? {
            doseNumber: forecast.nextDoseForecast.dose.doseNumber,
            recommendedVaccine: forecast.nextDoseForecast.recommendedVaccine,
            absoluteMinimumDate:
              forecast.nextDoseForecast.absoluteMinimumDate,
            minimumDate: forecast.nextDoseForecast.minimumDate,
            earliestRecommendedDate:
              forecast.nextDoseForecast.earliestRecommendedDate,
            recommendedDate: forecast.nextDoseForecast.recommendedDate,
            overdueDate: forecast.nextDoseForecast.overdueDate,
          }
        : undefined,
      recommendation: forecast.recommendation,
    })),
    null,
    2,
  ),
);

function scenarioImmunizations(name: string) {
  switch (name) {
    case 'too-young':
      return [
        {
          id: 'example-hpv-too-young',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2022-12-01',
        },
      ];
    case 'male-cvx-118':
      return [
        {
          id: 'example-hpv-cvx-118-male',
          vaccineName: 'HPV2',
          vaccineCode: '118',
          date: '2026-01-01',
        },
      ];
    case 'age-46':
      return [
        {
          id: 'example-hpv-dose-age-46',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-01-01',
        },
      ];
    case 'age-27-no-doses':
      return [];
    case 'too-soon':
      return [
        {
          id: 'example-hpv-dose-1',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-01-01',
        },
        {
          id: 'example-hpv-dose-2-too-soon',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-03-01',
        },
      ];
    case 'invalid-dose2-repeat-too-soon':
      return [
        {
          id: 'example-hpv-dose-1',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-01-01',
        },
        {
          id: 'example-hpv-dose-2-too-soon',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-03-01',
        },
        {
          id: 'example-hpv-dose-2-repeat-too-soon',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-04-01',
        },
      ];
    case 'invalid-dose2-repeat-valid':
      return [
        {
          id: 'example-hpv-dose-1',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-01-01',
        },
        {
          id: 'example-hpv-dose-2-too-soon',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-03-01',
        },
        {
          id: 'example-hpv-dose-2-repeat-valid',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-06-01',
        },
      ];
    case 'three-dose-next-before-15':
      return [
        {
          id: 'example-hpv-dose-1',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-01-01',
        },
        {
          id: 'example-hpv-dose-2',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-02-01',
        },
      ];
    case 'three-dose-next-after-15':
      return [
        {
          id: 'example-hpv-dose-1-after-15',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-01-01',
        },
        {
          id: 'example-hpv-dose-2-after-15',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-02-01',
        },
      ];
    case 'pre-2016-dose3-valid':
      return [
        {
          id: 'example-hpv-pre-2016-dose-1',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2016-01-01',
        },
        {
          id: 'example-hpv-pre-2016-dose-2',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2016-02-01',
        },
        {
          id: 'example-hpv-pre-2016-dose-3-valid',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2016-05-01',
        },
      ];
    case 'pre-2016-dose3-too-soon':
      return [
        {
          id: 'example-hpv-pre-2016-dose-1',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2016-01-01',
        },
        {
          id: 'example-hpv-pre-2016-dose-2',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2016-02-01',
        },
        {
          id: 'example-hpv-pre-2016-dose-3-too-soon',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2016-04-01',
        },
      ];
    case 'complete':
      return [
        {
          id: 'example-hpv-dose-1',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-01-01',
        },
        {
          id: 'example-hpv-dose-2',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-07-01',
        },
      ];
    case 'invalid-then-valid':
      return [
        {
          id: 'example-hpv-dose-1',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-01-01',
        },
        {
          id: 'example-hpv-dose-2-too-soon',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-03-01',
        },
        {
          id: 'example-hpv-dose-2-valid',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-07-01',
        },
      ];
    case 'one-dose':
    default:
      return [
        {
          id: 'example-hpv-dose-1',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2026-01-01',
        },
      ];
  }
}

function scenarioPatient(name: string) {
  switch (name) {
    case 'age-46':
      return { birthDate: '1980-01-01' };
    case 'age-27-no-doses':
      return { birthDate: '1999-01-01' };
    case 'male-cvx-118':
      return { birthDate: '2015-01-01', sex: 'male' };
    case 'three-dose-next-after-15':
      return { birthDate: '2010-01-01' };
    case 'pre-2016-dose3-valid':
    case 'pre-2016-dose3-too-soon':
      return { birthDate: '2000-01-01' };
    default:
      return { birthDate: '2015-01-01' };
  }
}
