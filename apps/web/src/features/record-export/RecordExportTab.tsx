import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { firstText } from '../../shared/utils/fhirText';
import { isAllergyNegationRecord } from '../../shared/utils/allergyNegation';
import { OtherDownloadDoors } from '../../shared/components/OtherDownloadDoors';
import { resourceTypeLabel } from '../../shared/utils/resourceTypeLabels';
import { referencedAttachmentIds } from '../../shared/utils/standaloneAttachments';
import { useRecordChangeTick } from '../../shared/utils/recordChangeSignal';
import { recordAuditEvent } from '../audit/auditLog';

/**
 * Rows that exist in `clinical_documents` but are not records in their own
 * right: a `documentreference_attachment` is the file hanging off a
 * DocumentReference we already count, and `provenance` is an audit trail.
 * The rest of the app counts records with exactly this exclusion (see the Labs
 * record-coverage summary), so the export headline has to use it too — without
 * it this screen claimed 355 records while every other screen said 352.
 */
const NON_RECORD_RESOURCE_TYPES = new Set([
  'documentreference_attachment',
  'provenance',
]);

interface Counts {
  /** Records, on the same definition the rest of the app uses. */
  total: number;
  byType: Record<string, number>;
  /** Attachment rows: shipped inside the bundle, never counted as records. */
  attachments: number;
  /** Everything in the database, i.e. how many entries the bundle carries. */
  entries: number;
}

