import { referenceOverlayModes } from '../enrichment/labEnrichment';
import { ReferenceContext, ReferenceOverlayMode } from '../enrichment/types';
import { LabFilterMode, RecordCoverageSummary } from '../types';
import { labFilterLabels } from '../utils/labFormatters';

// Each filter is explained in place, so "Attention" and "Key markers" do not
// have to be guessed at from the button label alone.
const filterHints: Record<LabFilterMode, string> = {
  attention:
    'Listing only lab tests with at least one high, low, or borderline result against the selected reference standard.',
  planner:
    'Listing only the key metabolic markers: glucose, A1c, HDL, LDL, triglycerides, and vitamin D.',
  all: 'Listing every lab test found in your records.',
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
  const filterCounts: Record<LabFilterMode, number> = {
    attention: attentionCount,
    planner: plannerCount,
    all: totalGroups,
  };

  return (
    <section className="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-gray-200">
      <div className="border-b border-gray-200 px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Lab coverage
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">
                {visibleCount} of {totalGroups}
              </span>{' '}
              <span>
                lab tests in your records are listed below. The filter and the
                search box decide which ones.
              </span>
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {filterHints[filterMode]}
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
                className="min-h-[44px] flex-1 rounded-md border-gray-300 py-1.5 text-xs font-semibold text-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                {referenceOverlayModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {referenceLabels[mode]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 rounded-md shadow-sm ring-1 ring-gray-300 sm:inline-flex sm:w-fit">
              {(Object.keys(labFilterLabels) as LabFilterMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  aria-pressed={filterMode === mode}
                  className={`min-h-[44px] px-2 py-1.5 text-xs font-semibold first:rounded-l-md last:rounded-r-md sm:px-3 ${
                    filterMode === mode
                      ? 'bg-primary-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {labFilterLabels[mode]} ({filterCounts[mode]})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Two columns on phones: eleven full-width tiles used to push the first
          lab result roughly a thousand pixels down the page. */}
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:p-4">
        <CoverageMetric label="Lab results" value={coverage.labRows} />
        <CoverageMetric label="Collection dates" value={coverage.labPanels} />
        <CoverageMetric
          label="Ranges matched to"
          value={formatReferenceContext(referenceContext)}
          tone={referenceContext ? 'ok' : 'warn'}
        />
      </div>
      {/* Counts for other record types are not about labs, so they stay folded
          away behind a label that says what they are. */}
      <details className="border-t border-gray-200">
        {/* Kept as the default list-item summary so the disclosure triangle
            survives; a flex summary drops the marker in Chrome. */}
        <summary className="min-h-[44px] cursor-pointer px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:px-4">
          Other record types in your records
        </summary>
        <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-5 sm:px-4">
          <CoverageMetric
            label="Medications"
            value={coverage.medicationRecords}
          />
          <CoverageMetric
            label="Encounters"
            value={coverage.encounterRecords}
          />
          <CoverageMetric label="Imaging" value={coverage.imagingRecords} />
          <CoverageMetric label="Reports" value={coverage.diagnosticReports} />
          <CoverageMetric label="Total records" value={coverage.totalRecords} />
        </div>
      </details>
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
