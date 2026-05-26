import {
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { ReactNode } from 'react';

import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import { LabEnrichment } from '../enrichment/types';

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
}: {
  enrichment: LabEnrichment;
}) {
  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">
          Enrichment & audit
        </h2>
        <span className="rounded-full bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-gray-200">
          {auditLabels[enrichment.audit.status]}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <InfoTile
          icon={<InformationCircleIcon className="h-4 w-4" />}
          title="Mapped lab"
          value={enrichment.labId || 'No enrichment alias'}
          detail={enrichment.referenceNote || enrichment.referenceAgeBand}
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
        <InfoTile
          icon={<InformationCircleIcon className="h-4 w-4" />}
          title="Audit source"
          value={enrichment.audit.sourceImage || 'No source image'}
          detail={`${enrichment.audit.verifiedBy || 'Not verified'} · ${safeFormatDate(
            enrichment.audit.verifiedAt,
            'PP',
            'No date',
          )}`}
        />
      </div>

      <ul className="mt-3 space-y-1 text-xs text-gray-600">
        {enrichment.audit.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
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
