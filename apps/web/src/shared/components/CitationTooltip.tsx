import { ReactNode } from 'react';

export type CitationTooltipSource = {
  id?: string;
  source?: string;
  fullCitation?: string;
  url?: string;
  page?: string;
  quote?: string;
  evidenceGrade?: string;
  grade?: string;
};

export function CitationTooltip({
  citation,
  children,
}: {
  citation?: CitationTooltipSource;
  children: ReactNode;
}) {
  if (!citation) return <>{children}</>;

  return (
    <span className="group relative inline-flex">
      <span className="cursor-help border-b border-dotted border-primary-700/70 text-inherit">
        {children}
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-80 rounded-md border border-gray-200 bg-white p-3 text-left text-xs font-normal normal-case tracking-normal text-gray-700 shadow-xl group-hover:block group-focus-within:block">
        {citation.source ? (
          <span className="block font-semibold text-gray-900">
            {citation.source}
          </span>
        ) : null}
        {citation.fullCitation ? (
          <span className="mt-1 block">{citation.fullCitation}</span>
        ) : null}
        <span className="mt-2 block text-gray-600">
          Evidence:{' '}
          <span className="font-semibold">
            {formatEvidenceGrade(citation.evidenceGrade, citation.grade)}
          </span>
          {citation.page ? ` · ${citation.page}` : ''}
        </span>
        {citation.quote ? (
          <span className="mt-2 block border-l-2 border-primary-200 pl-2 text-gray-600">
            {citation.quote}
          </span>
        ) : null}
        {citation.url ? (
          <span className="mt-2 block font-semibold text-primary-700">
            Open citation source
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function formatEvidenceGrade(evidenceGrade?: string, grade?: string) {
  if (grade && grade !== 'NA') return grade.replace('-', ' Level ');
  if (evidenceGrade === 'clinical-guideline') return 'clinical guideline';
  if (evidenceGrade === 'source-reported') return 'source reported';
  return 'reference interval';
}