function useAllRecords() {
  const db = useRxDb();
  const user = useUser();
  // Refetch when records land — a portal sync or an .emrpkg import
  // writes straight to the collection, and this page reads it once.
  const recordChangeTick = useRecordChangeTick();
  const [docs, setDocs] = useState<ClinicalDocument[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus('loading');
      const found = await db.clinical_documents
        .find({ selector: { user_id: user.id } })
        .exec();
      if (!mounted) return;
      setDocs(found.map((d) => d.toMutableJSON() as ClinicalDocument));
      setStatus('success');
    }
    load();
    return () => {
      mounted = false;
    };
  }, [db, user.id, recordChangeTick]);

  return { docs, status };
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildBundle(docs: ClinicalDocument[], patientName: string) {
  return {
    resourceType: 'Bundle',
    type: 'collection',
    meta: {
      tag: [
        {
          system: 'https://meremedical.co',
          code: 'mere-export',
          display: `Mere Medical export for ${patientName}`,
        },
      ],
    },
    entry: docs.map((doc) => ({
      fullUrl: doc.metadata?.id,
      resource: getFhirResource(doc),
    })),
  };
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sections the printable summary is built from, in order. Shared with the UI
 * so the "what's in this file" preview cannot drift from the file itself.
 */
const SUMMARY_SECTIONS: { type: string; title: string }[] = [
  { type: 'condition', title: 'Conditions' },
  { type: 'medicationstatement', title: 'Medications' },
  { type: 'allergyintolerance', title: 'Allergies' },
  // Split out for the same reason the chips are: a printed summary handed to a
  // clinic listing "No Known Allergies" under Allergies reads as an allergy.
  { type: 'allergyintolerance_negation', title: 'Allergy status' },
  { type: 'immunization', title: 'Immunizations' },
  { type: 'procedure', title: 'Procedures' },
  { type: 'observation', title: 'Results & vitals' },
];

/**
 * Which bucket a record counts and prints under. Only allergies split: the
 * bucket is the stored `resource_type` for everything else.
 */
function summaryBucket(doc: ClinicalDocument): string {
  const type = doc.data_record.resource_type;
  if (type !== 'allergyintolerance') return type;
  return isAllergyNegationRecord(
    getFhirResource<Record<string, unknown>>(doc),
    doc.metadata?.display_name,
  )
    ? 'allergyintolerance_negation'
    : type;
}

function buildHtmlSummary(
  docs: ClinicalDocument[],
  patientName: string,
): string {
  const today = safeFormatDate('2026-06-09', 'PP', '');
  const sections = SUMMARY_SECTIONS.map(({ type, title }) => {
    const items = docs
      .filter((d) => summaryBucket(d) === type)
      .map((d) => {
        const r = getFhirResource<Record<string, unknown>>(d);
        const name =
          d.metadata?.display_name ||
          firstText(r['code']) ||
          firstText(r['medicationCodeableConcept']) ||
          firstText(r['vaccineCode']) ||
          'Record';
        const date = d.metadata?.date
          ? safeFormatDate(d.metadata.date, 'PP', '')
          : '';
        return `<tr><td>${esc(name)}</td><td>${esc(date)}</td></tr>`;
      });
    if (items.length === 0) return '';
    return `<h2>${esc(title)} (${items.length})</h2><table><thead><tr><th>Name</th><th>Date</th></tr></thead><tbody>${items.join(
      '',
    )}</tbody></table>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Health Summary — ${esc(
    patientName,
  )}</title><style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:800px;margin:24px auto;padding:0 16px;}
    h1{color:#09384E;margin-bottom:0;} .sub{color:#666;margin-top:4px;}
    h2{color:#09384E;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-top:28px;font-size:16px;}
    table{width:100%;border-collapse:collapse;font-size:14px;} th{text-align:left;color:#666;font-weight:600;}
    td,th{padding:6px 8px;border-bottom:1px solid #eee;} .footer{margin-top:32px;color:#999;font-size:12px;}
  </style></head><body>
    <h1>Health Summary</h1>
    <p class="sub">${esc(patientName)} · Generated by Mere Medical on ${esc(today)}</p>
    ${sections || '<p>No records found.</p>'}
    <p class="footer">This document is a patient-generated summary and may be incomplete. Verify with your care team.</p>
  </body></html>`;
}

export function RecordExportTab() {
  const user = useUser();
  const db = useRxDb();
  const { docs, status } = useAllRecords();
  const [lastDownload, setLastDownload] = useState<string>();

  /**
   * Sharing and Visit prep have always recorded the packages they hand out;
   * this page, which hands out the whole record set, recorded nothing — so an
   * audit log that promised exports listed only two of the three doors.
   */
  function logExport(filename: string, kind: string) {
    void recordAuditEvent(db, {
      userId: user?.id,
      action: 'record.export',
      actor: 'local-user',
      targetType: kind,
      source: 'Export records',
      summary: `Exported ${kind.toLowerCase()} as ${filename}`,
    });
  }

  const counts: Counts = useMemo(() => {
    // Attachments a DocumentReference wraps travel inside the bundle and are
    // not records; a file uploaded here has no wrapper and is one, which is
    // what the Documents page lists. Counting all of them or none of them is
    // what made this screen and the nav disagree.
    const wrapped = referencedAttachmentIds(
      docs
        .filter((d) => d.data_record.resource_type === 'documentreference')
        .map((d) => getFhirResource<Record<string, unknown>>(d)),
    );
    return docs.reduce(
      (acc, doc) => {
        acc.entries += 1;
        const type = doc.data_record.resource_type;
        const isWrappedAttachment =
          type === 'documentreference_attachment' &&
          !!doc.metadata?.id &&
          wrapped.has(doc.metadata.id);
        if (NON_RECORD_RESOURCE_TYPES.has(type) && !isWrappedAttachment) {
          if (type === 'documentreference_attachment') {
            // Standalone upload: a document in its own right.
            acc.total += 1;
            acc.byType['documentreference'] =
              (acc.byType['documentreference'] || 0) + 1;
            return acc;
          }
          return acc;
        }
        if (isWrappedAttachment) {
          acc.attachments += 1;
          return acc;
        }
        acc.total += 1;
        // "No known allergy" / "not asked" rows are AllergyIntolerance
        // resources that record the absence of an allergen. They still
        // export, so they stay in the total and the chips still sum to it —
        // they just count under their own name instead of inflating
        // "Allergies" past what every other screen reports.
        const bucket = summaryBucket(doc);
        acc.byType[bucket] = (acc.byType[bucket] || 0) + 1;
        return acc;
      },
      { total: 0, byType: {}, attachments: 0, entries: 0 } as Counts,
    );
  }, [docs]);

  // Several resource types share one label (medicationstatement and
  // medicationrequest both read "Medications"), so fold them into a single
  // chip — otherwise the breakdown repeats itself and reads like two figures.
  const chips = useMemo(() => {
    const grouped = new Map<string, { type: string; count: number }>();
    Object.entries(counts.byType).forEach(([type, count]) => {
      const key = resourceTypeLabel(type);
      const existing = grouped.get(key);
      grouped.set(key, {
        type: existing?.type ?? type,
        count: (existing?.count ?? 0) + count,
      });
    });
    return [...grouped.values()]
      .map(({ type, count }) => ({
        // "Results" is the name of a page that counts 222 where this chip
        // counts 233, because the page leaves out vitals and other
        // observations and this chip does not. The paragraph below explains
        // that, but a chip carrying a page's name and a different number is
        // read long before a paragraph is. The printed summary below already
        // calls the same bucket "Results & vitals"; so does this now.
        label:
          type === 'observation'
            ? 'Results & vitals'
            : resourceTypeLabel(type, count),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [counts.byType]);

  const summaryPreview = useMemo(
    () =>
      SUMMARY_SECTIONS.map(({ type, title }) => ({
        title,
        count: counts.byType[type] || 0,
      })).filter((section) => section.count > 0),
    [counts.byType],
  );

  const patientName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || 'patient';
  const slug = patientName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <AppPage banner={<GenericBanner text="Export records" />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <div className="rounded-md bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              Download your complete record
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {status === 'loading'
                ? 'Gathering your records…'
                : `${counts.total} records aggregated across all your connected sources.`}
            </p>

            {status === 'success' && counts.total > 0 && (
              <>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {chips.map(({ label, count }) => (
                    <span
                      key={label}
                      className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {label} · {count}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Every record stored on this device, counted once, so the chips
                  add up to the total above and each one matches the count its
                  own screen shows. Screens holding one slice of your library
                  report smaller figures — the Results page counts lab, imaging
                  and report results and leaves out the vitals and other
                  observations counted here.{' '}
                  {counts.attachments > 0 &&
                    `${counts.attachments} files attached to documents travel inside the FHIR Bundle but are not counted as records of their own.`}
                </p>
                <OtherDownloadDoors from="export" />
              </>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ExportButton
                icon={DocumentTextIcon}
                title="Health summary"
                subtitle="Printable HTML document"
                disabled={status !== 'success' || counts.total === 0}
                onClick={() => {
                  const filename = `mere-health-summary-${slug}.html`;
                  download(
                    filename,
                    buildHtmlSummary(docs, patientName),
                    'text/html',
                  );
                  setLastDownload(filename);
                  logExport(filename, 'Health summary');
                }}
              />
              <ExportButton
                icon={CodeBracketIcon}
                title="FHIR Bundle"
                subtitle="Standards-based JSON (R4)"
                disabled={status !== 'success' || counts.total === 0}
                onClick={() => {
                  const filename = `mere-fhir-bundle-${slug}.json`;
                  download(
                    filename,
                    JSON.stringify(buildBundle(docs, patientName), null, 2),
                    'application/fhir+json',
                  );
                  setLastDownload(filename);
                  logExport(filename, 'FHIR Bundle');
                }}
              />
            </div>

            {/* Downloads leave no trace in the browser UI on some platforms,
                so confirm what was written rather than leaving a dead click. */}
            {lastDownload && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-600">
                <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-600" />
                <span className="min-w-0 break-all">
                  Saved to your downloads: {lastDownload}
                </span>
              </p>
            )}
          </div>

          {status === 'success' && counts.total > 0 && (
            <div className="rounded-md bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                What each file contains
              </h2>
              <dl className="mt-3 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-semibold text-gray-900">
                    Health summary
                  </dt>
                  <dd className="mt-1 text-sm text-gray-600">
                    A printable page you can hand to a new clinic or a family
                    member. One section per area, newest first:
                  </dd>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {summaryPreview.map((section) => (
                      <span
                        key={section.title}
                        className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {section.title} · {section.count}
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-gray-900">
                    FHIR Bundle
                  </dt>
                  <dd className="mt-1 text-sm text-gray-600">
                    {counts.attachments > 0
                      ? `Everything, unabridged: ${counts.entries} entries as an R4 collection Bundle — your ${counts.total} records plus ${counts.attachments} attached files.`
                      : `Everything, unabridged: ${counts.entries} entries as an R4 collection Bundle.`}{' '}
                    Machine-readable, for importing into another health app or
                    keeping as a backup.
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <p className="text-xs text-gray-600">
            Exports are generated locally on your device — nothing is uploaded.
            The FHIR Bundle can be imported into other health apps; the health
            summary is a portable, human-readable copy.
          </p>
        </div>
      </div>
    </AppPage>
  );
}

function ExportButton({
  icon: Icon,
  title,
  subtitle,
  onClick,
  disabled,
}: {
  icon: typeof DocumentTextIcon;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-md border border-gray-200 bg-white p-3 text-start shadow-sm transition hover:border-primary-300 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900">
          {title}
        </span>
        <span className="block text-xs text-gray-500">{subtitle}</span>
      </span>
      <ArrowDownTrayIcon className="ms-auto h-5 w-5 shrink-0 text-gray-400" />
    </button>
  );
}
