import { Modal } from '../../../shared/components/Modal';
import { ModalHeader } from '../../../shared/components/ModalHeader';
import { ReferenceContext } from '../enrichment/types';
import { LabFilterMode, RecordCoverageSummary } from '../types';
import { labFilterHints } from '../utils/labFormatters';

/**
 * The record counts, off the page and behind a banner button.
 *
 * They used to be a card sitting between the banner and the first lab result,
 * and it had already been cut twice — the filter moved to the banner, the
 * explanation behind an ⓘ — and was still 286px of a 390px phone before the
 * first result. What survived those cuts is eight numbers you check once and
 * then scroll past on every visit afterwards, which is the definition of
 * something that should be a press away rather than in the way. The one thing
 * on that card you *act* on, the reference standard, did not come with them;
 * it is in the banner (see LabReferenceSelect).
 *
 * A Dialog, not a Menu. Headless UI's `Menu` marks every child `role="menuitem"`
 * and drives them with arrow keys and typeahead — it describes a list of
 * commands, and there is nothing here to activate. A dialog is a named surface
 * that traps focus, closes on Escape or the backdrop, and may be as tall as its
 * contents; and the app already has one, so this wears the same skin as the
 * twenty other modals instead of introducing a second.
 *
 * The "Other record types" disclosure is gone. It was folded away to keep the
 * card short in the page flow, and a modal has the room, so all eight numbers
 * are now one press from the banner rather than two.
 */
export function RecordCoverageModal({
  open,
  setOpen,
  coverage,
  visibleCount,
  totalGroups,
  filterMode,
  referenceContext,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  coverage: RecordCoverageSummary;
  visibleCount: number;
  totalGroups: number;
  filterMode: LabFilterMode;
  referenceContext?: ReferenceContext;
}) {
  return (
    <Modal open={open} setOpen={setOpen}>
      <ModalHeader title="What's in your records" setClose={setOpen} />
      <div className="flex flex-col gap-4 px-4 pb-4">
        {/* The tally is repeated from the banner and then explained: the banner
            has room for the count but not for the sentence saying which filter
            produced it, and a count without that sentence invites the reader to
            think 12 of 51 means the other 39 are missing. */}
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">
            {visibleCount} of {totalGroups} lab tests listed.
          </span>{' '}
          {labFilterHints[filterMode]}
        </p>

        <CoverageGroup label="Lab records">
          <CoverageMetric label="Lab results" value={coverage.labRows} />
          <CoverageMetric label="Collection dates" value={coverage.labPanels} />
          <CoverageMetric
            label="Ranges matched to"
            value={formatReferenceContext(referenceContext)}
            tone={referenceContext ? 'ok' : 'warn'}
          />
        </CoverageGroup>

        {coverage.undatedLabRows > 0 ? (
          <p className="text-sm text-gray-600">
            {coverage.undatedLabRows} lab results arrived without a collection
            date. They are listed last and show their date as Unknown.
          </p>
        ) : null}

        <CoverageGroup label="Other record types">
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
        </CoverageGroup>
      </div>
    </Modal>
  );
}

function CoverageGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </h2>
      {/* Two columns on a phone, as on the old card: five full-width tiles is a
          scroll of its own even inside a modal. */}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {children}
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
