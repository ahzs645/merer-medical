import { InfoTip } from '../../../shared/components/InfoTip';
import { referenceOverlayModes } from '../enrichment/labEnrichment';
import { ReferenceContext, ReferenceOverlayMode } from '../enrichment/types';
import { LabFilterMode, RecordCoverageSummary } from '../types';

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
  visibleCount,
  totalGroups,
  filterMode,
  referenceMode,
  setReferenceMode,
  referenceContext,
}: {
  coverage: RecordCoverageSummary;
  visibleCount: number;
  totalGroups: number;
  filterMode: LabFilterMode;
  referenceMode: ReferenceOverlayMode;
  setReferenceMode: (mode: ReferenceOverlayMode) => void;
  referenceContext?: ReferenceContext;
}) {
  return (
    <section className="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-gray-200">
      {/* This was the tallest thing between the banner and the first lab
          result: a heading, three paragraphs, a select and a three-way
          segmented control, before any lab. The filter moved to the banner
          with every other tab's; what is left is one line saying what you are
          looking at and the one control that changes how it is judged. */}
      {/* `relative` so the ⓘ's bubble hangs off this row rather than off the
          button, which on a phone would put it half off the screen. */}
      <div className="relative flex flex-col gap-3 border-b border-gray-200 px-3 py-2 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
        <p className="flex min-w-0 items-center gap-1 text-sm text-gray-600 sm:flex-1">
          {/* The tally is the part you read; the sentence explaining which
              filter produced it was three lines saying the same thing the
              selected chip in the banner already says. */}
          <span className="font-semibold text-gray-900">
            {visibleCount} of {totalGroups}
          </span>
          <span className="min-w-0 truncate">lab tests listed</span>
          <InfoTip label="Why these lab tests">
            {filterHints[filterMode]}
          </InfoTip>
        </p>
        <label className="flex shrink-0 items-center gap-2 self-start text-xs font-semibold text-gray-700 sm:self-auto">
          <span className="uppercase tracking-wide text-gray-500">
            Reference
          </span>
          <select
            value={referenceMode}
            onChange={(event) =>
              setReferenceMode(event.target.value as ReferenceOverlayMode)
            }
            className="h-11 rounded-md border-gray-300 py-0 text-xs font-semibold text-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            {referenceOverlayModes.map((mode) => (
              <option key={mode} value={mode}>
                {referenceLabels[mode]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {/* Two columns on phones: eleven full-width tiles used to push the first
          lab result roughly a thousand pixels down the page. */}
      {coverage.undatedLabRows > 0 ? (
        <p className="px-3 pt-3 text-sm text-gray-600 sm:px-4">
          {coverage.undatedLabRows} lab results arrived without a collection
          date. They are listed last and show their date as Unknown.
        </p>
      ) : null}
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
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
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
