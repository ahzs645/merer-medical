import { Modal } from '../../../shared/components/Modal';
import { ModalHeader } from '../../../shared/components/ModalHeader';
import { ReferenceContext, ReferenceOverlayMode } from '../enrichment/types';
import { LabReferenceSelect } from './LabReferenceSelect';
import { LabFilterMode, RecordCoverageSummary } from '../types';
import { labFilterHints } from '../utils/labFormatters';

/** Lab settings and coverage stay one tap away from the compact reading header. */
export function RecordCoverageModal({
  open,
  setOpen,
  coverage,
  visibleCount,
  totalGroups,
  filterMode,
  referenceContext,
  reference,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  coverage: RecordCoverageSummary;
  visibleCount: number;
  totalGroups: number;
  filterMode: LabFilterMode;
  referenceContext?: ReferenceContext;
  reference?: {
    mode: ReferenceOverlayMode;
    onChange: (mode: ReferenceOverlayMode) => void;
  };
}) {
  return (
    <Modal open={open} setOpen={setOpen}>
      <ModalHeader
        title={reference ? 'Lab options' : "What's in your records"}
        setClose={setOpen}
      />
      <div className="flex flex-col gap-4 px-4 pb-4">
        {reference && (
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <LabReferenceSelect
              mode={reference.mode}
              setMode={reference.onChange}
            />
            <p className="mt-2 text-sm text-gray-600">
              Reference ranges affect result flags and the Attention filter.
              Your selected reference is always shown above the lab list.
            </p>
          </section>
        )}
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
