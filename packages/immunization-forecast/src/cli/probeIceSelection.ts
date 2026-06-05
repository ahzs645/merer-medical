import { selectIceSeries } from '../iceSeriesEvaluator.js';
import { iceDatasetPathsFromRepoRoot } from '../icePaths.js';
import { loadIceDataset } from '../iceYaml.js';

const repoRoot = process.argv[2] ?? process.cwd();
const vaccineGroup = process.argv[3] ?? 'HPV';
const scenario = process.argv[4] ?? 'one-dose-before-15';
const dataset = loadIceDataset(iceDatasetPathsFromRepoRoot(repoRoot));
const selection = selectIceSeries({
  dataset,
  vaccineGroup,
  evaluationDate: '2026-06-01',
  patient: { birthDate: '2015-01-01' },
  immunizations: scenarioImmunizations(scenario),
});

console.log(
  JSON.stringify(
    selection
      ? {
          vaccineGroup: selection.vaccineGroup,
          selectedSeries: selection.selected.series.id,
          selectionReason: selection.selected.selectionReason,
          status: selection.selected.status,
          completedDoses: selection.selected.completedDoses,
          requiredDoses: selection.selected.requiredDoses,
          nextDoseForecast: selection.selected.nextDoseForecast
            ? {
                doseNumber: selection.selected.nextDoseForecast.dose.doseNumber,
                recommendedDate:
                  selection.selected.nextDoseForecast.recommendedDate,
                overdueDate: selection.selected.nextDoseForecast.overdueDate,
              }
            : undefined,
          recommendation: selection.selected.recommendation,
          candidates: selection.candidates.map((candidate) => ({
            series: candidate.series.id,
            status: candidate.status,
            completedDoses: candidate.completedDoses,
            requiredDoses: candidate.requiredDoses,
            invalidDoses: candidate.invalidDoses.length,
            acceptedDoses: candidate.acceptedDoses.length,
            recommendation: candidate.recommendation,
          })),
        }
      : undefined,
    null,
    2,
  ),
);

function scenarioImmunizations(name: string) {
  switch (name) {
    case 'none':
      return [];
    case 'two-valid-before-15':
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
    case 'one-dose-after-15':
      return [
        {
          id: 'example-hpv-dose-after-15',
          vaccineName: 'HPV9',
          vaccineCode: '165',
          date: '2031-01-02',
        },
      ];
    case 'one-dose-before-15':
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
