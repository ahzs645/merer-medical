import { referenceOverlayModes } from '../enrichment/labEnrichment';
import { ReferenceContext, ReferenceOverlayMode } from '../enrichment/types';
import { LabFilterMode, RecordCoverageSummary } from '../types';

const filterLabels: Record<LabFilterMode, string> = {
  attention: 'Attention',
  planner: 'Planner',
  all: 'All',
};

const referenceLabels: Record<ReferenceOverlayMode, string> = {
  canadian: 'Canadian',
  australian: 'Australian',
  uk: 'UK',
  original: 'Original',
};

export function RecordCoveragePanel({
  coverage,
  attentionCount,
  plannerCount,
  visibleCount,
  totalGroups,
  filterMode,
  setFilterMode,
  referenceMode,
  setReferenceMode,
  referenceContext,
}: {
  coverage: RecordCoverageSummary;
  attentionCount: number;
  plannerCount: number;
  visibleCount: number;
  totalGroups: number;
  filterMode: LabFilterMode;
  setFilterMode: (mode: LabFilterMode) => void;
  referenceMode: ReferenceOverlayMode;
  setReferenceMode: (mode: ReferenceOverlayMode) => void;
  referenceContext?: ReferenceContext;
}) {
  return (
    <section className="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-gray-200">
      <div className="border-b border-gray-200 px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Record coverage
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              A compact check of what is represented in this record set. Ranges
              and high/low status update against the selected reference
              standard.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
              <span className="uppercase tracking-wide text-gray-500">
                Reference
              </span>
              <select
                value={referenceMode}
                onChange={(event) =>
                  setReferenceMode(event.target.value as ReferenceOverlayMode)
                }
                className="rounded-md border-gray-300 py-1.5 text-xs font-semibold text-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                {referenceOverlayModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {referenceLabels[mode]}
                  </option>
                ))}
              </select>
            </label>
            <div className="inline-flex w-fit rounded-md shadow-sm ring-1 ring-gray-300">
              {(Object.keys(filterLabels) as LabFilterMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`px-3 py-1.5 text-xs font-semibold first:rounded-l-md last:rounded-r-md ${
                    filterMode === mode
                      ? 'bg-primary-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {filterLabels[mode]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4 xl:grid-cols-6">
        <CoverageMetric
          label="Visible labs"
          value={`${visibleCount}/${totalGroups}`}
        />
        <CoverageMetric label="Lab rows" value={coverage.labRows} />
        <CoverageMetric label="Lab panels" value={coverage.labPanels} />
        <CoverageMetric
          label="Attention labs"
          value={attentionCount}
          tone="warn"
        />
        <CoverageMetric label="Planner labs" value={plannerCount} />
        <CoverageMetric
          label="Patient context"
          value={formatReferenceContext(referenceContext)}
          tone={referenceContext ? 'ok' : 'warn'}
        />
        <CoverageMetric
          label="Medications"
          value={coverage.medicationRecords}
        />
        <CoverageMetric label="Encounters" value={coverage.encounterRecords} />
        <CoverageMetric label="Imaging" value={coverage.imagingRecords} />
        <CoverageMetric label="Reports" value={coverage.diagnosticReports} />
        <CoverageMetric label="Total records" value={coverage.totalRecords} />
      </div>
    </section>
  );
}

function CoverageMetric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'ok' | 'warn';
}) {
  const toneClass =
    tone === 'ok'
      ? 'text-emerald-700'
      : tone === 'warn'
        ? 'text-amber-700'
        : 'text-gray-900';

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className={`mt-1 truncate text-sm font-bold ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function formatReferenceContext(context?: ReferenceContext): string {
  if (!context) return 'Not available';
  const sex = context.sex === 'unknown' ? 'sex unknown' : context.sex;
  return `${context.ageYears}y, ${sex}`;
}
