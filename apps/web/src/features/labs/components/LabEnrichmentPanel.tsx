import {
  BeakerIcon,
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
  DocumentMagnifyingGlassIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { ReactNode } from 'react';

import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import {
  EvidenceGrade,
  LabEnrichment,
  ReferenceStandardId,
} from '../enrichment/types';

const standardOptions: Array<{ id: ReferenceStandardId; label: string }> = [
  { id: 'canadian', label: 'Canadian' },
  { id: 'australian', label: 'Australian' },
  { id: 'uk', label: 'UK' },
];

const flagStyles = {
  normal: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  low: 'bg-amber-50 text-amber-700 ring-amber-200',
  high: 'bg-red-50 text-red-700 ring-red-200',
  borderline: 'bg-amber-50 text-amber-700 ring-amber-200',
  identity: 'bg-gray-50 text-gray-700 ring-gray-200',
};

const auditLabels = {
  'source-verified': 'Source verified',
  'key-fields-verified': 'Key fields verified',
  partial: 'Partial audit',
  'needs-review': 'Needs review',
};

export function LabEnrichmentPanel({
  enrichment,
  standardId,
  setStandardId,
}: {
  enrichment: LabEnrichment;
  standardId: ReferenceStandardId;
  setStandardId: (standardId: ReferenceStandardId) => void;
}) {
  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BeakerIcon className="h-5 w-5 text-primary-700" />
            <h2 className="text-base font-semibold text-gray-900">
              Enrichment & audit
            </h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            Source values stay intact while this layer computes normalized
            units, national reference context, citation provenance, and
            verification status.
          </p>
        </div>
        <label className="flex w-full max-w-xs flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Reference standard
          <select
            value={standardId}
            onChange={(event) =>
              setStandardId(event.target.value as ReferenceStandardId)
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            {standardOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <InfoTile
          icon={<InformationCircleIcon className="h-4 w-4" />}
          title={`${enrichment.standardLabel} reference`}
          value={enrichment.referenceRange || 'No mapped national range'}
          detail={
            enrichment.referenceAgeBand
              ? `Band: ${enrichment.referenceAgeBand}`
              : enrichment.labId
                ? `Mapped as ${enrichment.labId}`
                : 'No lab alias matched this observation yet'
          }
        />
        <InfoTile
          icon={<ClipboardDocumentCheckIcon className="h-4 w-4" />}
          title="Source range"
          value={enrichment.originalReferenceRange || 'Not provided'}
          detail={flagComparisonLabel(enrichment)}
        />
        <InfoTile
          icon={<CheckBadgeIcon className="h-4 w-4" />}
          title="Planner usage"
          value={
            enrichment.usedByPlanner ? 'Used by planner' : 'Not used by planner'
          }
          detail={
            enrichment.normalizedValue?.note ||
            normalizedValueLabel(enrichment) ||
            'No unit conversion needed'
          }
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <DocumentMagnifyingGlassIcon className="h-4 w-4 text-primary-700" />
            Reference citation
          </div>
          {enrichment.referenceCitation ? (
            <div className="mt-2 space-y-1 text-xs text-gray-700">
              <p className="font-semibold text-gray-900">
                {enrichment.referenceCitation.source}
              </p>
              <p>{enrichment.referenceCitation.fullCitation}</p>
              <p>
                Evidence:{' '}
                <span className="font-semibold">
                  {formatEvidenceGrade(
                    enrichment.referenceCitation.evidenceGrade,
                  )}
                </span>
                {enrichment.referenceCitation.page
                  ? ` · ${enrichment.referenceCitation.page}`
                  : ''}
              </p>
              {enrichment.referenceCitation.url ? (
                <a
                  href={enrichment.referenceCitation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex font-semibold text-primary-700 hover:text-primary-900"
                >
                  Open citation
                </a>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-600">
              No citation is attached until this lab is mapped to a supported
              reference.
            </p>
          )}
          {enrichment.referenceNote ? (
            <p className="mt-2 text-xs text-gray-600">
              {enrichment.referenceNote}
            </p>
          ) : null}
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-gray-900">
              Verification audit
            </div>
            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-gray-200">
              {auditLabels[enrichment.audit.status]}
            </span>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-gray-700">
            <dt className="font-semibold text-gray-500">Verified by</dt>
            <dd>{enrichment.audit.verifiedBy || 'Not recorded'}</dd>
            <dt className="font-semibold text-gray-500">Verified at</dt>
            <dd>
              {safeFormatDate(
                enrichment.audit.verifiedAt,
                'PP',
                'Not recorded',
              )}
            </dd>
            <dt className="font-semibold text-gray-500">Source</dt>
            <dd>
              {enrichment.audit.sourceImage ||
                'No source image/report recorded'}
            </dd>
          </dl>
          <ul className="mt-2 space-y-1 text-xs text-gray-600">
            {enrichment.audit.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function InfoTile({
  icon,
  title,
  value,
  detail,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  detail?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-gray-200 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {icon}
        {title}
      </div>
      <div className="mt-2 break-words text-sm font-semibold text-gray-900">
        {value}
      </div>
      {detail ? (
        <div className="mt-1 text-xs text-gray-600">{detail}</div>
      ) : null}
    </div>
  );
}

function flagComparisonLabel(enrichment: LabEnrichment) {
  const originalFlag = enrichment.originalFlag || 'normal',
    recomputedFlag = enrichment.recomputedFlag || originalFlag;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <FlagPill label={`Source ${originalFlag}`} flag={originalFlag} />
      <FlagPill
        label={`${enrichment.standardLabel} ${recomputedFlag}`}
        flag={recomputedFlag}
      />
    </span>
  );
}

function FlagPill({
  label,
  flag,
}: {
  label: string;
  flag: keyof typeof flagStyles;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${flagStyles[flag]}`}
    >
      {label}
    </span>
  );
}

function normalizedValueLabel(enrichment: LabEnrichment) {
  const normalized = enrichment.normalizedValue;
  if (!normalized) return undefined;

  return `${normalized.value}${normalized.unit ? ` ${normalized.unit}` : ''}`;
}

function formatEvidenceGrade(grade: EvidenceGrade) {
  if (grade === 'clinical-guideline') return 'clinical guideline';
  if (grade === 'source-reported') return 'source reported';
  return 'reference interval';
}
